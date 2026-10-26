import type { SkillCardHint } from '../types/progression.js';

// Card pattern icons for skills; ELEMENT means any one of Fire / Water / Wind
export const SKILL_CARD_ICONS: Record<SkillCardHint, string> = {
  STRIKE: '⚔️',
  FIRE: '🔥',
  WATER: '💧',
  WIND: '🌪️',
  ELEMENT: '✨',
};
