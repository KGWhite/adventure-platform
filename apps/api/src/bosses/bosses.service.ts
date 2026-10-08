import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { BossData } from './bosses.types.js';

const DEFAULT_BOSS: BossData = {
  id: 'boss-01',
  name: 'Black Knight',
  hp: 150,
  maxHp: 150,
  attackPower: 15,
};

@Injectable()
export class BossesService {
  private readonly inMemoryBosses = new Map<string, BossData>([
    [DEFAULT_BOSS.id, { ...DEFAULT_BOSS }],
    ['black-knight', { ...DEFAULT_BOSS, id: 'black-knight' }],
  ]);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<BossData[]> {
    try {
      const dbBosses = await (this.prisma as any).boss?.findMany?.();
      if (dbBosses && dbBosses.length > 0) {
        return dbBosses.map((b: any) => ({
          id: b.id,
          name: b.name,
          hp: b.hp,
          maxHp: b.maxHp,
          attackPower: b.attackPower,
        }));
      }
    } catch {
      // Fallback to in-memory store
    }
    return Array.from(this.inMemoryBosses.values());
  }

  async findById(id: string): Promise<BossData> {
    try {
      const dbBoss = await (this.prisma as any).boss?.findUnique?.({
        where: { id },
      });
      if (dbBoss) {
        return {
          id: dbBoss.id,
          name: dbBoss.name,
          hp: dbBoss.hp,
          maxHp: dbBoss.maxHp,
          attackPower: dbBoss.attackPower,
        };
      }
    } catch {
      // Fallback
    }

    const boss = this.inMemoryBosses.get(id);
    if (!boss) {
      // If requested boss is 'boss-01' or 'black-knight', return default
      if (id === 'boss-01' || id === 'black-knight') {
        return { ...DEFAULT_BOSS, id };
      }
      throw new NotFoundException(`Boss with ID '${id}' not found`);
    }

    return { ...boss };
  }
}
