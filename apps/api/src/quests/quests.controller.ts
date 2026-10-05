import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { RequestUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QuestsService } from './quests.service.js';

class CompleteQuestDto {
  adventurerId?: string;
}

@Controller('quests')
export class QuestsController {
  constructor(
    private readonly questsService: QuestsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async listQuests() {
    return this.questsService.findAll();
  }

  @Get(':id')
  async getQuest(@Param('id') id: string) {
    return this.questsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete')
  async completeQuest(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CompleteQuestDto,
  ) {
    let targetAdventurerId = dto.adventurerId;

    if (!targetAdventurerId) {
      const profile = await this.prisma.adventurerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!profile) {
        throw new NotFoundException('Adventurer profile not found for current user');
      }
      targetAdventurerId = profile.id;
    }

    return this.questsService.completeQuest(id, targetAdventurerId, user.id);
  }
}
