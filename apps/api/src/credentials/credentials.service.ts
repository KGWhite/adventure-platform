import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Credential, CredentialType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CreateCredentialInput {
  adventurerId: string;
  type: CredentialType;
  value: string;
  enabled?: boolean;
}

export interface ResolvedPlayer {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  gold: number;
  merit: number;
  credentialValue: string;
  credentialType: string;
}

// In-memory fallback players for dev & testing
const DEMO_PLAYERS: Record<string, ResolvedPlayer> = {
  'cred-demo-001': {
    id: 'adv-aria',
    name: 'Aria',
    level: 1,
    hp: 100,
    maxHp: 100,
    gold: 50,
    merit: 20,
    credentialValue: 'cred-demo-001',
    credentialType: 'QRCODE',
  },
  'cred-demo-002': {
    id: 'adv-leon',
    name: 'Leon',
    level: 2,
    hp: 120,
    maxHp: 120,
    gold: 100,
    merit: 50,
    credentialValue: 'cred-demo-002',
    credentialType: 'QRCODE',
  },
  'ADV-DEV-001-QR': {
    id: 'adv-rookie',
    name: 'Rookie Adventurer',
    level: 1,
    hp: 100,
    maxHp: 100,
    gold: 0,
    merit: 0,
    credentialValue: 'ADV-DEV-001-QR',
    credentialType: 'QRCODE',
  },
};

@Injectable()
export class CredentialsService {
  private readonly inMemoryPlayers = new Map<string, ResolvedPlayer>(
    Object.entries(DEMO_PLAYERS),
  );

  constructor(private readonly prisma: PrismaService) {}

  async findAll(adventurerId?: string): Promise<Credential[]> {
    try {
      return await this.prisma.credential.findMany({
        where: adventurerId ? { adventurerId } : undefined,
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return [];
    }
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
    try {
      return await this.prisma.credential.findUnique({
        where: { value },
      });
    } catch {
      return null;
    }
  }

  async resolvePlayerByCredential(credentialValue: string): Promise<ResolvedPlayer> {
    const trimmed = credentialValue.trim();

    try {
      const cred = await this.prisma.credential.findUnique({
        where: { value: trimmed },
        include: {
          adventurer: true,
        },
      });

      if (cred && cred.adventurer) {
        if (!cred.enabled) {
          throw new BadRequestException('Credential is disabled');
        }
        const adv = cred.adventurer as any;
        return {
          id: adv.id,
          name: adv.displayName,
          level: adv.level ?? 1,
          hp: adv.hp ?? 100,
          maxHp: adv.maxHp ?? 100,
          gold: adv.gold ?? 0,
          merit: adv.merit ?? 0,
          credentialValue: cred.value,
          credentialType: cred.type,
        };
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      // Database not connected or error -> check fallback
    }

    const fallback = this.inMemoryPlayers.get(trimmed);
    if (fallback) {
      return { ...fallback };
    }

    throw new NotFoundException(`No adventurer found for credential value '${credentialValue}'`);
  }

  updateInMemoryPlayerRewards(playerId: string, goldDelta: number, meritDelta: number) {
    for (const player of this.inMemoryPlayers.values()) {
      if (player.id === playerId) {
        player.gold += goldDelta;
        player.merit += meritDelta;
        break;
      }
    }
  }

  async create(input: CreateCredentialInput): Promise<Credential> {
    const adventurer = await this.prisma.adventurerProfile.findUnique({
      where: { id: input.adventurerId },
    });
    if (!adventurer) {
      throw new NotFoundException(`Adventurer with ID '${input.adventurerId}' does not exist`);
    }

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
