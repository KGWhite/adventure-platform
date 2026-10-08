import { Test, TestingModule } from '@nestjs/testing';
import { BattlesService } from './battles.service.js';
import { BossesModule } from '../bosses/bosses.module.js';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { EventsModule } from '../events/events.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EventsService } from '../events/events.service.js';
import { QuestsService } from '../quests/quests.service.js';

describe('BattlesService (Vertical Slice MVP)', () => {
  let battlesService: BattlesService;
  let eventsService: EventsService;
  let questsService: QuestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, EventsModule, CredentialsModule, BossesModule],
      providers: [
        BattlesService,
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
});
