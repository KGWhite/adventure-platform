import { SKILLS, type SkillId } from '../battles/skills.js';

/** Accumulated merit required for each level; index 0 is Lv1. */
export const LEVEL_MERIT_THRESHOLDS = [0, 20, 50, 100, 160] as const;

export const MAX_LEVEL = LEVEL_MERIT_THRESHOLDS.length;

/** Level at which each action card skill is learned. */
export const SKILL_REQUIRED_LEVEL: Record<SkillId, number> = {
  strike: 1,
  'element-bolt': 1,
  'element-slash': 2,
  'fire-tornado': 3,
  'healing-rain': 4,
  'steam-burst': 5,
};

/** Card pattern shown to kids; ELEMENT means any one of Fire / Water / Wind. */
export type SkillCardHint = 'STRIKE' | 'FIRE' | 'WATER' | 'WIND' | 'ELEMENT';

export const SKILL_CARDS: Record<SkillId, SkillCardHint[]> = {
  strike: ['STRIKE'],
  'element-bolt': ['ELEMENT'],
  'element-slash': ['ELEMENT', 'STRIKE'],
  'fire-tornado': ['FIRE', 'WIND'],
  'healing-rain': ['WATER', 'WIND'],
  'steam-burst': ['FIRE', 'WATER'],
};

export interface SkillSummary {
  id: SkillId;
  name: string;
  cards: SkillCardHint[];
  requiredLevel: number;
}

export interface LevelUp {
  from: number;
  to: number;
  unlockedSkills: SkillSummary[];
}

export function levelForMerit(merit: number): number {
  let level = 1;
  LEVEL_MERIT_THRESHOLDS.forEach((threshold, index) => {
    if (merit >= threshold) level = index + 1;
  });
  return level;
}

export function isSkillUnlocked(skillId: SkillId, level: number): boolean {
  return SKILL_REQUIRED_LEVEL[skillId] <= level;
}

/** All skills ordered by unlock level. */
export function allSkills(): SkillSummary[] {
  return (Object.keys(SKILL_REQUIRED_LEVEL) as SkillId[])
    .map((id) => ({
      id,
      name: SKILLS[id].name,
      cards: SKILL_CARDS[id],
      requiredLevel: SKILL_REQUIRED_LEVEL[id],
    }))
    .sort((a, b) => a.requiredLevel - b.requiredLevel);
}

/** Skills learned when moving from one level to a higher one. */
export function skillsUnlockedBetween(fromLevel: number, toLevel: number): SkillSummary[] {
  return allSkills().filter(
    (skill) => skill.requiredLevel > fromLevel && skill.requiredLevel <= toLevel,
  );
}

export function levelProgress(merit: number) {
  const current = levelForMerit(merit);
  const currentLevelMerit = LEVEL_MERIT_THRESHOLDS[current - 1];
  const nextLevelMerit = current < MAX_LEVEL ? LEVEL_MERIT_THRESHOLDS[current] : null;
  return {
    current,
    max: MAX_LEVEL,
    merit,
    currentLevelMerit,
    nextLevelMerit,
    meritToNext: nextLevelMerit === null ? null : nextLevelMerit - merit,
  };
}
