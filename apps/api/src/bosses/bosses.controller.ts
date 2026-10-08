import { Controller, Get, Param } from '@nestjs/common';
import { BossesService } from './bosses.service.js';

@Controller('bosses')
export class BossesController {
  constructor(private readonly bossesService: BossesService) {}

  @Get()
  async listBosses() {
    return this.bossesService.findAll();
  }

  @Get(':id')
  async getBoss(@Param('id') id: string) {
    return this.bossesService.findById(id);
  }
}
