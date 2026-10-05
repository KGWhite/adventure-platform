import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(),
              create: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create user with hashed password and return sanitized user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-1',
      username: 'test_user',
      passwordHash: '$2a$10$fakehashedpassword',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({ username: 'test_user', password: 'password123' });

    expect(result.username).toBe('test_user');
    expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('should never expose passwordHash when finding by id', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      username: 'test_user',
      passwordHash: '$2a$10$fakehashedpassword',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.findById('user-1');

    expect(result.id).toBe('user-1');
    expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
  });
});
