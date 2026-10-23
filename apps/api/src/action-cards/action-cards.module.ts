import { Module } from '@nestjs/common';
import { ActionCardsController } from './action-cards.controller.js';
import { ActionCardsService } from './action-cards.service.js';

@Module({
  controllers: [ActionCardsController],
  providers: [ActionCardsService],
  exports: [ActionCardsService],
})
export class ActionCardsModule {}
