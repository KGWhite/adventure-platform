import { Module } from '@nestjs/common';
import { RanksController } from './ranks.controller.js';
import { RanksService } from './ranks.service.js';

@Module({
  controllers: [RanksController],
  providers: [RanksService],
  exports: [RanksService],
})
export class RanksModule {}
