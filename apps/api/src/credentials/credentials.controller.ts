import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Credential, CredentialType } from '@prisma/client';
import { CreateCredentialInput, CredentialsService } from './credentials.service.js';

class CreateCredentialDto implements CreateCredentialInput {
  adventurerId!: string;
  type!: CredentialType;
  value!: string;
  enabled?: boolean;
}

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Get()
  async listCredentials(@Query('adventurerId') adventurerId?: string): Promise<Credential[]> {
    return this.credentialsService.findAll(adventurerId);
  }

  @Post()
  async createCredential(@Body() dto: CreateCredentialDto): Promise<Credential> {
    return this.credentialsService.create(dto);
  }

  @Get(':id')
  async getCredential(@Param('id') id: string): Promise<Credential> {
    return this.credentialsService.findById(id);
  }
}
