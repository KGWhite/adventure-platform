import { Injectable, NotFoundException } from '@nestjs/common';
import { Rank } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RanksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Rank[]> {
    return this.prisma.rank.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async findById(id: string): Promise<Rank> {
    const rank = await this.prisma.rank.findUnique({
      where: { id },
    });
    if (!rank) {
      throw new NotFoundException(`Rank with ID '${id}' not found`);
    }
    return rank;
  }

  async findByCode(code: string): Promise<Rank> {
    const rank = await this.prisma.rank.findUnique({
      where: { code },
    });
    if (!rank) {
      throw new NotFoundException(`Rank with code '${code}' not found`);
    }
    return rank;
  }
}
