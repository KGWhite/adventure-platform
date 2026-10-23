import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ActionCard } from '@prisma/client';
import { requireDatabase } from '../prisma/database-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ActionCardView {
  value: string;
  type: ActionCard['type'];
  label: string | null;
}

@Injectable()
export class ActionCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findEnabled(): Promise<ActionCardView[]> {
    return requireDatabase(async () => {
      const cards = await this.prisma.actionCard.findMany({
        where: { enabled: true },
        orderBy: [{ type: 'asc' }, { value: 'asc' }],
      });
      return cards.map(({ value, type, label }) => ({ value, type, label }));
    });
  }

  /** Resolves a scanned card value to an enabled action card. */
  async resolve(cardValue: string): Promise<ActionCard> {
    return requireDatabase(async () => {
      const card = await this.prisma.actionCard.findUnique({ where: { value: cardValue.trim() } });
      if (!card) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'CARD_NOT_FOUND',
          message: `No action card found for value '${cardValue}'`,
        });
      }
      if (!card.enabled) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'CARD_DISABLED',
          message: 'Action card is disabled',
        });
      }
      return card;
    });
  }
}
