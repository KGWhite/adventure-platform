import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export type EquipmentSlot = 'WEAPON' | 'ARMOR';

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ['WEAPON', 'ARMOR'];

export interface ItemView {
  id: string;
  name: string;
  description: string | null;
  type: EquipmentSlot;
  attack: number;
  defense: number;
  iconKey: string | null;
}

export interface PlayerItemView {
  playerItemId: string;
  equipped: boolean;
  acquiredAt: string;
  item: ItemView;
}

export type EquipmentView = Record<EquipmentSlot, PlayerItemView | null>;

export interface EquipmentStats {
  attack: number;
  defense: number;
}

export interface InventoryView extends EquipmentStats {
  playerId: string;
  equipment: EquipmentView;
  items: PlayerItemView[];
}

export class EquipItemDto {
  @IsString()
  @IsNotEmpty()
  playerItemId!: string;

  @IsOptional()
  @IsString()
  displayId?: string;
}
