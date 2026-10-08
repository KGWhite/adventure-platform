import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { EventsModule } from '../events/events.module.js';
import { EventsService } from '../events/events.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QuestsService } from './quests.service.js';

describe('QuestsService (Guild + Quest Vertical Slice)', () => {
  let questsService: QuestsService;
  let eventsService: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, EventsModule, CredentialsModule],
      providers: [
        QuestsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn().mockImplementation(async (cb: any) => cb({})),
            quest: {
              findMany: vi.fn().mockResolvedValue([]),
              findUnique: vi.fn().mockResolvedValue(null),
            },
            playerQuest: {
              findFirst: vi.fn().mockResolvedValue(null),
              findUnique: vi.fn().mockResolvedValue(null),
              create: vi.fn(),
              update: vi.fn(),
            },
            adventurerProfile: {
              findUnique: vi.fn().mockResolvedValue(null),
              update: vi.fn(),
            },
            meritLedger: {
              create: vi.fn(),
            },
            credential: {
              findUnique: vi.fn().mockResolvedValue(null),
            },
          },
        },
      ],
    }).compile();

    questsService = module.get<QuestsService>(QuestsService);
    eventsService = module.get<EventsService>(EventsService);
  });

  describe('Test 1: Guild Scan & Quest Listing', () => {
    it('should list available quests with Black Knight defeat objective', async () => {
      const quests = await questsService.findAll();
      expect(quests.length).toBeGreaterThan(0);
      const blackKnightQuest = quests.find((q) => q.targetId === 'boss-01');
      expect(blackKnightQuest).toBeDefined();
      expect(blackKnightQuest?.objectiveType).toBe('defeat_boss');
      expect(blackKnightQuest?.rewardGold).toBe(200);
      expect(blackKnightQuest?.rewardMerit).toBe(20);
    });

    it('should scan adventurer credential and return status with no active quest initially', async () => {
      const emitSpy = vi.spyOn(eventsService, 'emitPlayerScanned');
      const result = await questsService.scanGuild('cred-demo-001', 'guild-01');

      expect(result.player.name).toBe('Aria');
      expect(result.player.gold).toBe(50);
      expect(result.player.merit).toBe(20);
      expect(result.activeQuest).toBeNull();
      expect(result.availableQuests.length).toBeGreaterThan(0);
      expect(emitSpy).toHaveBeenCalledWith('guild-01', expect.objectContaining({
        player: expect.objectContaining({ name: 'Aria' }),
      }));
    });
  });

  describe('Test 2: Accept Quest', () => {
    it('should accept Defeat Black Knight quest for player and emit quest.accepted', async () => {
      const emitSpy = vi.spyOn(eventsService, 'emitQuestAccepted');
      const pq = await questsService.acceptQuest({
        credentialValue: 'cred-demo-001',
        questId: 'quest-defeat-black-knight',
      });

      expect(pq.status).toBe('accepted');
      expect(pq.progress).toBe(0);
      expect(pq.targetCount).toBe(1);
      expect(pq.playerId).toBe('adv-aria');
      expect(emitSpy).toHaveBeenCalledWith('guild-01', expect.objectContaining({
        playerQuestId: pq.id,
        questId: 'quest-defeat-black-knight',
        playerId: 'adv-aria',
      }));
    });

    it('should prevent accepting a second quest when player already has an active quest', async () => {
      // First acceptance
      await questsService.acceptQuest({
        credentialValue: 'cred-demo-002',
        questId: 'quest-defeat-black-knight',
      });

      // Second acceptance attempt should be rejected
      await expect(
        questsService.acceptQuest({
          credentialValue: 'cred-demo-002',
          questId: 'quest-defeat-black-knight',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Test 3 & Test 7: Boss Battle & Quest Progress Handler', () => {
    it('should NOT advance quest progress when defeated boss does not match targetId', async () => {
      // Setup player with active quest
      await questsService.acceptQuest({
        playerId: 'player-test-mismatch',
        questId: 'quest-defeat-black-knight',
      });

      // Defeat an unrelated boss
      const result = await questsService.onBossDefeated('player-test-mismatch', 'goblin-boss-99');
      expect(result).toBeNull();

      const activeQuest = await questsService.findActivePlayerQuest('player-test-mismatch');
      expect(activeQuest?.progress).toBe(0);
      expect(activeQuest?.status).toBe('accepted');
    });

    it('should advance progress and transition status to completed upon defeating target boss', async () => {
      const emitCompletedSpy = vi.spyOn(eventsService, 'emitQuestCompleted');

      const pq = await questsService.acceptQuest({
        playerId: 'player-test-victory',
        questId: 'quest-defeat-black-knight',
      });

      // Defeat Black Knight (boss-01)
      const updated = await questsService.onBossDefeated('player-test-victory', 'boss-01');

      expect(updated).not.toBeNull();
      expect(updated?.progress).toBe(1);
      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).not.toBeNull();
      expect(emitCompletedSpy).toHaveBeenCalledWith('guild-01', expect.objectContaining({
        playerQuestId: pq.id,
        playerId: 'player-test-victory',
      }));
    });
  });

  describe('Test 4 & 5 & 6: Claim Reward & Double Claim Protection', () => {
    it('should reject claiming reward if quest is still in accepted status', async () => {
      const pq = await questsService.acceptQuest({
        playerId: 'player-uncompleted',
        questId: 'quest-defeat-black-knight',
      });

      await expect(questsService.claimReward(pq.id)).rejects.toThrow(BadRequestException);
    });

    it('should claim reward, increment Gold and Merit, and protect against double claim', async () => {
      const emitClaimedSpy = vi.spyOn(eventsService, 'emitQuestRewardClaimed');

      // 1. Accept and complete quest
      const pq = await questsService.acceptQuest({
        credentialValue: 'cred-demo-001',
        questId: 'quest-defeat-black-knight',
      });
      await questsService.onBossDefeated(pq.playerId, 'boss-01');

      // Verify active quest is now completed
      const scanned = await questsService.scanGuild('cred-demo-001');
      expect(scanned.activeQuest?.status).toBe('completed');

      // 2. Claim reward
      const initialGold = scanned.player.gold;
      const initialMerit = scanned.player.merit;

      const claimResult = await questsService.claimReward(pq.id);
      expect(claimResult.success).toBe(true);
      expect(claimResult.playerQuest.status).toBe('claimed');
      expect(claimResult.reward.gold).toBe(200);
      expect(claimResult.reward.merit).toBe(20);
      expect(emitClaimedSpy).toHaveBeenCalledWith('guild-01', expect.objectContaining({
        playerQuestId: pq.id,
        rewardGold: 200,
        rewardMerit: 20,
      }));

      // Verify player values increased
      const afterScanned = await questsService.scanGuild('cred-demo-001');
      expect(afterScanned.player.gold).toBe(initialGold + 200);
      expect(afterScanned.player.merit).toBe(initialMerit + 20);

      // 3. Test Double Claim Protection (Test 6)
      await expect(questsService.claimReward(pq.id)).rejects.toThrow(BadRequestException);
    });
  });
});
