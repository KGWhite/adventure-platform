import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestCompletionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CompleteQuestResult {
  success: boolean;
  quest: {
    id: string;
    title: string;
  };
  questCompletion: {
    id: string;
    status: QuestCompletionStatus;
    completedAt: Date;
  };
  meritGranted: number;
}

@Injectable()
export class QuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.quest.findMany({
      where: { enabled: true },
      include: {
        requiredRank: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    const quest = await this.prisma.quest.findUnique({
      where: { id },
      include: { requiredRank: true },
    });
    if (!quest) {
      throw new NotFoundException(`Quest with ID "${id}" not found`);
    }
    return quest;
  }

  async completeQuest(
    questId: string,
    adventurerId: string,
    approverUserId?: string,
  ): Promise<CompleteQuestResult> {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest || !quest.enabled) {
      throw new NotFoundException(`Quest "${questId}" not found or is disabled`);
    }

    const adventurer = await this.prisma.adventurerProfile.findUnique({
      where: { id: adventurerId },
    });

    if (!adventurer) {
      throw new BadRequestException(`Adventurer "${adventurerId}" not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const completion = await tx.questCompletion.create({
        data: {
          questId: quest.id,
          adventurerId: adventurer.id,
          status: QuestCompletionStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: approverUserId,
        },
      });

      if (quest.meritReward > 0) {
        await tx.meritLedger.create({
          data: {
            adventurerId: adventurer.id,
            amount: quest.meritReward,
            reason: `任務完成：${quest.title}`,
            sourceType: 'QUEST_COMPLETION',
            sourceId: completion.id,
          },
        });
      }

      return {
        success: true,
        quest: {
          id: quest.id,
          title: quest.title,
        },
        questCompletion: {
          id: completion.id,
          status: completion.status,
          completedAt: completion.completedAt,
        },
        meritGranted: quest.meritReward,
      };
    });
  }
}
