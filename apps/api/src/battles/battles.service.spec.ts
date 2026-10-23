import { Test, TestingModule } from '@nestjs/testing';
import { BattlesService } from './battles.service.js';
import { BossesModule } from '../bosses/bosses.module.js';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { EventsModule } from '../events/events.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventsService } from '../events/events.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { QuestsService } from '../quests/quests.service.js';

describe('BattlesService (Vertical Slice MVP)', () => {
  let battlesService: BattlesService;
  let eventsService: EventsService;
  let questsService: QuestsService;
  let inventoryService: { getEquipmentStats: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    inventoryService = {
      getEquipmentStats: vi.fn().mockResolvedValue({ attack: 0, defense: 0 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, EventsModule, CredentialsModule, BossesModule],
      providers: [
        BattlesService,
        { provide: InventoryService, useValue: inventoryService },
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
});
