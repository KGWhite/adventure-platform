import { Module } from '@nestjs/common';
import { BossesController } from './bosses.controller.js';
import { BossesService } from './bosses.service.js';

@Module({
  controllers: [BossesController],
  providers: [BossesService],
  exports: [BossesService],
})
export class BossesModule {}
