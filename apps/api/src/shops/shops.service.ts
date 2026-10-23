import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AdventurerProfile, Item, Rank, ShopItem } from '@prisma/client';
import { EventsService } from '../events/events.service.js';
import { InventoryService, toItemView } from '../inventory/inventory.service.js';
import type { InventoryView } from '../inventory/inventory.types.js';
import { isUniqueViolation, requireDatabase } from '../prisma/database-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  PurchaseDto,
  PurchaseResult,
  RankView,
  ShopCatalogView,
  ShopItemView,
  ShopLockedReason,
  ShopOfferView,
  ShopPlayerView,
  ShopScanDto,
  ShopScanResult,
} from './shops.types.js';

type PlayerWithRank = AdventurerProfile & { currentRank: Rank };
type ShopItemWithDetails = ShopItem & { item: Item; requiredRank: Rank | null };

function shopError(
  Exception: new (body: object) => HttpException,
  statusCode: number,
  code: string,
  message: string,
): HttpException {
  return new Exception({ statusCode, code, message });
}

function toRankView(rank: Rank): RankView {
  return { code: rank.code, name: rank.name, order: rank.order };
}

function toShopItemView(shopItem: ShopItemWithDetails): ShopItemView {
  const { id, ...item } = toItemView(shopItem.item);
  return {
    itemId: id,
    ...item,
    price: shopItem.price,
    requiredRank: shopItem.requiredRank ? toRankView(shopItem.requiredRank) : null,
  };
}

function toPlayerView(player: PlayerWithRank, inventory: InventoryView): ShopPlayerView {
  return {
    id: player.id,
    name: player.displayName,
    rank: toRankView(player.currentRank),
    gold: player.gold,
    attack: inventory.attack,
    defense: inventory.defense,
  };
}

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly eventsService: EventsService,
  ) {}

  async getShop(shopId: string): Promise<ShopCatalogView> {
    return requireDatabase(async () => {
      const shop = await this.findShopOrThrow(shopId);
      const shopItems = await this.findShopItems(shopId);
      return { id: shop.id, name: shop.name, items: shopItems.map(toShopItemView) };
    });
  }

  async scan(shopId: string, dto: ShopScanDto): Promise<ShopScanResult> {
    const displayId = dto.displayId || shopId;

    return requireDatabase(async () => {
      const shop = await this.findShopOrThrow(shopId);
      const player = await this.resolvePlayer(dto.credentialValue);
      const [shopItems, inventory] = await Promise.all([
        this.findShopItems(shopId),
        this.inventoryService.getInventory(player.id),
      ]);
      const ownedItemIds = new Set(inventory.items.map((entry) => entry.item.id));

      const items: ShopOfferView[] = shopItems.map((shopItem) => {
        const lockedReason = this.getLockedReason(shopItem, player, ownedItemIds);
        return { ...toShopItemView(shopItem), purchasable: lockedReason === null, lockedReason };
      });

      this.eventsService.emitPlayerScanned(displayId, {
        player: {
          id: player.id,
          name: player.displayName,
          level: player.level,
          hp: player.hp,
          maxHp: player.maxHp,
          gold: player.gold,
          merit: player.merit,
        },
      });

      return {
        shop: { id: shop.id, name: shop.name },
        player: toPlayerView(player, inventory),
        equipment: inventory.equipment,
        items,
      };
    });
  }

  async purchase(shopId: string, dto: PurchaseDto): Promise<PurchaseResult> {
    const displayId = dto.displayId || shopId;
    const equip = dto.equip ?? false;

    return requireDatabase(async () => {
      const player = await this.resolvePlayer(dto.credentialValue);

      const replay = await this.findReplay(dto.requestId, shopId, dto.itemId, player);
      if (replay) {
        return replay;
      }

      await this.findShopOrThrow(shopId);
      const shopItem = await this.prisma.shopItem.findUnique({
        where: { shopId_itemId: { shopId, itemId: dto.itemId } },
        include: { item: true, requiredRank: true },
      });
      if (!shopItem || !shopItem.enabled || !shopItem.item.enabled) {
        throw shopError(
          BadRequestException,
          400,
          'ITEM_NOT_AVAILABLE',
          `Item "${dto.itemId}" is not available in this shop`,
        );
      }
      if (this.isRankTooLow(shopItem, player)) {
        throw this.rankRequiredError(shopItem);
      }

      let purchaseId: string;
      try {
        purchaseId = await this.prisma.$transaction(async (tx) => {
          const owned = await tx.playerItem.findUnique({
            where: { playerId_itemId: { playerId: player.id, itemId: shopItem.itemId } },
          });
          if (owned) {
            throw this.alreadyOwnedError(shopItem);
          }

          // Conditional debit: also takes the profile row lock, so concurrent
          // purchases for the same adventurer are serialized from here on.
          const debited = await tx.adventurerProfile.updateMany({
            where: { id: player.id, gold: { gte: shopItem.price } },
            data: { gold: { decrement: shopItem.price } },
          });
          if (debited.count === 0) {
            throw shopError(
              ConflictException,
              409,
              'INSUFFICIENT_GOLD',
              `Not enough gold to buy ${shopItem.item.name} (${shopItem.price} gold)`,
            );
          }

          if (equip) {
            await this.inventoryService.unequipSlot(tx, player.id, shopItem.item.type);
          }
          await tx.playerItem.create({
            data: { playerId: player.id, itemId: shopItem.itemId, equipped: equip },
          });

          const { gold } = await tx.adventurerProfile.findUniqueOrThrow({
            where: { id: player.id },
            select: { gold: true },
          });
          const purchase = await tx.purchase.create({
            data: {
              playerId: player.id,
              shopId,
              itemId: shopItem.itemId,
              price: shopItem.price,
              goldBefore: gold + shopItem.price,
              goldAfter: gold,
              requestId: dto.requestId,
            },
          });
          return purchase.id;
        });
      } catch (error) {
        if (isUniqueViolation(error, 'requestId')) {
          const concurrentReplay = await this.findReplay(dto.requestId, shopId, dto.itemId, player);
          if (concurrentReplay) {
            return concurrentReplay;
          }
        }
        if (isUniqueViolation(error, 'itemId')) {
          throw this.alreadyOwnedError(shopItem);
        }
        throw error;
      }

      const result = await this.buildPurchaseResult(purchaseId);

      this.eventsService.emitShopPurchaseCompleted(displayId, {
        purchaseId,
        shopId,
        playerId: player.id,
        playerName: player.displayName,
        item: {
          id: result.item.id,
          name: result.item.name,
          type: result.item.type,
          attack: result.item.attack,
          defense: result.item.defense,
          iconKey: result.item.iconKey,
        },
        price: result.price,
        goldAfter: result.player.gold,
        equipped: result.equipped,
      });
      if (equip) {
        this.inventoryService.emitEquipmentChanged(
          displayId,
          player.displayName,
          shopItem.item.type,
          await this.inventoryService.getInventory(player.id),
        );
      }

      this.logger.log(
        `${player.displayName} bought ${shopItem.item.name} for ${shopItem.price} gold at ${shopId}`,
      );
      return result;
    });
  }

  private async findReplay(
    requestId: string,
    shopId: string,
    itemId: string,
    player: PlayerWithRank,
  ): Promise<PurchaseResult | null> {
    const existing = await this.prisma.purchase.findUnique({ where: { requestId } });
    if (!existing) {
      return null;
    }
    if (existing.playerId !== player.id || existing.shopId !== shopId || existing.itemId !== itemId) {
      throw shopError(
        ConflictException,
        409,
        'REQUEST_ID_REUSED',
        'This requestId was already used for a different purchase',
      );
    }
    return this.buildPurchaseResult(existing.id);
  }

  private async buildPurchaseResult(purchaseId: string): Promise<PurchaseResult> {
    const purchase = await this.prisma.purchase.findUniqueOrThrow({
      where: { id: purchaseId },
      include: { item: true, player: { include: { currentRank: true } } },
    });
    const inventory = await this.inventoryService.getInventory(purchase.playerId);
    const owned = inventory.items.find((entry) => entry.item.id === purchase.itemId);

    return {
      purchaseId: purchase.id,
      shopId: purchase.shopId,
      price: purchase.price,
      player: toPlayerView(purchase.player, inventory),
      item: toItemView(purchase.item),
      equipped: owned?.equipped ?? false,
      equipment: inventory.equipment,
    };
  }

  private getLockedReason(
    shopItem: ShopItemWithDetails,
    player: PlayerWithRank,
    ownedItemIds: Set<string>,
  ): ShopLockedReason | null {
    if (ownedItemIds.has(shopItem.itemId)) return 'ALREADY_OWNED';
    if (this.isRankTooLow(shopItem, player)) return 'RANK_REQUIRED';
    if (player.gold < shopItem.price) return 'INSUFFICIENT_GOLD';
    return null;
  }

  private isRankTooLow(shopItem: ShopItemWithDetails, player: PlayerWithRank): boolean {
    return Boolean(shopItem.requiredRank && shopItem.requiredRank.order > player.currentRank.order);
  }

  private rankRequiredError(shopItem: ShopItemWithDetails): HttpException {
    return shopError(
      ConflictException,
      409,
      'RANK_REQUIRED',
      `${shopItem.item.name} requires ${shopItem.requiredRank?.name ?? 'a higher rank'}`,
    );
  }

  private alreadyOwnedError(shopItem: ShopItemWithDetails): HttpException {
    return shopError(
      ConflictException,
      409,
      'ALREADY_OWNED',
      `Adventurer already owns ${shopItem.item.name}`,
    );
  }

  private async findShopOrThrow(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || !shop.enabled) {
      throw shopError(NotFoundException, 404, 'SHOP_NOT_FOUND', `Shop "${shopId}" not found`);
    }
    return shop;
  }

  private async findShopItems(shopId: string): Promise<ShopItemWithDetails[]> {
    return this.prisma.shopItem.findMany({
      where: { shopId, enabled: true, item: { enabled: true } },
      include: { item: true, requiredRank: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private async resolvePlayer(credentialValue: string): Promise<PlayerWithRank> {
    const credential = await this.prisma.credential.findUnique({
      where: { value: credentialValue.trim() },
      include: { adventurer: { include: { currentRank: true } } },
    });
    if (!credential) {
      throw shopError(
        NotFoundException,
        404,
        'CREDENTIAL_NOT_FOUND',
        `No adventurer found for credential value '${credentialValue}'`,
      );
    }
    if (!credential.enabled) {
      throw shopError(BadRequestException, 400, 'CREDENTIAL_DISABLED', 'Credential is disabled');
    }
    return credential.adventurer;
  }
}
