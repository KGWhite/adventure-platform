import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Credential, CredentialType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CreateCredentialInput {
  adventurerId: string;
  type: CredentialType;
  value: string;
  enabled?: boolean;
}

@Injectable()
export class CredentialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(adventurerId?: string): Promise<Credential[]> {
    return this.prisma.credential.findMany({
      where: adventurerId ? { adventurerId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Credential> {
    const cred = await this.prisma.credential.findUnique({
      where: { id },
    });
    if (!cred) {
      throw new NotFoundException(`Credential with ID '${id}' not found`);
    }
    return cred;
  }

  async findByValue(value: string): Promise<Credential | null> {
    return this.prisma.credential.findUnique({
      where: { value },
    });
  }

  async create(input: CreateCredentialInput): Promise<Credential> {
    // 1. Verify adventurer exists
    const adventurer = await this.prisma.adventurerProfile.findUnique({
      where: { id: input.adventurerId },
    });
    if (!adventurer) {
      throw new NotFoundException(`Adventurer with ID '${input.adventurerId}' does not exist`);
    }

    // 2. Verify value uniqueness
    const existing = await this.prisma.credential.findUnique({
      where: { value: input.value },
    });
    if (existing) {
      throw new ConflictException(`Credential with value '${input.value}' already exists`);
    }

    return this.prisma.credential.create({
      data: {
        adventurerId: input.adventurerId,
        type: input.type,
        value: input.value,
        enabled: input.enabled ?? true,
      },
    });
  }
}
