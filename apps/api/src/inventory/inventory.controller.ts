import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { StaffOnly } from '../auth/decorators/staff-only.decorator.js';
import { InventoryService } from './inventory.service.js';
import { EquipItemDto } from './inventory.types.js';

@Controller('players')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':playerId/inventory')
  async getInventory(@Param('playerId') playerId: string) {
    return this.inventoryService.getPlayerInventory(playerId);
  }

  @StaffOnly()
  @Post(':playerId/equipment')
  @HttpCode(200)
  async equip(@Param('playerId') playerId: string, @Body() dto: EquipItemDto) {
    return this.inventoryService.equip(playerId, dto.playerItemId, dto.displayId);
  }

  @StaffOnly()
  @Delete(':playerId/equipment/:slot')
  async unequip(
    @Param('playerId') playerId: string,
    @Param('slot') slot: string,
    @Query('displayId') displayId?: string,
  ) {
    return this.inventoryService.unequip(playerId, slot, displayId);
  }
}
