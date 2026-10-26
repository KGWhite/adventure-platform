import type { Equipment } from './shop.js';

export type SkillCardHint = 'STRIKE' | 'FIRE' | 'WATER' | 'WIND' | 'ELEMENT';

export interface SkillSummary {
  id: string;
  name: string;
  cards: SkillCardHint[];
  requiredLevel: number;
}

export interface LevelGuide {
  levels: { level: number; merit: number }[];
  skills: SkillSummary[];
}

export interface StatusSkill extends SkillSummary {
  unlocked: boolean;
  isNew: boolean;
}

export interface LevelProgress {
  current: number;
  max: number;
  merit: number;
  currentLevelMerit: number;
  nextLevelMerit: number | null;
  meritToNext: number | null;
}

export interface StatusScanResponse {
  player: {
    id: string;
    name: string;
    rank: { code: string; name: string };
    gold: number;
    merit: number;
  };
  level: LevelProgress;
  skills: StatusSkill[];
  equipment: Equipment;
  leveledUpSinceLastSeen: boolean;
}

export interface LevelUp {
  from: number;
  to: number;
  unlockedSkills: SkillSummary[];
}

export interface AdventurerLevelUpData {
  playerId: string;
  playerName: string;
  fromLevel: number;
  toLevel: number;
  unlockedSkills: SkillSummary[];
  source: 'BATTLE_VICTORY' | 'QUEST_REWARD';
}
