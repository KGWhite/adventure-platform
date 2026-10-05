import { Test, TestingModule } from '@nestjs/testing';
import { AdventurersService } from './adventurers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdventurersService', () => {
  let service: AdventurersService;
  let prisma: PrismaService;

  const mockAdventurer = {
    id: 'adv-1',
    userId: 'user-1',
    displayName: 'Rookie Adventurer',
    currentRankId: 'rank-f',
    createdAt: new Date(),
    updatedAt: new Date(),
    currentRank: { id: 'rank-f', code: 'F', name: 'Rank F', order: 1, promotionThreshold: 0 },
    user: { id: 'user-1', username: 'adventurer', role: 'USER' },
    credentials: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdventurersService,
        {
          provide: PrismaService,
          useValue: {
            adventurerProfile: {
              findMany: vi.fn().mockResolvedValue([mockAdventurer]),
              findUnique: vi.fn().mockImplementation(({ where }) => {
                if (where.id === 'adv-1') return mockAdventurer;
                return null;
              }),
              create: vi.fn(),
            },
            user: {
              findUnique: vi.fn(),
            },
            rank: {
              findUnique: vi.fn(),
            },
            credential: {
              findMany: vi.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AdventurersService>(AdventurersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should find an adventurer by id with rank and sanitized user', async () => {
    const result = await service.findById('adv-1');
    expect(result.id).toBe('adv-1');
    expect(result.displayName).toBe('Rookie Adventurer');
    expect(result.currentRank.code).toBe('F');
    expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('should throw NotFoundException if adventurer not found', async () => {
    await expect(service.findById('non-existent')).rejects.toThrow();
  });
});
