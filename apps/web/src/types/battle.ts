import type { LevelUp } from './progression.js';

export type BattleStatus = 'active' | 'victory' | 'defeat';

export type ActionCardKind = 'STRIKE' | 'FIRE' | 'WATER' | 'WIND';

export interface PlayerInfo {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  gold: number;
  merit: number;
  credentialValue?: string;
  credentialType?: string;
}

export interface BossInfo {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attackPower: number;
}

export interface BattleReward {
  gold: number;
  merit: number;
  item: string;
  levelUp?: LevelUp | null;
}

export interface BattleTurn {
  playerDamage: number;
  bossDamage: number;
  heal: number;
  skillId: string | null;
  turnNumber: number;
  timestamp: string;
}

export interface BattleState {
  id: string;
  playerId: string;
  playerName: string;
  bossId: string;
  bossName: string;
  playerHp: number;
  playerMaxHp: number;
  playerAttack: number;
  playerDefense: number;
  playerLevel: number;
  bossHp: number;
  bossMaxHp: number;
  status: BattleStatus;
  startedAt: string;
  endedAt: string | null;
  displayId: string;
  lastTurn: BattleTurn | null;
  reward: BattleReward | null;
  castSlot: { type: ActionCardKind; cardValue: string; scannedAt: string }[];
  comboDeadline: string | null;
}

export interface ActionCardSummary {
  value: string;
  type: ActionCardKind;
  label: string | null;
}

export interface CastSkill {
  id: string;
  name: string;
  damage: number;
  heal: number;
  bossCountered: boolean;
  lockedSkill: { id: string; name: string; requiredLevel: number } | null;
}

export interface PlayCardResponse {
  result: 'charged' | 'cast' | 'fizzled' | 'cooldown';
  skill: CastSkill | null;
  castSlot: { type: ActionCardKind }[];
  comboDeadline: string | null;
  battle: BattleState;
}

export interface CardScannedData {
  battleId: string;
  playerId: string;
  cardType: ActionCardKind;
  castSlot: ActionCardKind[];
  comboDeadline: string | null;
}

export interface SkillCastData {
  battleId: string;
  playerId: string;
  skillId: string;
  skillName: string;
  cards: ActionCardKind[];
  damage: number;
  heal: number;
  bossCountered: boolean;
  lockedSkill: { id: string; name: string; requiredLevel: number } | null;
}

export interface SkillFizzledData {
  battleId: string;
  playerId: string;
  cards: ActionCardKind[];
}

export type GameEventType =
  | 'player.scanned'
  | 'battle.started'
  | 'battle.attack'
  | 'battle.damage'
  | 'battle.victory'
  | 'battle.defeat'
  | 'reward.received'
  | 'connection.established'
  | 'quest.accepted'
  | 'quest.progress_updated'
  | 'quest.completed'
  | 'quest.reward_claimed'
  | 'shop.purchase_completed'
  | 'equipment.changed'
  | 'card.scanned'
  | 'skill.cast'
  | 'skill.fizzled'
  | 'adventurer.level_up'
  | 'stage.changed'
  | 'status.viewed'
  | 'shop.scanned'
  | 'shop.item_previewed'
  | 'guild.scanned'
  | 'station.cleared';

export interface GameEvent<T = any> {
  type: GameEventType;
  timestamp: string;
  displayId: string;
  data: T;
}
