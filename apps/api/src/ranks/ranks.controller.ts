import { Controller, Get, Param } from '@nestjs/common';
import { Rank } from '@prisma/client';
import { RanksService } from './ranks.service.js';

@Controller('ranks')
export class RanksController {
  constructor(private readonly ranksService: RanksService) {}

  @Get()
  async listRanks(): Promise<Rank[]> {
    return this.ranksService.findAll();
  }

  @Get(':id')
  async getRank(@Param('id') id: string): Promise<Rank> {
    return this.ranksService.findById(id);
  }
}
