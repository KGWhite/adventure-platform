import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CreateAdventurerInput {
  userId: string;
  displayName: string;
  rankCode?: string;
  rankId?: string;
}

const safeUserSelect = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class AdventurersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.adventurerProfile.findMany({
      include: {
        currentRank: true,
        user: { select: safeUserSelect },
        credentials: true,
      },
    });
  }

  async findById(id: string) {
    const adventurer = await this.prisma.adventurerProfile.findUnique({
      where: { id },
      include: {
        currentRank: true,
        user: { select: safeUserSelect },
        credentials: true,
      },
    });

    if (!adventurer) {
      throw new NotFoundException(`Adventurer with ID '${id}' not found`);
    }

    return adventurer;
  }

  async findByUserId(userId: string) {
    const adventurer = await this.prisma.adventurerProfile.findUnique({
      where: { userId },
      include: {
        currentRank: true,
        user: { select: safeUserSelect },
        credentials: true,
      },
    });

    if (!adventurer) {
      throw new NotFoundException(`Adventurer for user ID '${userId}' not found`);
    }

    return adventurer;
  }

  async create(input: CreateAdventurerInput) {
    // 1. Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID '${input.userId}' does not exist`);
    }

    // 2. Check if user already has an adventurer profile
    const existing = await this.prisma.adventurerProfile.findUnique({
      where: { userId: input.userId },
    });
    if (existing) {
      throw new ConflictException(`User already has an adventurer profile`);
    }

    // 3. Resolve rank (default to Rank F if not specified)
    let rankId = input.rankId;
    if (!rankId) {
      const rankCode = input.rankCode || 'F';
      const rank = await this.prisma.rank.findUnique({
        where: { code: rankCode },
      });
      if (!rank) {
        throw new BadRequestException(`Rank with code '${rankCode}' not found`);
      }
      rankId = rank.id;
    }

    return this.prisma.adventurerProfile.create({
      data: {
        userId: input.userId,
        displayName: input.displayName,
        currentRankId: rankId,
      },
      include: {
        currentRank: true,
        user: { select: safeUserSelect },
        credentials: true,
      },
    });
  }

  async getCredentials(adventurerId: string) {
    // Verify adventurer exists
    await this.findById(adventurerId);

    return this.prisma.credential.findMany({
      where: { adventurerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
