import type { ActionCardType } from '@prisma/client';
import type { SkillId } from './skills.js';

export type BattleStatus = 'active' | 'victory' | 'defeat';

export interface BattleReward {
  gold: number;
  merit: number;
  item: string;
}

export interface BattleTurn {
  playerDamage: number;
  bossDamage: number;
  heal: number;
  skillId: SkillId | null;
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
  bossHp: number;
  bossMaxHp: number;
  status: BattleStatus;
  startedAt: string;
  endedAt: string | null;
  displayId: string;
  lastTurn: BattleTurn | null;
  reward: BattleReward | null;
  castSlot: CastSlotEntry[];
  comboDeadline: string | null;
}

export interface CastSlotEntry {
  type: ActionCardType;
  cardValue: string;
  scannedAt: string;
}

export type CardPlayResult = 'charged' | 'cast' | 'fizzled' | 'cooldown';

export interface CastSkillView {
  id: SkillId;
  name: string;
  damage: number;
  heal: number;
  bossCountered: boolean;
}

export interface PlayCardResponse {
  result: CardPlayResult;
  skill: CastSkillView | null;
  castSlot: { type: ActionCardType }[];
  comboDeadline: string | null;
  battle: BattleState;
}

export interface CreateBattleInput {
  credentialValue: string;
  bossId: string;
  displayId?: string;
}

export interface ScanPlayerInput {
  credentialValue: string;
  displayId?: string;
}
