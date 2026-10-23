import type { EquipmentSlot } from '../types/shop.js';

const ICONS: Record<string, string> = {
  'sword-wood': '🗡️',
  'sword-iron': '⚔️',
  'armor-leather': '🦺',
  'armor-chain': '🛡️',
};

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  WEAPON: '⚔️',
  ARMOR: '🛡️',
};

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  WEAPON: '武器',
  ARMOR: '防具',
};

export function itemIcon(iconKey: string | null, type: EquipmentSlot): string {
  return (iconKey && ICONS[iconKey]) || SLOT_ICONS[type];
}

export function itemStatLabel(item: { attack: number; defense: number }): string {
  const parts = [];
  if (item.attack) parts.push(`ATK +${item.attack}`);
  if (item.defense) parts.push(`DEF +${item.defense}`);
  return parts.join(' · ');
}
