export type GameEventType =
  | 'player.scanned'
  | 'battle.started'
  | 'battle.attack'
  | 'battle.damage'
  | 'battle.victory'
  | 'battle.defeat'
  | 'reward.received'
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

export interface PlayerScannedData {
  player: {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    gold: number;
    merit: number;
    credentialValue?: string;
  };
}

export interface BattleStartedData {
  battleId: string;
  player: {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
  };
  boss: {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
  };
}

export interface BattleAttackData {
  battleId: string;
  attacker: 'player' | 'boss';
  attackerName: string;
}

export interface BattleDamageData {
  battleId: string;
  playerDamageDealt: number;
  bossDamageDealt: number;
  playerHp: number;
  playerMaxHp: number;
  bossHp: number;
  bossMaxHp: number;
}

export interface BattleVictoryData {
  battleId: string;
  playerId: string;
  playerName: string;
  bossId: string;
  bossName: string;
}

export interface BattleDefeatData {
  battleId: string;
  playerId: string;
  playerName: string;
  bossId: string;
  bossName: string;
}

export interface RewardReceivedData {
  battleId: string;
  playerId: string;
  playerName: string;
  gold: number;
  merit: number;
  item: string;
}

export interface QuestAcceptedData {
  playerQuestId: string;
  questId: string;
  playerId: string;
  playerName?: string;
  questTitle?: string;
  targetCount: number;
}

export interface QuestProgressUpdatedData {
  playerQuestId: string;
  questId: string;
  playerId: string;
  progress: number;
  targetCount: number;
}

export interface QuestCompletedData {
  playerQuestId: string;
  questId: string;
  playerId: string;
  progress: number;
  targetCount: number;
  bossId?: string;
}

export interface QuestRewardClaimedData {
  playerQuestId: string;
  questId: string;
  playerId: string;
  rewardGold: number;
  rewardMerit: number;
}
