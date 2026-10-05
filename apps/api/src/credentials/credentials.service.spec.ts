import { Test, TestingModule } from '@nestjs/testing';
import { CredentialType } from '@prisma/client';
import { CredentialsService } from './credentials.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        {
          provide: PrismaService,
          useValue: {
            credential: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
              create: vi.fn(),
            },
            adventurerProfile: {
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a credential for valid adventurer with QRCODE, RFID, or NFC', async () => {
    vi.mocked(prisma.adventurerProfile.findUnique).mockResolvedValue({
      id: 'adv-1',
      userId: 'user-1',
      displayName: 'Adventurer',
      currentRankId: 'rank-f',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.credential.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.credential.create).mockResolvedValue({
      id: 'cred-1',
      adventurerId: 'adv-1',
      type: CredentialType.NFC,
      value: 'NFC-12345',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      adventurerId: 'adv-1',
      type: CredentialType.NFC,
      value: 'NFC-12345',
    });

    expect(result.id).toBe('cred-1');
    expect(result.type).toBe(CredentialType.NFC);
    expect(prisma.credential.create).toHaveBeenCalled();
  });

  it('should throw NotFoundException if adventurer does not exist', async () => {
    vi.mocked(prisma.adventurerProfile.findUnique).mockResolvedValue(null);

    await expect(
      service.create({
        adventurerId: 'non-existent',
        type: CredentialType.QRCODE,
        value: 'QR-123',
      }),
    ).rejects.toThrow();
  });
});
