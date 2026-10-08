import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BossesService } from '../bosses/bosses.service.js';
import { CredentialsService } from '../credentials/credentials.service.js';
import { EventsService } from '../events/events.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  BattleState,
  BattleTurn,
  CreateBattleInput,
  ScanPlayerInput,
} from './battles.types.js';

@Injectable()
export class BattlesService {
  private readonly logger = new Logger(BattlesService.name);
  private readonly battles = new Map<string, BattleState>();
  private readonly turnCounters = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialsService: CredentialsService,
    private readonly bossesService: BossesService,
    private readonly eventsService: EventsService,
  ) {}

  async scanPlayer(input: ScanPlayerInput) {
    const displayId = input.displayId || 'boss-01';
    const player = await this.credentialsService.resolvePlayerByCredential(
      input.credentialValue,
    );

    // Emit player.scanned to Display
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
      success: true,
      displayId,
      player,
    };
  }

  async createBattle(input: CreateBattleInput): Promise<BattleState> {
    const displayId = input.displayId || 'boss-01';

    // 1. Resolve player from credential
    const player = await this.credentialsService.resolvePlayerByCredential(
      input.credentialValue,
    );

    // 2. Validate boss
    const boss = await this.bossesService.findById(input.bossId);

    // 3. Create battle instance
    const battleId = `battle-${Date.now()}`;
    const battle: BattleState = {
      id: battleId,
      playerId: player.id,
      playerName: player.name,
      bossId: boss.id,
      bossName: boss.name,
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      bossHp: boss.hp,
      bossMaxHp: boss.maxHp,
      status: 'active',
      startedAt: new Date().toISOString(),
      endedAt: null,
      displayId,
      lastTurn: null,
      reward: null,
    };

    this.battles.set(battleId, battle);
    this.turnCounters.set(battleId, 0);

    // Persist to DB if connected
    try {
      await (this.prisma as any).battle?.create?.({
        data: {
          id: battle.id,
          playerId: battle.playerId,
          bossId: battle.bossId,
          playerHp: battle.playerHp,
          bossHp: battle.bossHp,
          status: battle.status,
          startedAt: new Date(battle.startedAt),
        },
      });
    } catch {
      // Ignored if DB not ready
    }

    // 4. Emit battle.started event
    this.eventsService.emitBattleStarted(displayId, {
      battleId,
      player: {
        id: player.id,
        name: player.name,
        level: player.level,
        hp: battle.playerHp,
        maxHp: battle.playerMaxHp,
      },
      boss: {
        id: boss.id,
        name: boss.name,
        hp: battle.bossHp,
        maxHp: battle.bossMaxHp,
      },
    });

    this.logger.log(`Battle ${battleId} created between ${player.name} and ${boss.name}`);
    return battle;
  }

  async attack(battleId: string): Promise<BattleState> {
    const battle = this.battles.get(battleId);
    if (!battle) {
      throw new NotFoundException(`Battle with ID '${battleId}' not found`);
    }

    if (battle.status !== 'active') {
      throw new BadRequestException(
        `Battle is already finished with status '${battle.status}'`,
      );
    }

    const currentTurn = (this.turnCounters.get(battleId) ?? 0) + 1;
    this.turnCounters.set(battleId, currentTurn);

    // 1. Emit battle.attack
    this.eventsService.emitBattleAttack(battle.displayId, {
      battleId,
      attacker: 'player',
      attackerName: battle.playerName,
    });

    // 2. Calculate damage
    // Player deals between 32 and 45 damage
    const playerDamage = Math.floor(Math.random() * 14) + 32;
    battle.bossHp = Math.max(0, battle.bossHp - playerDamage);

    let bossDamage = 0;

    if (battle.bossHp <= 0) {
      // Boss Defeated -> Victory!
      battle.bossHp = 0;
      bossDamage = 0;
      battle.status = 'victory';
      battle.endedAt = new Date().toISOString();

      const rewardGold = 120;
      const rewardMerit = 10;
      const rewardItem = 'Black Knight Medal';

      battle.reward = {
        gold: rewardGold,
        merit: rewardMerit,
        item: rewardItem,
      };

      // Server authoritative player state update
      await this.grantVictoryRewards(battle.playerId, rewardGold, rewardMerit, battleId);

      // Emit events: damage -> victory -> reward.received
      this.eventsService.emitBattleDamage(battle.displayId, {
        battleId,
        playerDamageDealt: playerDamage,
        bossDamageDealt: 0,
        playerHp: battle.playerHp,
        playerMaxHp: battle.playerMaxHp,
        bossHp: 0,
        bossMaxHp: battle.bossMaxHp,
      });

      this.eventsService.emitBattleVictory(battle.displayId, {
        battleId,
        playerId: battle.playerId,
        playerName: battle.playerName,
        bossId: battle.bossId,
        bossName: battle.bossName,
      });

      this.eventsService.emitRewardReceived(battle.displayId, {
        battleId,
        playerId: battle.playerId,
        playerName: battle.playerName,
        gold: rewardGold,
        merit: rewardMerit,
        item: rewardItem,
      });
    } else {
      // Boss counter-attacks (12 to 20 damage)
      bossDamage = Math.floor(Math.random() * 9) + 12;
      battle.playerHp = Math.max(0, battle.playerHp - bossDamage);

      if (battle.playerHp <= 0) {
        // Player defeated
        battle.playerHp = 0;
        battle.status = 'defeat';
        battle.endedAt = new Date().toISOString();

        this.eventsService.emitBattleDamage(battle.displayId, {
          battleId,
          playerDamageDealt: playerDamage,
          bossDamageDealt: bossDamage,
          playerHp: 0,
          playerMaxHp: battle.playerMaxHp,
          bossHp: battle.bossHp,
          bossMaxHp: battle.bossMaxHp,
        });

        this.eventsService.emitBattleDefeat(battle.displayId, {
          battleId,
          playerId: battle.playerId,
          playerName: battle.playerName,
          bossId: battle.bossId,
          bossName: battle.bossName,
        });
      } else {
        // Normal damage exchange
        this.eventsService.emitBattleDamage(battle.displayId, {
          battleId,
          playerDamageDealt: playerDamage,
          bossDamageDealt: bossDamage,
          playerHp: battle.playerHp,
          playerMaxHp: battle.playerMaxHp,
          bossHp: battle.bossHp,
          bossMaxHp: battle.bossMaxHp,
        });
      }
    }

    const turn: BattleTurn = {
      playerDamage,
      bossDamage,
      turnNumber: currentTurn,
      timestamp: new Date().toISOString(),
    };
    battle.lastTurn = turn;

    // Update DB if connected
    try {
      await (this.prisma as any).battle?.update?.({
        where: { id: battleId },
        data: {
          playerHp: battle.playerHp,
          bossHp: battle.bossHp,
          status: battle.status,
          endedAt: battle.endedAt ? new Date(battle.endedAt) : null,
          rewardGold: battle.reward?.gold ?? 0,
          rewardMerit: battle.reward?.merit ?? 0,
          rewardItem: battle.reward?.item ?? null,
        },
      });
    } catch {
      // Ignored if DB not ready
    }

    return { ...battle };
  }

  private async grantVictoryRewards(
    playerId: string,
    gold: number,
    merit: number,
    battleId: string,
  ) {
    // 1. Update in-memory player
    this.credentialsService.updateInMemoryPlayerRewards(playerId, gold, merit);

    // 2. Update DB if connected
    try {
      await this.prisma.$transaction(async (tx) => {
        // Update AdventurerProfile
        await (tx as any).adventurerProfile?.update?.({
          where: { id: playerId },
          data: {
            gold: { increment: gold },
            merit: { increment: merit },
          },
        });

        // Add MeritLedger entry for auditability
        await tx.meritLedger?.create?.({
          data: {
            adventurerId: playerId,
            amount: merit,
            reason: `討伐勝利：黑騎士 (Battle ${battleId})`,
            sourceType: 'BATTLE_VICTORY',
            sourceId: battleId,
          },
        });
      });
    } catch {
      // Ignored if DB not active
    }
  }

  async getBattle(battleId: string): Promise<BattleState> {
    const battle = this.battles.get(battleId);
    if (!battle) {
      throw new NotFoundException(`Battle with ID '${battleId}' not found`);
    }
    return { ...battle };
  }
}
