import { Controller, Get } from '@nestjs/common';
import { ActionCardsService } from './action-cards.service.js';

@Controller('action-cards')
export class ActionCardsController {
  constructor(private readonly actionCardsService: ActionCardsService) {}

  @Get()
  async listActionCards() {
    return this.actionCardsService.findEnabled();
  }
}
