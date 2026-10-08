export type BattleStatus = 'active' | 'victory' | 'defeat';

export interface BattleReward {
  gold: number;
  merit: number;
  item: string;
}

export interface BattleTurn {
  playerDamage: number;
  bossDamage: number;
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
  bossHp: number;
  bossMaxHp: number;
  status: BattleStatus;
  startedAt: string;
  endedAt: string | null;
  displayId: string;
  lastTurn: BattleTurn | null;
  reward: BattleReward | null;
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
