import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ProgressionController } from './progression.controller.js';
import { ProgressionService } from './progression.service.js';

@Module({
  imports: [InventoryModule],
  controllers: [ProgressionController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
