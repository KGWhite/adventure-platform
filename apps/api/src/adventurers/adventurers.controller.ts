import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AdventurersService, CreateAdventurerInput } from './adventurers.service.js';

class CreateAdventurerDto implements CreateAdventurerInput {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  rankCode?: string;

  @IsOptional()
  @IsString()
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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
