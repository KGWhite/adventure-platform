import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service.js';
import { EventsService } from '../events/events.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AcceptQuestDto,
  ClaimRewardResult,
  GuildScanResult,
  PlayerQuestData,
  QuestData,
} from './quests.types.js';

const DEMO_QUEST: QuestData = {
  id: 'quest-defeat-black-knight',
  name: '討伐黑騎士 (Defeat the Black Knight)',
  title: '討伐黑騎士 (Defeat the Black Knight)',
  description: '前往 Boss 之間，擊敗作惡多端的黑騎士，證明冒險者的實力。',
  objectiveType: 'defeat_boss',
  targetId: 'boss-01',
  targetCount: 1,
  rewardGold: 200,
  rewardMerit: 20,
  enabled: true,
};

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);
  private readonly inMemoryQuests = new Map<string, QuestData>([
    [DEMO_QUEST.id, { ...DEMO_QUEST }],
  ]);
  private readonly inMemoryPlayerQuests = new Map<string, PlayerQuestData>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialsService: CredentialsService,
    private readonly eventsService: EventsService,
  ) {}

  async findAll(): Promise<QuestData[]> {
    try {
      const dbQuests = await (this.prisma as any).quest?.findMany?.({
        where: { enabled: true },
        orderBy: { createdAt: 'asc' },
      });
      if (dbQuests && dbQuests.length > 0) {
        return dbQuests.map((q: any) => ({
          id: q.id,
          name: q.title,
          title: q.title,
          description: q.description,
          objectiveType: (q.objectiveType as 'defeat_boss') || 'defeat_boss',
          targetId: q.targetId || 'boss-01',
          targetCount: q.targetCount ?? 1,
          rewardGold: q.rewardGold ?? 200,
          rewardMerit: q.rewardMerit ?? q.meritReward ?? 20,
          enabled: q.enabled,
          requiredRankId: q.requiredRankId,
        }));
      }
    } catch {
      // Fallback
    }

    return Array.from(this.inMemoryQuests.values()).filter((q) => q.enabled);
  }

  async findById(id: string): Promise<QuestData> {
    try {
      const dbQuest = await (this.prisma as any).quest?.findUnique?.({
        where: { id },
      });
      if (dbQuest) {
        return {
          id: dbQuest.id,
          name: dbQuest.title,
          title: dbQuest.title,
          description: dbQuest.description,
          objectiveType: (dbQuest.objectiveType as 'defeat_boss') || 'defeat_boss',
          targetId: dbQuest.targetId || 'boss-01',
          targetCount: dbQuest.targetCount ?? 1,
          rewardGold: dbQuest.rewardGold ?? 200,
          rewardMerit: dbQuest.rewardMerit ?? dbQuest.meritReward ?? 20,
          enabled: dbQuest.enabled,
          requiredRankId: dbQuest.requiredRankId,
        };
      }
    } catch {
      // Fallback
    }

    const quest = this.inMemoryQuests.get(id);
    if (!quest) {
      if (id === 'quest-defeat-black-knight') {
        return { ...DEMO_QUEST };
      }
      throw new NotFoundException(`Quest with ID "${id}" not found`);
    }
    return { ...quest };
  }

  async findActivePlayerQuest(playerId: string): Promise<PlayerQuestData | null> {
    // 1. Try DB
    try {
      const dbPq = await (this.prisma as any).playerQuest?.findFirst?.({
        where: {
          playerId,
          status: { in: ['ACCEPTED', 'COMPLETED'] },
        },
        include: {
          quest: true,
        },
      });

      if (dbPq) {
        const quest = await this.findById(dbPq.questId);
        return {
          id: dbPq.id,
          playerId: dbPq.playerId,
          questId: dbPq.questId,
          quest,
          progress: dbPq.progress,
          targetCount: dbPq.targetCount,
          status: dbPq.status.toLowerCase() as 'accepted' | 'completed',
          acceptedAt: dbPq.acceptedAt.toISOString(),
          completedAt: dbPq.completedAt?.toISOString() ?? null,
          claimedAt: dbPq.claimedAt?.toISOString() ?? null,
        };
      }
    } catch {
      // Fallback
    }

    // 2. In-memory fallback
    for (const pq of this.inMemoryPlayerQuests.values()) {
      if (pq.playerId === playerId && (pq.status === 'accepted' || pq.status === 'completed')) {
        return { ...pq };
      }
    }

    return null;
  }

  async acceptQuest(dto: AcceptQuestDto): Promise<PlayerQuestData> {
    // 1. Resolve player
    let playerId = dto.playerId;
    let playerName = 'Adventurer';

    if (dto.credentialValue) {
      const resolved = await this.credentialsService.resolvePlayerByCredential(
        dto.credentialValue,
      );
      playerId = resolved.id;
      playerName = resolved.name;
    }

    if (!playerId) {
      throw new BadRequestException('Either credentialValue or playerId must be provided');
    }

    // 2. Validate quest
    const quest = await this.findById(dto.questId);
    if (!quest.enabled) {
      throw new BadRequestException(`Quest "${dto.questId}" is not enabled`);
    }

    // 3. Check existing active quest (Scope limit: only 1 active quest at a time)
    const existingActive = await this.findActivePlayerQuest(playerId);
    if (existingActive) {
      throw new BadRequestException(
        `Adventurer already has an active quest "${existingActive.quest?.title || existingActive.questId}" (Status: ${existingActive.status})`,
      );
    }

    // 4. Create PlayerQuest instance
    const playerQuestId = `pq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newPq: PlayerQuestData = {
      id: playerQuestId,
      playerId,
      playerName,
      questId: quest.id,
      quest,
      progress: 0,
      targetCount: quest.targetCount,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      completedAt: null,
      claimedAt: null,
    };

    this.inMemoryPlayerQuests.set(playerQuestId, newPq);

    // Persist to DB if available
    try {
      await (this.prisma as any).playerQuest?.create?.({
        data: {
          id: playerQuestId,
          playerId,
          questId: quest.id,
          progress: 0,
          targetCount: quest.targetCount,
          status: 'ACCEPTED',
          acceptedAt: new Date(newPq.acceptedAt),
        },
      });
    } catch {
      // Fallback
    }

    // 5. Emit quest.accepted event
    this.eventsService.emitQuestAccepted('guild-01', {
      playerQuestId,
      questId: quest.id,
      playerId,
      playerName,
      questTitle: quest.title,
      targetCount: quest.targetCount,
    });

    this.logger.log(`Quest "${quest.title}" accepted by player ${playerId} (${playerName})`);
    return { ...newPq };
  }

  async onBossDefeated(playerId: string, bossId: string): Promise<PlayerQuestData | null> {
    // 1. Find active quest
    const activeQuest = await this.findActivePlayerQuest(playerId);
    if (!activeQuest || activeQuest.status !== 'accepted') {
      return null;
    }

    const quest = activeQuest.quest || (await this.findById(activeQuest.questId));
    if (quest.objectiveType !== 'defeat_boss') {
      return null;
    }

    // 2. Validate targetId matches bossId
    // Handles canonical aliases: 'boss-01' <-> 'black-knight'
    const isTargetMatch =
      quest.targetId === bossId ||
      (quest.targetId === 'boss-01' && bossId === 'black-knight') ||
      (quest.targetId === 'black-knight' && bossId === 'boss-01');

    if (!isTargetMatch) {
      this.logger.log(
        `Defeated boss ${bossId} does not match quest target ${quest.targetId} for player ${playerId}`,
      );
      return null;
    }

    // 3. Advance progress
    activeQuest.progress += 1;

    if (activeQuest.progress >= activeQuest.targetCount) {
      activeQuest.status = 'completed';
      activeQuest.completedAt = new Date().toISOString();

      // Update in-memory
      this.inMemoryPlayerQuests.set(activeQuest.id, { ...activeQuest });

      // Update DB
      try {
        await (this.prisma as any).playerQuest?.update?.({
          where: { id: activeQuest.id },
          data: {
            progress: activeQuest.progress,
            status: 'COMPLETED',
            completedAt: new Date(activeQuest.completedAt),
          },
        });
      } catch {
        // Fallback
      }

      // Emit quest.completed event
      this.eventsService.emitQuestCompleted('guild-01', {
        playerQuestId: activeQuest.id,
        questId: activeQuest.questId,
        playerId,
        progress: activeQuest.progress,
        targetCount: activeQuest.targetCount,
        bossId,
      });

      this.logger.log(`Quest "${quest.title}" completed by player ${playerId}!`);
    } else {
      // Update in-memory
      this.inMemoryPlayerQuests.set(activeQuest.id, { ...activeQuest });

      // Update DB
      try {
        await (this.prisma as any).playerQuest?.update?.({
          where: { id: activeQuest.id },
          data: {
            progress: activeQuest.progress,
          },
        });
      } catch {
        // Fallback
      }

      // Emit quest.progress_updated event
      this.eventsService.emitQuestProgressUpdated('guild-01', {
        playerQuestId: activeQuest.id,
        questId: activeQuest.questId,
        playerId,
        progress: activeQuest.progress,
        targetCount: activeQuest.targetCount,
      });
    }

    return { ...activeQuest };
  }

  async claimReward(playerQuestId: string): Promise<ClaimRewardResult> {
    // 1. Fetch player quest
    let playerQuest = this.inMemoryPlayerQuests.get(playerQuestId);

    if (!playerQuest) {
      try {
        const dbPq = await (this.prisma as any).playerQuest?.findUnique?.({
          where: { id: playerQuestId },
          include: { quest: true },
        });
        if (dbPq) {
          const quest = await this.findById(dbPq.questId);
          playerQuest = {
            id: dbPq.id,
            playerId: dbPq.playerId,
            questId: dbPq.questId,
            quest,
            progress: dbPq.progress,
            targetCount: dbPq.targetCount,
            status: dbPq.status.toLowerCase() as 'accepted' | 'completed' | 'claimed',
            acceptedAt: dbPq.acceptedAt.toISOString(),
            completedAt: dbPq.completedAt?.toISOString() ?? null,
            claimedAt: dbPq.claimedAt?.toISOString() ?? null,
          };
          this.inMemoryPlayerQuests.set(playerQuestId, playerQuest);
        }
      } catch {
        // Fallback
      }
    }

    if (!playerQuest) {
      throw new NotFoundException(`Player quest "${playerQuestId}" not found`);
    }

    // 2. Validate status
    if (playerQuest.status === 'accepted') {
      throw new BadRequestException('Quest objective has not been achieved yet');
    }

    if (playerQuest.status === 'claimed') {
      throw new BadRequestException('Quest reward has already been claimed');
    }

    if (playerQuest.status !== 'completed') {
      throw new BadRequestException(
        `Cannot claim reward for quest in "${playerQuest.status}" status`,
      );
    }

    // 3. Fetch quest definition
    const quest = playerQuest.quest || (await this.findById(playerQuest.questId));
    const rewardGold = quest.rewardGold;
    const rewardMerit = quest.rewardMerit;

    // 4. Update status to claimed
    playerQuest.status = 'claimed';
    playerQuest.claimedAt = new Date().toISOString();
    this.inMemoryPlayerQuests.set(playerQuestId, { ...playerQuest });

    // 5. Update player rewards (in-memory + DB)
    this.credentialsService.updateInMemoryPlayerRewards(
      playerQuest.playerId,
      rewardGold,
      rewardMerit,
    );

    try {
      await (this.prisma as any).$transaction(async (tx: any) => {
        // Update PlayerQuest
        await (tx as any).playerQuest?.update?.({
          where: { id: playerQuestId },
          data: {
            status: 'CLAIMED',
            claimedAt: new Date(playerQuest!.claimedAt!),
          },
        });

        // Update AdventurerProfile
        await (tx as any).adventurerProfile?.update?.({
          where: { id: playerQuest!.playerId },
          data: {
            gold: { increment: rewardGold },
            merit: { increment: rewardMerit },
          },
        });

        // Record MeritLedger entry (QUEST_REWARD)
        await (tx as any).meritLedger?.create?.({
          data: {
            adventurerId: playerQuest!.playerId,
            amount: rewardMerit,
            reason: `公會任務達成獎勵：${quest.title}`,
            sourceType: 'QUEST_REWARD',
            sourceId: playerQuestId,
          },
        });
      });
    } catch {
      // Fallback
    }

    // 6. Emit quest.reward_claimed event
    this.eventsService.emitQuestRewardClaimed('guild-01', {
      playerQuestId,
      questId: quest.id,
      playerId: playerQuest.playerId,
      rewardGold,
      rewardMerit,
    });

    this.logger.log(
      `Quest reward claimed for ${playerQuest.id}: +${rewardGold} Gold, +${rewardMerit} Merit`,
    );

    // 7. Get latest player state
    let playerState = {
      id: playerQuest.playerId,
      name: playerQuest.playerName || 'Adventurer',
      gold: rewardGold,
      merit: rewardMerit,
    };

    try {
      const adv = await (this.prisma as any).adventurerProfile?.findUnique?.({
        where: { id: playerQuest.playerId },
      });
      if (adv) {
        playerState = {
          id: adv.id,
          name: adv.displayName,
          gold: adv.gold,
          merit: adv.merit,
        };
      }
    } catch {
      // Fallback
    }

    return {
      success: true,
      playerQuest: { ...playerQuest },
      reward: {
        gold: rewardGold,
        merit: rewardMerit,
      },
      player: playerState,
    };
  }

  async scanGuild(credentialValue: string, displayId = 'guild-01'): Promise<GuildScanResult> {
    // 1. Resolve player identity
    const player = await this.credentialsService.resolvePlayerByCredential(
      credentialValue,
    );

    // 2. Find active quest
    const activeQuest = await this.findActivePlayerQuest(player.id);

    // 3. Find available quests
    const availableQuests = await this.findAll();

    // 4. Emit player.scanned to Guild display
    this.eventsService.emitPlayerScanned(displayId, {
      player: {
        id: player.id,
        name: player.name,
        level: player.level,
        hp: player.hp,
        maxHp: player.maxHp,
        gold: player.gold,
        merit: player.merit,
        credentialValue: player.credentialValue,
      },
    });

    return {
      player: {
        id: player.id,
        name: player.name,
        level: player.level,
        hp: player.hp,
        maxHp: player.maxHp,
        gold: player.gold,
        merit: player.merit,
        rank: 'Adventurer (Rank F)',
        credentialValue: player.credentialValue,
      },
      activeQuest,
      availableQuests,
    };
  }
}
