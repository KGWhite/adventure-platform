export type EquipmentSlot = 'WEAPON' | 'ARMOR';

export interface Item {
  id: string;
  name: string;
  description: string | null;
  type: EquipmentSlot;
  attack: number;
  defense: number;
  iconKey: string | null;
}

export interface PlayerItem {
  playerItemId: string;
  equipped: boolean;
  acquiredAt: string;
  item: Item;
}

export type Equipment = Record<EquipmentSlot, PlayerItem | null>;

export interface Inventory {
  playerId: string;
  equipment: Equipment;
  items: PlayerItem[];
  attack: number;
  defense: number;
}

export interface RankSummary {
  code: string;
  name: string;
  order: number;
}

export type ShopLockedReason = 'ALREADY_OWNED' | 'RANK_REQUIRED' | 'INSUFFICIENT_GOLD';

export interface ShopItem extends Omit<Item, 'id'> {
  itemId: string;
  price: number;
  requiredRank: RankSummary | null;
}

export interface ShopOffer extends ShopItem {
  purchasable: boolean;
  lockedReason: ShopLockedReason | null;
}

export interface ShopCatalog {
  id: string;
  name: string;
  items: ShopItem[];
}

export interface ShopPlayer {
  id: string;
  name: string;
  rank: RankSummary;
  gold: number;
  attack: number;
  defense: number;
}

export interface ShopScanResponse {
  shop: { id: string; name: string };
  player: ShopPlayer;
  equipment: Equipment;
  items: ShopOffer[];
}

export interface PurchaseResponse {
  purchaseId: string;
  shopId: string;
  price: number;
  player: ShopPlayer;
  item: Item;
  equipped: boolean;
  equipment: Equipment;
}

export interface ShopPurchaseCompletedData {
  purchaseId: string;
  shopId: string;
  playerId: string;
  playerName: string;
  item: Omit<Item, 'description'>;
  price: number;
  goldAfter: number;
  equipped: boolean;
}

export interface EquipmentChangedData {
  playerId: string;
  playerName: string;
  slot: EquipmentSlot;
  equippedItem: { id: string; name: string } | null;
  attack: number;
  defense: number;
}

export interface ShopItemPreviewedData {
  shopId: string;
  // null when the shopkeeper closes the confirmation
  itemId: string | null;
}
