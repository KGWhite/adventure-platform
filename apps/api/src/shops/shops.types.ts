import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import type { EquipmentView, ItemView } from '../inventory/inventory.types.js';

export type ShopLockedReason = 'ALREADY_OWNED' | 'RANK_REQUIRED' | 'INSUFFICIENT_GOLD';

export interface RankView {
  code: string;
  name: string;
  order: number;
}

export interface ShopItemView extends Omit<ItemView, 'id'> {
  itemId: string;
  price: number;
  requiredRank: RankView | null;
}

export interface ShopCatalogView {
  id: string;
  name: string;
  items: ShopItemView[];
}

export interface ShopOfferView extends ShopItemView {
  purchasable: boolean;
  lockedReason: ShopLockedReason | null;
}

export interface ShopPlayerView {
  id: string;
  name: string;
  rank: RankView;
  gold: number;
  attack: number;
  defense: number;
}

export interface ShopScanResult {
  shop: { id: string; name: string };
  player: ShopPlayerView;
  equipment: EquipmentView;
  items: ShopOfferView[];
}

export interface PurchaseResult {
  purchaseId: string;
  shopId: string;
  price: number;
  player: ShopPlayerView;
  item: ItemView;
  equipped: boolean;
  equipment: EquipmentView;
}

export class ShopScanDto {
  @IsString()
  @IsNotEmpty()
  credentialValue!: string;

  @IsOptional()
  @IsString()
  displayId?: string;
}

export class PreviewItemDto {
  // null closes the preview on the shop display
  @ValidateIf((dto: PreviewItemDto) => dto.itemId !== null)
  @IsString()
  @IsNotEmpty()
  itemId!: string | null;

  @IsOptional()
  @IsString()
  displayId?: string;
}

export class PurchaseDto {
  @IsString()
  @IsNotEmpty()
  credentialValue!: string;

  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  requestId!: string;

  @IsOptional()
  @IsBoolean()
  equip?: boolean;

  @IsOptional()
  @IsString()
  displayId?: string;
}
