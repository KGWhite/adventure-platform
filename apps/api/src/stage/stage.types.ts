import { IsIn, ValidateIf } from 'class-validator';
import { STATION_NODE_IDS, type StationNodeId } from './stations.js';

export class SetStageDto {
  // null returns the follow-mode display to its idle screen
  @ValidateIf((dto: SetStageDto) => dto.nodeId !== null)
  @IsIn(STATION_NODE_IDS)
  nodeId!: StationNodeId | null;
}

export class ClearStationDto {
  @IsIn(STATION_NODE_IDS)
  nodeId!: StationNodeId;
}

export interface StageState {
  nodeId: StationNodeId | null;
  updatedAt: string;
}
