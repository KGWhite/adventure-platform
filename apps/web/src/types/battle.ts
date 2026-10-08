export type BattleStatus = 'active' | 'victory' | 'defeat';

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
  | 'quest.reward_claimed';

export interface GameEvent<T = any> {
  type: GameEventType;
  timestamp: string;
  displayId: string;
  data: T;
}
