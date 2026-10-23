import { Test, TestingModule } from '@nestjs/testing';
import { BattlesService } from './battles.service.js';
import { BossesModule } from '../bosses/bosses.module.js';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { EventsModule } from '../events/events.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventsService } from '../events/events.service.js';
import { ActionCardsService } from '../action-cards/action-cards.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { QuestsService } from '../quests/quests.service.js';

describe('BattlesService (Vertical Slice MVP)', () => {
  let battlesService: BattlesService;
  let eventsService: EventsService;
  let questsService: QuestsService;
  let inventoryService: { getEquipmentStats: ReturnType<typeof vi.fn> };
  let actionCardsService: { resolve: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    actionCardsService = {
      resolve: vi.fn().mockImplementation(async (value: string) => ({
        value,
        type: value.split('-')[1].toUpperCase(),
        enabled: true,
      })),
    };
    inventoryService = {
      getEquipmentStats: vi.fn().mockResolvedValue({ attack: 0, defense: 0 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, EventsModule, CredentialsModule, BossesModule],
      providers: [
        BattlesService,
        { provide: InventoryService, useValue: inventoryService },
        { provide: ActionCardsService, useValue: actionCardsService },
        {
          provide: QuestsService,
          useValue: {
            onBossDefeated: vi.fn().mockResolvedValue(null),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi.fn().mockImplementation(async (cb) => cb({})),
            credential: {
              findUnique: vi.fn().mockResolvedValue(null), // fallback to demo players
            },
            adventurerProfile: {
              findUnique: vi.fn().mockResolvedValue(null),
              update: vi.fn(),
            },
            boss: {
              findUnique: vi.fn().mockResolvedValue(null),
            },
            battle: {
              create: vi.fn(),
              update: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    battlesService = module.get<BattlesService>(BattlesService);
    eventsService = module.get<EventsService>(EventsService);
  });

  it('should scan and resolve player identity from demo credential', async () => {
    const emitSpy = vi.spyOn(eventsService, 'emitPlayerScanned');
    const result = await battlesService.scanPlayer({
      credentialValue: 'cred-demo-001',
      displayId: 'boss-01',
    });

    expect(result.success).toBe(true);
    expect(result.player.name).toBe('Aria');
    expect(result.player.level).toBe(1);
    expect(result.player.gold).toBe(50);
    expect(result.player.merit).toBe(20);
    expect(emitSpy).toHaveBeenCalledWith('boss-01', expect.objectContaining({
      player: expect.objectContaining({ name: 'Aria' }),
    }));
  });

  it('should create a battle and emit battle.started event', async () => {
    const emitSpy = vi.spyOn(eventsService, 'emitBattleStarted');
    const battle = await battlesService.createBattle({
      credentialValue: 'cred-demo-001',
      bossId: 'boss-01',
      displayId: 'boss-01',
    });

    expect(battle.status).toBe('active');
    expect(battle.playerName).toBe('Aria');
    expect(battle.bossName).toBe('Black Knight');
    expect(battle.playerHp).toBe(100);
    expect(battle.bossHp).toBe(150);
    expect(emitSpy).toHaveBeenCalledWith('boss-01', expect.objectContaining({
      battleId: battle.id,
      player: expect.objectContaining({ name: 'Aria' }),
      boss: expect.objectContaining({ name: 'Black Knight' }),
    }));
  });

  it('should execute attack and update damage and grant rewards upon victory', async () => {
    const battle = await battlesService.createBattle({
      credentialValue: 'cred-demo-001',
      bossId: 'boss-01',
      displayId: 'boss-01',
    });

    // Execute turns until victory
    let currentBattle = battle;
    while (currentBattle.status === 'active') {
      currentBattle = await battlesService.attack(currentBattle.id);
    }

    expect(['victory', 'defeat']).toContain(currentBattle.status);
    if (currentBattle.status === 'victory') {
      expect(currentBattle.bossHp).toBe(0);
      expect(currentBattle.reward).not.toBeNull();
      expect(currentBattle.reward?.gold).toBe(120);
      expect(currentBattle.reward?.merit).toBe(10);
      expect(currentBattle.reward?.item).toBe('Black Knight Medal');
    }
  });

  describe('equipment stats', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    async function firstTurnWith(stats: { attack: number; defense: number }, roll: number) {
      inventoryService.getEquipmentStats.mockResolvedValue(stats);
      const battle = await battlesService.createBattle({
        credentialValue: 'cred-demo-001',
        bossId: 'boss-01',
        displayId: 'boss-01',
      });
      vi.spyOn(Math, 'random').mockReturnValue(roll);
      const updated = await battlesService.attack(battle.id);
      return { battle, turn: updated.lastTurn! };
    }

    it('keeps base damage ranges without equipment', async () => {
      expect((await firstTurnWith({ attack: 0, defense: 0 }, 0)).turn).toMatchObject({
        playerDamage: 32,
        bossDamage: 12,
      });
      expect((await firstTurnWith({ attack: 0, defense: 0 }, 0.9999)).turn).toMatchObject({
        playerDamage: 45,
        bossDamage: 20,
      });
    });

    it('adds weapon attack and subtracts armor defense', async () => {
      const low = await firstTurnWith({ attack: 3, defense: 3 }, 0);
      expect(low.turn).toMatchObject({ playerDamage: 35, bossDamage: 9 });
      expect(low.battle).toMatchObject({ playerAttack: 3, playerDefense: 3 });

      const high = await firstTurnWith({ attack: 3, defense: 3 }, 0.9999);
      expect(high.turn).toMatchObject({ playerDamage: 48, bossDamage: 17 });
    });

    it('never lets boss damage drop below 1', async () => {
      const { turn } = await firstTurnWith({ attack: 0, defense: 50 }, 0.9999);
      expect(turn.bossDamage).toBe(1);
    });

    it('includes equipment stats in battle.started', async () => {
      const emitSpy = vi.spyOn(eventsService, 'emitBattleStarted');
      inventoryService.getEquipmentStats.mockResolvedValue({ attack: 8, defense: 6 });
      await battlesService.createBattle({
        credentialValue: 'cred-demo-001',
        bossId: 'boss-01',
        displayId: 'boss-01',
      });
      expect(emitSpy).toHaveBeenCalledWith('boss-01', expect.objectContaining({
        player: expect.objectContaining({ attack: 8, defense: 6 }),
      }));
    });

    it('falls back to zero stats when inventory is unavailable', async () => {
      inventoryService.getEquipmentStats.mockRejectedValue(new Error('db down'));
      const battle = await battlesService.createBattle({
        credentialValue: 'cred-demo-001',
        bossId: 'boss-01',
        displayId: 'boss-01',
      });
      expect(battle).toMatchObject({ playerAttack: 0, playerDefense: 0 });
    });
  });

  describe('action cards', () => {
    let battleId: string;
    let emitSpy: ReturnType<typeof vi.spyOn>;

    const play = (cardValue: string) => battlesService.playCard(battleId, cardValue);
    const emittedTypes = () => emitSpy.mock.calls.map(([type]) => type);

    beforeEach(async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
      const battle = await battlesService.createBattle({
        credentialValue: 'cred-demo-001',
        bossId: 'boss-01',
        displayId: 'boss-01',
      });
      battleId = battle.id;
      vi.spyOn(Math, 'random').mockReturnValue(0); // base damage 32, boss counter 12
      emitSpy = vi.spyOn(eventsService, 'emit');
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('casts a normal attack immediately for a strike card', async () => {
      const res = await play('card-strike-001');
      expect(res).toMatchObject({
        result: 'cast',
        skill: { id: 'strike', damage: 32, bossCountered: true },
        castSlot: [],
      });
      expect(res.battle).toMatchObject({ bossHp: 118, playerHp: 88 });
      expect(emittedTypes()).toEqual(['card.scanned', 'skill.cast', 'battle.damage']);
    });

    it('charges an element card and combines fire + wind into fire tornado', async () => {
      const charged = await play('card-fire-001');
      expect(charged).toMatchObject({ result: 'charged', skill: null, castSlot: [{ type: 'FIRE' }] });
      expect(new Date(charged.comboDeadline!).getTime() - Date.now()).toBe(6000);

      const cast = await play('card-wind-001');
      expect(cast).toMatchObject({ result: 'cast', skill: { id: 'fire-tornado', damage: 64 }, castSlot: [] });
      expect(cast.comboDeadline).toBeNull();
    });

    it('steam burst skips the boss counter', async () => {
      await play('card-water-001');
      const res = await play('card-fire-001');
      expect(res.skill).toMatchObject({ id: 'steam-burst', damage: 48, bossCountered: false });
      expect(res.battle.lastTurn).toMatchObject({ bossDamage: 0 });
      expect(res.battle.playerHp).toBe(100);
    });

    it('healing rain restores HP up to maxHp', async () => {
      await play('card-strike-001'); // player 100 -> 88
      await play('card-water-001');
      const res = await play('card-wind-001');
      expect(res.skill).toMatchObject({ id: 'healing-rain', damage: 0, heal: 12 });
      expect(res.battle).toMatchObject({ bossHp: 118, playerHp: 88 }); // healed to 100, countered 12
    });

    it('element followed by strike casts element slash', async () => {
      await play('card-wind-002');
      const res = await play('card-strike-002');
      expect(res.skill).toMatchObject({ id: 'element-slash', damage: 48 });
    });

    it('two cards of the same element fizzle without any HP change', async () => {
      await play('card-fire-001');
      const res = await play('card-fire-002');
      expect(res).toMatchObject({ result: 'fizzled', skill: null, castSlot: [] });
      expect(res.battle).toMatchObject({ bossHp: 150, playerHp: 100 });
      expect(emittedTypes()).toEqual(['card.scanned', 'card.scanned', 'skill.fizzled']);
    });

    it('casts element bolt when the combo window expires', async () => {
      await play('card-fire-001');
      emitSpy.mockClear();
      await vi.advanceTimersByTimeAsync(6000);

      expect(emittedTypes()).toEqual(['skill.cast', 'battle.damage']);
      expect(emitSpy.mock.calls[0][2]).toMatchObject({ skillId: 'element-bolt', damage: 32, cards: ['FIRE'] });
      const battle = await battlesService.getBattle(battleId);
      expect(battle).toMatchObject({ castSlot: [], comboDeadline: null, bossHp: 118 });
    });

    it('ignores the same card within the cooldown but accepts another card of the same type', async () => {
      await play('card-strike-001');
      emitSpy.mockClear();

      const repeat = await play('card-strike-001');
      expect(repeat.result).toBe('cooldown');
      expect(emitSpy).not.toHaveBeenCalled();

      expect((await play('card-strike-002')).result).toBe('cast');
      await vi.advanceTimersByTimeAsync(2000);
      expect((await play('card-strike-001')).result).toBe('cast');
    });

    it('resolves a combo only once when a card and the timeout race', async () => {
      await play('card-fire-001');
      await vi.advanceTimersByTimeAsync(5999);
      emitSpy.mockClear();

      const pending = play('card-wind-001');
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      await vi.advanceTimersByTimeAsync(10);

      expect(emittedTypes().filter((type) => type === 'skill.cast')).toHaveLength(1);
      const battle = await battlesService.getBattle(battleId);
      expect(battle.castSlot).toEqual([]);
    });

    it('rejects cards after the battle has ended', async () => {
      (battlesService as any).battles.get(battleId).status = 'victory';
      await expect(play('card-strike-001')).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'BATTLE_NOT_ACTIVE' }),
      });
    });

    it('keeps the cast slot when the button attack is used', async () => {
      await play('card-fire-001');
      const battle = await battlesService.attack(battleId);
      expect(battle.castSlot.map((entry) => entry.type)).toEqual(['FIRE']);
      expect(battle.bossHp).toBe(118);
    });
  });
});
