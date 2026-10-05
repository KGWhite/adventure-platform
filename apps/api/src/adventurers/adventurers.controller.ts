import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AdventurersService, CreateAdventurerInput } from './adventurers.service.js';

class CreateAdventurerDto implements CreateAdventurerInput {
  userId!: string;
  displayName!: string;
  rankCode?: string;
  rankId?: string;
}

@Controller('adventurers')
export class AdventurersController {
  constructor(private readonly adventurersService: AdventurersService) {}

  @Get()
  async listAdventurers() {
    return this.adventurersService.findAll();
  }

  @Post()
  async createAdventurer(@Body() dto: CreateAdventurerDto) {
    return this.adventurersService.create(dto);
  }

  @Get(':id')
  async getAdventurer(@Param('id') id: string) {
    return this.adventurersService.findById(id);
  }

  @Get(':id/credentials')
  async getAdventurerCredentials(@Param('id') id: string) {
    return this.adventurersService.getCredentials(id);
  }
}
