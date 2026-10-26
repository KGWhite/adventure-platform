import { useCallback, useEffect, useState } from 'react';
import { useGameEvents } from '../../hooks/useGameEvents.js';
import type { GameEvent } from '../../types/battle.js';
import { STATIONS, type StageChangedData, type StageState, type StationNodeId } from '../../types/stage.js';
import { BossDisplayView } from './BossDisplayView.js';
import { GuildDisplayView } from './GuildDisplayView.js';
import { ShopDisplayView } from './ShopDisplayView.js';
import { StatusDisplayView } from './StatusDisplayView.js';
import './FollowDisplayView.css';

function StationDisplay({ nodeId }: { nodeId: StationNodeId }) {
  switch (nodeId) {
    case 'guild-01':
      return <GuildDisplayView nodeId={nodeId} />;
    case 'shop-01':
      return <ShopDisplayView nodeId={nodeId} />;
    case 'boss-01':
      return <BossDisplayView nodeId={nodeId} />;
    case 'status-01':
      return <StatusDisplayView nodeId={nodeId} />;
  }
}

// /display: the big screen follows the station the /staff phone is operating.
// The server holds the current station; this screen asks for it on load and
// after every reconnect, and switches on `stage.changed`.
export function FollowDisplayView() {
  const [nodeId, setNodeIdValue] = useState<StationNodeId | null>(null);
  // Station screens shown so far stay mounted (hidden) and keep following
  // their node's events, so switching back shows e.g. a battle in progress
  const [visited, setVisited] = useState<StationNodeId[]>([]);

  const setNodeId = useCallback((next: StationNodeId | null) => {
    setNodeIdValue(next);
    if (next) setVisited((prev) => (prev.includes(next) ? prev : [...prev, next]));
  }, []);

  const refresh = useCallback(() => {
    fetch('/api/v1/stage')
      .then((res) => (res.ok ? res.json() : null))
      .then((stage: StageState | null) => stage && setNodeId(stage.nodeId))
      .catch(() => {});
  }, [setNodeId]);

  // `stage.changed` is broadcast to every display, so a fixed channel is enough
  const { connected } = useGameEvents('stage', (event: GameEvent<StageChangedData>) => {
    if (event.type === 'stage.changed') setNodeId(event.data.nodeId);
  });

  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);

  return (
    <>
      {visited.map((visitedId) => (
        <div key={visitedId} hidden={visitedId !== nodeId}>
          <StationDisplay nodeId={visitedId} />
        </div>
      ))}
      {!nodeId && <FollowIdleScreen connected={connected} />}
    </>
  );
}

function FollowIdleScreen({ connected }: { connected: boolean }) {
  return (
    <div className="follow-idle-root">
      <div className="follow-idle-crest">🗺️</div>
      <h1 className="follow-idle-title">冒險者世界</h1>
      <p className="follow-idle-sub">冒險即將開始⋯⋯</p>
      <div className="follow-idle-stations">
        {STATIONS.map((station) => (
          <span key={station.nodeId}>
            {station.icon} {station.label}
          </span>
        ))}
      </div>
      <span className={`follow-idle-pill ${connected ? 'online' : 'offline'}`}>
        {connected ? '● 已連線' : '○ 連線中⋯'}
      </span>
    </div>
  );
}
