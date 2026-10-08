export type PlayerQuestStatus = 'accepted' | 'completed' | 'claimed';

export interface Quest {
  id: string;
  name: string;
  title: string;
  description: string;
  objectiveType: 'defeat_boss';
  targetId: string;
  targetCount: number;
  rewardGold: number;
  rewardMerit: number;
  enabled: boolean;
}

export interface PlayerQuest {
  id: string;
  playerId: string;
  playerName?: string;
  questId: string;
  quest?: Quest;
  progress: number;
  targetCount: number;
  status: PlayerQuestStatus;
  acceptedAt: string;
  completedAt: string | null;
  claimedAt: string | null;
}

export interface GuildScanResponse {
  player: {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    gold: number;
    merit: number;
    rank: string;
    credentialValue?: string;
  };
  activeQuest: PlayerQuest | null;
  availableQuests: Quest[];
}

export interface ClaimRewardResponse {
  success: boolean;
  playerQuest: PlayerQuest;
  reward: {
    gold: number;
    merit: number;
  };
  player: {
    id: string;
    name: string;
    gold: number;
    merit: number;
  };
}
