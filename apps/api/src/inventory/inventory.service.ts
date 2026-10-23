import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Item, PlayerItem, Prisma } from '@prisma/client';
import { EventsService } from '../events/events.service.js';
import { requireDatabase } from '../prisma/database-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EQUIPMENT_SLOTS,
  type EquipmentSlot,
  type EquipmentStats,
  type InventoryView,
  type ItemView,
  type PlayerItemView,
} from './inventory.types.js';

type DbClient = PrismaService | Prisma.TransactionClient;

export function toItemView(item: Item): ItemView {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    type: item.type,
    attack: item.attack,
    defense: item.defense,
    iconKey: item.iconKey,
  };
}

function toPlayerItemView(playerItem: PlayerItem & { item: Item }): PlayerItemView {
  return {
    playerItemId: playerItem.id,
    equipped: playerItem.equipped,
    acquiredAt: playerItem.acquiredAt.toISOString(),
    item: toItemView(playerItem.item),
  };
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async getInventory(playerId: string, client: DbClient = this.prisma): Promise<InventoryView> {
    const playerItems = await client.playerItem.findMany({
      where: { playerId },
      include: { item: true },
      orderBy: { acquiredAt: 'asc' },
    });

    const items = playerItems.map(toPlayerItemView);
    const equipment: InventoryView['equipment'] = { WEAPON: null, ARMOR: null };
    let attack = 0;
    let defense = 0;

    for (const entry of items) {
      if (!entry.equipped) continue;
      equipment[entry.item.type] = entry;
      attack += entry.item.attack;
      defense += entry.item.defense;
    }

    return { playerId, equipment, items, attack, defense };
  }

  async getPlayerInventory(playerId: string): Promise<InventoryView> {
    return requireDatabase(async () => {
      await this.findPlayerOrThrow(playerId);
      return this.getInventory(playerId);
    });
  }

  async getEquipmentStats(playerId: string): Promise<EquipmentStats> {
    const { attack, defense } = await this.getInventory(playerId);
    return { attack, defense };
  }

  /**
   * Serializes equipment changes for one player by locking the profile row
   * until the surrounding transaction ends.
   */
  async lockPlayer(tx: Prisma.TransactionClient, playerId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM adventurer_profiles WHERE id = ${playerId} FOR UPDATE`;
  }

  async unequipSlot(
    tx: Prisma.TransactionClient,
    playerId: string,
    slot: EquipmentSlot,
  ): Promise<void> {
    await tx.playerItem.updateMany({
      where: { playerId, equipped: true, item: { type: slot } },
      data: { equipped: false },
    });
  }

  async equip(playerId: string, playerItemId: string, displayId = 'guild-01'): Promise<InventoryView> {
    return requireDatabase(async () => {
      const player = await this.findPlayerOrThrow(playerId);

      const { inventory, item } = await this.prisma.$transaction(async (tx) => {
        await this.lockPlayer(tx, playerId);
        const playerItem = await tx.playerItem.findUnique({
          where: { id: playerItemId },
          include: { item: true },
        });
        if (!playerItem || playerItem.playerId !== playerId) {
          throw new NotFoundException({
            statusCode: 404,
            code: 'PLAYER_ITEM_NOT_FOUND',
            message: `Item "${playerItemId}" is not in this adventurer's inventory`,
          });
        }

        await this.unequipSlot(tx, playerId, playerItem.item.type);
        await tx.playerItem.update({ where: { id: playerItemId }, data: { equipped: true } });
        return { inventory: await this.getInventory(playerId, tx), item: playerItem.item };
      });

      this.emitEquipmentChanged(displayId, player.displayName, item.type, inventory);
      this.logger.log(`${player.displayName} equipped ${item.name} (${item.type})`);
      return inventory;
    });
  }

  async unequip(playerId: string, slot: string, displayId = 'guild-01'): Promise<InventoryView> {
    if (!EQUIPMENT_SLOTS.includes(slot as EquipmentSlot)) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_SLOT',
        message: `Slot must be one of: ${EQUIPMENT_SLOTS.join(', ')}`,
      });
    }
    const equipmentSlot = slot as EquipmentSlot;

    return requireDatabase(async () => {
      const player = await this.findPlayerOrThrow(playerId);
      const before = await this.getInventory(playerId);
      if (!before.equipment[equipmentSlot]) {
        return before;
      }

      const inventory = await this.prisma.$transaction(async (tx) => {
        await this.lockPlayer(tx, playerId);
        await this.unequipSlot(tx, playerId, equipmentSlot);
        return this.getInventory(playerId, tx);
      });

      this.emitEquipmentChanged(displayId, player.displayName, equipmentSlot, inventory);
      return inventory;
    });
  }

  emitEquipmentChanged(
    displayId: string,
    playerName: string,
    slot: EquipmentSlot,
    inventory: InventoryView,
  ) {
    const equipped = inventory.equipment[slot];
    this.eventsService.emitEquipmentChanged(displayId, {
      playerId: inventory.playerId,
      playerName,
      slot,
      equippedItem: equipped ? { id: equipped.item.id, name: equipped.item.name } : null,
      attack: inventory.attack,
      defense: inventory.defense,
    });
  }

  private async findPlayerOrThrow(playerId: string) {
    const player = await this.prisma.adventurerProfile.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'PLAYER_NOT_FOUND',
        message: `Adventurer "${playerId}" not found`,
      });
    }
    return player;
  }
}
