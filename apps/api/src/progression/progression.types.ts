import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { EquipmentView } from '../inventory/inventory.types.js';
import type { SkillSummary, levelProgress } from './levels.js';

export class StatusScanDto {
  @IsString()
  @IsNotEmpty()
  credentialValue!: string;

  @IsOptional()
  @IsString()
  displayId?: string;
}

export interface StatusSkillView extends SkillSummary {
  unlocked: boolean;
  isNew: boolean;
}

export interface StatusScanResult {
  player: {
    id: string;
    name: string;
    rank: { code: string; name: string };
    gold: number;
    merit: number;
  };
  level: ReturnType<typeof levelProgress>;
  skills: StatusSkillView[];
  equipment: EquipmentView;
  leveledUpSinceLastSeen: boolean;
}
