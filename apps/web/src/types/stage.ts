// World node stations the /staff console can operate. Keep in sync with
// apps/api/src/stage/stations.ts.
export const STATIONS = [
  { nodeId: 'guild-01', icon: '🏛', label: '公會' },
  { nodeId: 'shop-01', icon: '🏪', label: '商店' },
  { nodeId: 'boss-01', icon: '⚔️', label: 'Boss' },
  { nodeId: 'status-01', icon: '🛡️', label: '狀態' },
] as const;

export type StationNodeId = (typeof STATIONS)[number]['nodeId'];

export interface StageState {
  nodeId: StationNodeId | null;
  updatedAt: string;
}

export interface StageChangedData {
  nodeId: StationNodeId | null;
  previousNodeId: StationNodeId | null;
}
