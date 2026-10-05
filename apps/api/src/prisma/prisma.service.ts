import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    try {
      await this.$connect();
      this.logger.log('Prisma successfully connected to PostgreSQL database');
    } catch (error) {
      this.logger.error('Prisma failed to connect to PostgreSQL database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
