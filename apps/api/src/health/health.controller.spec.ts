import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $connect: vi.fn(),
            $disconnect: vi.fn(),
          },
        },
      ],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('should return status ok', async () => {
    const result = await healthController.getHealth();
    expect(result).toEqual({ status: 'ok' });
  });
});
