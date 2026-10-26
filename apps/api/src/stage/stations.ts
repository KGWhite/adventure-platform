// World node stations a staff member can operate from the /staff console.
// The frontend keeps a matching list in apps/web/src/types/stage.ts.
export const STATION_NODE_IDS = ['guild-01', 'shop-01', 'boss-01', 'status-01'] as const;

export type StationNodeId = (typeof STATION_NODE_IDS)[number];

export function isStationNodeId(value: unknown): value is StationNodeId {
  return typeof value === 'string' && (STATION_NODE_IDS as readonly string[]).includes(value);
}
