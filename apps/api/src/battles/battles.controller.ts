import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BattlesService } from './battles.service.js';
import type { CreateBattleInput, ScanPlayerInput } from './battles.types.js';

class CreateBattleDto implements CreateBattleInput {
  credentialValue!: string;
  bossId!: string;
  displayId?: string;
}

class ScanPlayerDto implements ScanPlayerInput {
  credentialValue!: string;
  displayId?: string;
}

@Controller('battles')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Post('scan')
  async scanPlayer(@Body() dto: ScanPlayerDto) {
    return this.battlesService.scanPlayer(dto);
  }

  @Post()
  async createBattle(@Body() dto: CreateBattleDto) {
    return this.battlesService.createBattle(dto);
  }

  @Post(':id/attack')
  async attack(@Param('id') id: string) {
    return this.battlesService.attack(id);
  }

  @Get(':id')
  async getBattle(@Param('id') id: string) {
    return this.battlesService.getBattle(id);
  }
}
