import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Credential, CredentialType, Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CreateCredentialInput, CredentialsService, ResolvedPlayer } from './credentials.service.js';

class CreateCredentialDto implements CreateCredentialInput {
  @IsString()
  @IsNotEmpty()
  adventurerId!: string;

  @IsEnum(CredentialType)
  type!: CredentialType;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

class ValidateCredentialDto {
  @IsString()
  @IsNotEmpty()
  value!: string;
}

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  async listCredentials(@Query('adventurerId') adventurerId?: string): Promise<Credential[]> {
    return this.credentialsService.findAll(adventurerId);
  }

  @Post('validate')
  async validateCredential(@Body() dto: ValidateCredentialDto): Promise<ResolvedPlayer> {
    return this.credentialsService.resolvePlayerByCredential(dto.value);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createCredential(@Body() dto: CreateCredentialDto): Promise<Credential> {
    return this.credentialsService.create(dto);
  }

  @Get(':id')
  async getCredential(@Param('id') id: string): Promise<Credential> {
    return this.credentialsService.findById(id);
  }
}
