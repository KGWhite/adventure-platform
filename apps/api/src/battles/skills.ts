import type { ActionCardType } from '@prisma/client';

/** Time allowed between the first element card and the combining card. */
export const COMBO_WINDOW_MS = 6_000;
/** The same physical card is ignored if re-scanned within this window. */
export const CARD_COOLDOWN_MS = 2_000;
/** HP restored by healing skills, capped at maxHp. */
export const HEAL_AMOUNT = 30;

export type ElementCardType = Exclude<ActionCardType, 'STRIKE'>;

export type SkillId =
  | 'strike'
  | 'element-bolt'
  | 'element-slash'
  | 'fire-tornado'
  | 'steam-burst'
  | 'healing-rain';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  /** Multiplier applied to base damage; 0 means the skill deals no damage. */
  damageMultiplier: number;
  heal: number;
  bossCounters: boolean;
}

export const SKILLS: Record<SkillId, SkillDefinition> = {
  strike: { id: 'strike', name: '普通攻擊', damageMultiplier: 1, heal: 0, bossCounters: true },
  'element-bolt': { id: 'element-bolt', name: '元素彈', damageMultiplier: 1, heal: 0, bossCounters: true },
  'element-slash': { id: 'element-slash', name: '元素斬', damageMultiplier: 1.5, heal: 0, bossCounters: true },
  'fire-tornado': { id: 'fire-tornado', name: '火焰龍捲', damageMultiplier: 2, heal: 0, bossCounters: true },
  'steam-burst': { id: 'steam-burst', name: '蒸氣爆發', damageMultiplier: 1.5, heal: 0, bossCounters: false },
  'healing-rain': { id: 'healing-rain', name: '治癒之雨', damageMultiplier: 0, heal: HEAL_AMOUNT, bossCounters: true },
};

const ELEMENT_COMBOS: Record<string, SkillId> = {
  'FIRE+WIND': 'fire-tornado',
  'FIRE+WATER': 'steam-burst',
  'WATER+WIND': 'healing-rain',
};

export type CardOutcome =
  | { kind: 'charge' }
  | { kind: 'cast'; skill: SkillDefinition }
  | { kind: 'fizzle' };

/**
 * Combines a newly scanned card with the pending element card (if any).
 * The cast slot holds at most one element card while a combo is open.
 */
export function resolveCard(pending: ElementCardType | null, card: ActionCardType): CardOutcome {
  if (!pending) {
    return card === 'STRIKE' ? { kind: 'cast', skill: SKILLS.strike } : { kind: 'charge' };
  }
  if (card === 'STRIKE') {
    return { kind: 'cast', skill: SKILLS['element-slash'] };
  }
  if (card === pending) {
    return { kind: 'fizzle' };
  }
  const key = [pending, card].sort().join('+');
  return { kind: 'cast', skill: SKILLS[ELEMENT_COMBOS[key]] };
}
