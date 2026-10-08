import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { QuestsService } from './quests.service.js';
import {
  AcceptQuestDto,
  GuildScanDto,
} from './quests.types.js';

@Controller()
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  // 1. Quests definition list
  @Get('quests')
  async listQuests() {
    return this.questsService.findAll();
  }

  // 2. Single quest details
  @Get('quests/:id')
  async getQuest(@Param('id') id: string) {
    return this.questsService.findById(id);
  }

  // 3. Accept quest -> creates PlayerQuest instance
  @Post('player-quests')
  async acceptQuest(@Body() dto: AcceptQuestDto) {
    return this.questsService.acceptQuest(dto);
  }

  // 4. Get active quest for player
  @Get('player-quests/player/:playerId')
  async getActivePlayerQuest(@Param('playerId') playerId: string) {
    return this.questsService.findActivePlayerQuest(playerId);
  }

  // 5. Claim reward for completed quest
  @Post('player-quests/:id/claim')
  async claimReward(@Param('id') id: string) {
    return this.questsService.claimReward(id);
  }

  // 6. Guild Terminal Scan (Card scan -> Player + Active Quest + Available Quests)
  @Post('guild/scan')
  async scanGuild(@Body() dto: GuildScanDto) {
    return this.questsService.scanGuild(dto.credentialValue, dto.displayId);
  }
}
