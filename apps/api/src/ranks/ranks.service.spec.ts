import { Test, TestingModule } from '@nestjs/testing';
import { RanksService } from './ranks.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('RanksService', () => {
  let service: RanksService;
  let prisma: PrismaService;

  const mockRanks = [
    { id: '1', code: 'F', name: 'Rank F', order: 1, promotionThreshold: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: '2', code: 'E', name: 'Rank E', order: 2, promotionThreshold: 100, createdAt: new Date(), updatedAt: new Date() },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RanksService,
        {
          provide: PrismaService,
          useValue: {
            rank: {
              findMany: vi.fn().mockResolvedValue(mockRanks),
              findUnique: vi.fn().mockImplementation(({ where }) => {
                if (where.id) return mockRanks.find((r) => r.id === where.id) || null;
                if (where.code) return mockRanks.find((r) => r.code === where.code) || null;
                return null;
              }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RanksService>(RanksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should list all ranks ordered by order ascending', async () => {
    const ranks = await service.findAll();
    expect(ranks).toHaveLength(2);
    expect(ranks[0].code).toBe('F');
    expect(prisma.rank.findMany).toHaveBeenCalledWith({ orderBy: { order: 'asc' } });
  });

  it('should find a rank by id', async () => {
    const rank = await service.findById('1');
    expect(rank).toBeDefined();
    expect(rank.code).toBe('F');
  });

  it('should throw NotFoundException for unknown rank id', async () => {
    await expect(service.findById('non-existent')).rejects.toThrow();
  });
});
