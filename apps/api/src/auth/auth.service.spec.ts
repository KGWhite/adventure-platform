import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockHash = bcryptjs.hashSync('correct-password', 10);
  const mockUser = {
    id: 'user-1',
    username: 'test_user',
    passwordHash: mockHash,
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: vi.fn().mockReturnValue('mock.jwt.token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should validate user with correct password and return sanitized user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

    const result = await service.validateUser('test_user', 'correct-password');
    expect(result.username).toBe('test_user');
    expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('should throw UnauthorizedException on invalid password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

    await expect(service.validateUser('test_user', 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should login and return accessToken', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

    const response = await service.login({
      username: 'test_user',
      password: 'correct-password',
    });

    expect(response.accessToken).toBe('mock.jwt.token');
    expect(response.user.username).toBe('test_user');
    expect((response.user as Record<string, unknown>).passwordHash).toBeUndefined();
  });
});
