import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ActionCardType } from '@prisma/client';
import { ActionCardsService } from '../action-cards/action-cards.service.js';
import { BossesService } from '../bosses/bosses.service.js';
import { CredentialsService } from '../credentials/credentials.service.js';
import { EventsService } from '../events/events.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QuestsService } from '../quests/quests.service.js';
import type {
  BattleState,
  CardPlayResult,
  CastSkillView,
  CastSlotEntry,
  CreateBattleInput,
  PlayCardResponse,
  ScanPlayerInput,
} from './battles.types.js';
import {
  CARD_COOLDOWN_MS,
  COMBO_WINDOW_MS,
  type ElementCardType,
  type SkillDefinition,
  type SkillId,
  SKILLS,
  resolveCard,
} from './skills.js';

interface TurnAction {
  playerDamage: number;
  heal: number;
  bossCounters: boolean;
  skillId: SkillId | null;
}

interface TurnOutcome {
  playerDamage: number;
  bossDamage: number;
  healed: number;
}

@Injectable()
export class BattlesService {
  private readonly logger = new Logger(BattlesService.name);
  private readonly battles = new Map<string, BattleState>();
  private readonly turnCounters = new Map<string, number>();
  private readonly cardCooldowns = new Map<string, Map<string, number>>();
  private readonly comboTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly battleLocks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialsService: CredentialsService,
    private readonly bossesService: BossesService,
    private readonly eventsService: EventsService,
    private readonly questsService: QuestsService,
    private readonly inventoryService: InventoryService,
    private readonly actionCardsService: ActionCardsService,
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

    // 3. Snapshot equipment stats; in-memory demo players have no inventory
    const equipmentStats = await this.inventoryService
      .getEquipmentStats(player.id)
      .catch(() => ({ attack: 0, defense: 0 }));

    // 4. Create battle instance
    const battleId = `battle-${Date.now()}`;
    const battle: BattleState = {
      id: battleId,
      playerId: player.id,
      playerName: player.name,
      bossId: boss.id,
      bossName: boss.name,
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      playerAttack: equipmentStats.attack,
      playerDefense: equipmentStats.defense,
      bossHp: boss.hp,
      bossMaxHp: boss.maxHp,
      status: 'active',
      startedAt: new Date().toISOString(),
      endedAt: null,
      displayId,
      lastTurn: null,
      reward: null,
      castSlot: [],
      comboDeadline: null,
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

    // 5. Emit battle.started event
    this.eventsService.emitBattleStarted(displayId, {
      battleId,
      player: {
        id: player.id,
        name: player.name,
        level: player.level,
        hp: battle.playerHp,
        maxHp: battle.playerMaxHp,
        attack: battle.playerAttack,
        defense: battle.playerDefense,
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
    return this.runExclusive(battleId, async () => {
      const battle = this.battles.get(battleId);
      if (!battle) {
        throw new NotFoundException(`Battle with ID '${battleId}' not found`);
      }

      if (battle.status !== 'active') {
        throw new BadRequestException(
          `Battle is already finished with status '${battle.status}'`,
        );
      }

      // 1. Emit battle.attack
      this.eventsService.emitBattleAttack(battle.displayId, {
        battleId,
        attacker: 'player',
        attackerName: battle.playerName,
      });

      // 2. Resolve the turn with base damage
      const outcome = this.applyTurn(battle, {
        playerDamage: this.rollBaseDamage(battle),
        heal: 0,
        bossCounters: true,
        skillId: null,
      });
      await this.finishTurn(battle, outcome);
      return { ...battle };
    });
  }

  async playCard(battleId: string, cardValue: string): Promise<PlayCardResponse> {
    if (!this.battles.has(battleId)) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'BATTLE_NOT_FOUND',
        message: `Battle with ID '${battleId}' not found`,
      });
    }
    const card = await this.actionCardsService.resolve(cardValue);

    return this.runExclusive(battleId, async () => {
      const battle = this.battles.get(battleId)!;
      if (battle.status !== 'active') {
        throw new ConflictException({
          statusCode: 409,
          code: 'BATTLE_NOT_ACTIVE',
          message: `Battle is already finished with status '${battle.status}'`,
        });
      }

      const cooldowns = this.cardCooldowns.get(battleId) ?? new Map<string, number>();
      this.cardCooldowns.set(battleId, cooldowns);
      const now = Date.now();
      const lastPlayed = cooldowns.get(card.value);
      if (lastPlayed !== undefined && now - lastPlayed < CARD_COOLDOWN_MS) {
        return this.toPlayCardResponse(battle, 'cooldown', null);
      }
      cooldowns.set(card.value, now);

      const pending = (battle.castSlot[0]?.type as ElementCardType | undefined) ?? null;
      const outcome = resolveCard(pending, card.type);

      if (outcome.kind === 'charge') {
        const entry = { type: card.type, cardValue: card.value, scannedAt: new Date(now).toISOString() };
        battle.castSlot = [entry];
        battle.comboDeadline = new Date(now + COMBO_WINDOW_MS).toISOString();
        this.scheduleComboExpiry(battle, entry);
        this.emitCardScanned(battle, card.type, [card.type]);
        return this.toPlayCardResponse(battle, 'charged', null);
      }

      const cards = [...battle.castSlot.map((entry) => entry.type), card.type];
      this.clearCombo(battle);
      this.emitCardScanned(battle, card.type, cards);

      if (outcome.kind === 'fizzle') {
        this.eventsService.emitSkillFizzled(battle.displayId, {
          battleId,
          playerId: battle.playerId,
          cards,
        });
        return this.toPlayCardResponse(battle, 'fizzled', null);
      }

      const skill = await this.castSkill(battle, outcome.skill, cards);
      return this.toPlayCardResponse(battle, 'cast', skill);
    });
  }

  private rollBaseDamage(battle: BattleState): number {
    // Player deals between 32 and 45 damage plus equipped weapon attack
    return Math.floor(Math.random() * 14) + 32 + battle.playerAttack;
  }

  private async castSkill(
    battle: BattleState,
    skill: SkillDefinition,
    cards: ActionCardType[],
  ): Promise<CastSkillView> {
    const playerDamage =
      skill.damageMultiplier > 0 ? Math.round(this.rollBaseDamage(battle) * skill.damageMultiplier) : 0;
    const outcome = this.applyTurn(battle, {
      playerDamage,
      heal: skill.heal,
      bossCounters: skill.bossCounters,
      skillId: skill.id,
    });
    const view: CastSkillView = {
      id: skill.id,
      name: skill.name,
      damage: outcome.playerDamage,
      heal: outcome.healed,
      bossCountered: outcome.bossDamage > 0,
    };

    this.eventsService.emitSkillCast(battle.displayId, {
      battleId: battle.id,
      playerId: battle.playerId,
      skillId: skill.id,
      skillName: skill.name,
      cards,
      damage: view.damage,
      heal: view.heal,
      bossCountered: view.bossCountered,
    });
    await this.finishTurn(battle, outcome);
    this.logger.log(`${battle.playerName} cast ${skill.name} (${cards.join('+')}) in ${battle.id}`);
    return view;
  }

  /** Applies damage, healing and the boss counter to the in-memory battle. */
  private applyTurn(battle: BattleState, action: TurnAction): TurnOutcome {
    const turnNumber = (this.turnCounters.get(battle.id) ?? 0) + 1;
    this.turnCounters.set(battle.id, turnNumber);

    const healed = Math.min(action.heal, battle.playerMaxHp - battle.playerHp);
    battle.playerHp += healed;
    battle.bossHp = Math.max(0, battle.bossHp - action.playerDamage);

    let bossDamage = 0;
    if (battle.bossHp <= 0) {
      battle.status = 'victory';
      battle.endedAt = new Date().toISOString();
      battle.reward = { gold: 120, merit: 10, item: 'Black Knight Medal' };
    } else if (action.bossCounters) {
      // Boss counter-attacks (12 to 20 damage), reduced by armor defense (min 1)
      bossDamage = Math.max(1, Math.floor(Math.random() * 9) + 12 - battle.playerDefense);
      battle.playerHp = Math.max(0, battle.playerHp - bossDamage);
      if (battle.playerHp <= 0) {
        battle.status = 'defeat';
        battle.endedAt = new Date().toISOString();
      }
    }

    battle.lastTurn = {
      playerDamage: action.playerDamage,
      bossDamage,
      heal: healed,
      skillId: action.skillId,
      turnNumber,
      timestamp: new Date().toISOString(),
    };
    if (battle.status !== 'active') {
      this.clearCombo(battle);
      this.cardCooldowns.delete(battle.id);
    }
    return { playerDamage: action.playerDamage, bossDamage, healed };
  }

  /** Grants rewards, emits HP / outcome events and persists the battle. */
  private async finishTurn(battle: BattleState, outcome: TurnOutcome) {
    const battleId = battle.id;

    if (battle.status === 'victory' && battle.reward) {
      // Server authoritative player state update
      await this.grantVictoryRewards(battle.playerId, battle.reward.gold, battle.reward.merit, battleId);

      // Trigger Quest Progress Handler (Battle Result -> Player -> Boss ID -> Quest Progress)
      try {
        await this.questsService.onBossDefeated(battle.playerId, battle.bossId);
      } catch (questErr) {
        this.logger.error(`Failed to update quest progress for player ${battle.playerId}`, questErr);
      }
    }

    this.eventsService.emitBattleDamage(battle.displayId, {
      battleId,
      playerDamageDealt: outcome.playerDamage,
      bossDamageDealt: outcome.bossDamage,
      playerHp: battle.playerHp,
      playerMaxHp: battle.playerMaxHp,
      bossHp: battle.bossHp,
      bossMaxHp: battle.bossMaxHp,
    });

    if (battle.status === 'victory' && battle.reward) {
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
        ...battle.reward,
      });
    } else if (battle.status === 'defeat') {
      this.eventsService.emitBattleDefeat(battle.displayId, {
        battleId,
        playerId: battle.playerId,
        playerName: battle.playerName,
        bossId: battle.bossId,
        bossName: battle.bossName,
      });
    }

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
  }

  private scheduleComboExpiry(battle: BattleState, entry: CastSlotEntry) {
    this.clearComboTimer(battle.id);
    const timer = setTimeout(() => {
      this.runExclusive(battle.id, async () => {
        // A later card may already have resolved this combo
        if (battle.status !== 'active' || battle.castSlot[0] !== entry) return;
        this.clearCombo(battle);
        await this.castSkill(battle, SKILLS['element-bolt'], [entry.type]);
      }).catch((err) => this.logger.error(`Combo expiry failed for ${battle.id}`, err));
    }, COMBO_WINDOW_MS);
    timer.unref?.();
    this.comboTimers.set(battle.id, timer);
  }

  private clearCombo(battle: BattleState) {
    battle.castSlot = [];
    battle.comboDeadline = null;
    this.clearComboTimer(battle.id);
  }

  private clearComboTimer(battleId: string) {
    const timer = this.comboTimers.get(battleId);
    if (timer) clearTimeout(timer);
    this.comboTimers.delete(battleId);
  }

  private emitCardScanned(battle: BattleState, cardType: ActionCardType, castSlot: ActionCardType[]) {
    this.eventsService.emitCardScanned(battle.displayId, {
      battleId: battle.id,
      playerId: battle.playerId,
      cardType,
      castSlot,
      comboDeadline: battle.comboDeadline,
    });
  }

  private toPlayCardResponse(
    battle: BattleState,
    result: CardPlayResult,
    skill: CastSkillView | null,
  ): PlayCardResponse {
    return {
      result,
      skill,
      castSlot: battle.castSlot.map(({ type }) => ({ type })),
      comboDeadline: battle.comboDeadline,
      battle: { ...battle, castSlot: [...battle.castSlot] },
    };
  }

  /**
   * Serializes actions per battle so a card scan, a button attack and a combo
   * timeout never resolve the same turn concurrently.
   */
  private runExclusive<T>(battleId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.battleLocks.get(battleId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    const tail = run.catch(() => undefined);
    this.battleLocks.set(battleId, tail);
    void tail.then(() => {
      if (this.battleLocks.get(battleId) === tail) this.battleLocks.delete(battleId);
    });
    return run;
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
      await (this.prisma as any).$transaction(async (tx: any) => {
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
