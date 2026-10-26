import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { EventsService } from '../events/events.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { requireDatabase } from '../prisma/database-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  LEVEL_MERIT_THRESHOLDS,
  type LevelUp,
  allSkills,
  levelForMerit,
  levelProgress,
  skillsUnlockedBetween,
} from './levels.js';
import type { LevelGuide, StatusScanDto, StatusScanResult } from './progression.types.js';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Recomputes the cached level from accumulated merit. Call after merit
   * increases (ideally inside the same transaction). Returns the level up,
   * or null when the level did not change. The conditional update makes
   * concurrent callers report a given level up only once.
   */
  async syncLevel(playerId: string, client: DbClient = this.prisma): Promise<LevelUp | null> {
    const profile = await client.adventurerProfile.findUnique({
      where: { id: playerId },
      select: { merit: true, level: true },
    });
    if (!profile) return null;

    const level = levelForMerit(profile.merit);
    if (level <= profile.level) return null;

    const updated = await client.adventurerProfile.updateMany({
      where: { id: playerId, level: { lt: level } },
      data: { level },
    });
    if (updated.count === 0) return null;

    return { from: profile.level, to: level, unlockedSkills: skillsUnlockedBetween(profile.level, level) };
  }

  emitLevelUp(
    displayId: string,
    player: { id: string; name: string },
    levelUp: LevelUp,
    source: 'BATTLE_VICTORY' | 'QUEST_REWARD',
  ) {
    this.eventsService.emitAdventurerLevelUp(displayId, {
      playerId: player.id,
      playerName: player.name,
      fromLevel: levelUp.from,
      toLevel: levelUp.to,
      unlockedSkills: levelUp.unlockedSkills,
      source,
    });
    this.logger.log(`${player.name} leveled up ${levelUp.from} -> ${levelUp.to}`);
  }

  // Level thresholds and skill unlocks for the idle status and boss screens
  levelGuide(): LevelGuide {
    return {
      levels: LEVEL_MERIT_THRESHOLDS.map((merit, index) => ({ level: index + 1, merit })),
      skills: allSkills(),
    };
  }

  async scanStatus(dto: StatusScanDto): Promise<StatusScanResult> {
    const displayId = dto.displayId || 'status-01';

    return requireDatabase(async () => {
      const credential = await this.prisma.credential.findUnique({
        where: { value: dto.credentialValue.trim() },
        include: { adventurer: { include: { currentRank: true } } },
      });
      if (!credential) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'CREDENTIAL_NOT_FOUND',
          message: `No adventurer found for credential value '${dto.credentialValue}'`,
        });
      }
      if (!credential.enabled) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'CREDENTIAL_DISABLED',
          message: 'Credential is disabled',
        });
      }

      const player = credential.adventurer;
      const progress = levelProgress(player.merit);
      const level = progress.current;
      const lastSeenLevel = Math.min(player.lastSeenLevel, level);

      // Keep the cached level in sync and mark this level as seen
      await this.prisma.adventurerProfile.update({
        where: { id: player.id },
        data: { level: Math.max(level, player.level), lastSeenLevel: level },
      });
      const inventory = await this.inventoryService.getInventory(player.id);

      this.eventsService.emitPlayerScanned(displayId, {
        player: {
          id: player.id,
          name: player.displayName,
          level,
          hp: player.hp,
          maxHp: player.maxHp,
          gold: player.gold,
          merit: player.merit,
        },
      });

      const result: StatusScanResult = {
        player: {
          id: player.id,
          name: player.displayName,
          rank: { code: player.currentRank.code, name: player.currentRank.name },
          gold: player.gold,
          merit: player.merit,
        },
        level: progress,
        skills: allSkills().map((skill) => ({
          ...skill,
          unlocked: skill.requiredLevel <= level,
          isNew: skill.requiredLevel > lastSeenLevel && skill.requiredLevel <= level,
        })),
        equipment: inventory.equipment,
        leveledUpSinceLastSeen: level > lastSeenLevel,
      };

      // Lets the status big screen show the same result as the scanning device
      this.eventsService.emitStatusViewed(displayId, result);
      return result;
    });
  }
}
