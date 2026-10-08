export type PlayerQuestStatus = 'accepted' | 'completed' | 'claimed';

export interface QuestData {
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
  requiredRankId?: string | null;
}

export interface PlayerQuestData {
  id: string;
  playerId: string;
  playerName?: string;
  questId: string;
  quest?: QuestData;
  progress: number;
  targetCount: number;
  status: PlayerQuestStatus;
  acceptedAt: string;
  completedAt: string | null;
  claimedAt: string | null;
}

export class AcceptQuestDto {
  credentialValue?: string;
  playerId?: string;
  questId!: string;
}

export class GuildScanDto {
  credentialValue!: string;
  displayId?: string;
}

export interface GuildScanResult {
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
  activeQuest: PlayerQuestData | null;
  availableQuests: QuestData[];
}

export interface ClaimRewardResult {
  success: boolean;
  playerQuest: PlayerQuestData;
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
