import { Module } from '@nestjs/common';
import { AdventurersController } from './adventurers.controller.js';
import { AdventurersService } from './adventurers.service.js';

@Module({
  controllers: [AdventurersController],
  providers: [AdventurersService],
  exports: [AdventurersService],
})
export class AdventurersModule {}
