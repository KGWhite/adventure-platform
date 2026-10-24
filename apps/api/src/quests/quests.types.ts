import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { InventoryView } from '../inventory/inventory.types.js';
import type { LevelUp } from '../progression/levels.js';

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
  @IsOptional()
  @IsString()
  credentialValue?: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsString()
  @IsNotEmpty()
  questId!: string;
}

export class GuildScanDto {
  @IsString()
  @IsNotEmpty()
  credentialValue!: string;

  @IsOptional()
  @IsString()
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
  inventory: InventoryView | null;
}

export interface ClaimRewardResult {
  success: boolean;
  playerQuest: PlayerQuestData;
  reward: {
    gold: number;
    merit: number;
  };
  levelUp: LevelUp | null;
  player: {
    id: string;
    name: string;
    gold: number;
    merit: number;
  };
}
