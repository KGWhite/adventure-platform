import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ShopsController } from './shops.controller.js';
import { ShopsService } from './shops.service.js';

@Module({
  imports: [InventoryModule],
  controllers: [ShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
