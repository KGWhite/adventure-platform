import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { STATIONS, type StageState, type StationNodeId } from '../../types/stage.js';
import { apiFetch } from '../../utils/apiFetch.js';
import { BossActorView } from '../actor/BossActorView.js';
import { ShopActorView } from '../actor/ShopActorView.js';
import { GuildCounter } from '../guild/GuildCounter.js';
import { StatusStationControl } from './StatusStationControl.js';
import './StaffConsoleView.css';

function StationControl({ nodeId, active }: { nodeId: StationNodeId; active: boolean }) {
  switch (nodeId) {
    case 'guild-01':
      return (
        <div className="guild-terminal-container staff-embedded-guild">
          <GuildCounter active={active} />
        </div>
      );
    case 'shop-01':
      return <ShopActorView nodeId={nodeId} embedded active={active} />;
    case 'boss-01':
      return <BossActorView nodeId={nodeId} embedded active={active} />;
    case 'status-01':
      return <StatusStationControl nodeId={nodeId} active={active} />;
  }
}

// /staff: one staff member's phone plays every world node. Switching station
// tells the server, which moves the follow-mode /display along with it.
export function StaffConsoleView() {
  const { user, logout } = useAuth();
  const [current, setCurrent] = useState<StationNodeId | null>(null);
  // Stations opened so far stay mounted (hidden) so switching away does not
  // drop their screen state, e.g. a boss battle in progress
  const [visited, setVisited] = useState<StationNodeId[]>([]);
  const [error, setError] = useState<string | null>(null);

  const show = (nodeId: StationNodeId | null) => {
    setCurrent(nodeId);
    if (nodeId) setVisited((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]));
  };

  useEffect(() => {
    fetch('/api/v1/stage')
      .then((res) => (res.ok ? res.json() : null))
      .then((stage: StageState | null) => stage && show(stage.nodeId))
      .catch(() => {});
  }, []);

  const switchStation = async (nodeId: StationNodeId) => {
    setError(null);
    try {
      const res = await apiFetch('/api/v1/stage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `切換崗位失敗 (${res.status})`);
      show((data as StageState).nodeId);
    } catch (err: any) {
      setError(err.message || '切換崗位失敗，請再試一次。');
    }
  };

  return (
    <div className="staff-root">
      <header className="staff-topbar">
        <div className="staff-brand">
          <span className="staff-brand-title">工作人員總控台</span>
          <span className="staff-brand-user">@{user?.username}</span>
        </div>
        <div className="staff-topbar-actions">
          <a href="/display" target="_blank" rel="noreferrer" className="staff-link">
            📺 大螢幕
          </a>
          <button type="button" className="staff-link" onClick={logout}>
            登出
          </button>
        </div>
      </header>

      <nav className="staff-stations" aria-label="崗位">
        {STATIONS.map((station) => (
          <button
            key={station.nodeId}
            type="button"
            className={`staff-station ${current === station.nodeId ? 'active' : ''}`}
            aria-pressed={current === station.nodeId}
            onClick={() => switchStation(station.nodeId)}
          >
            <span className="staff-station-icon">{station.icon}</span>
            <span>{station.label}</span>
          </button>
        ))}
      </nav>

      {error && <div className="staff-alert staff-alert-top">{error}</div>}

      {!current && (
        <div className="staff-empty">
          <div className="staff-empty-icon">🗺️</div>
          <p>請選擇崗位</p>
          <p className="staff-empty-sub">選擇後，大螢幕會同步切到該崗位的畫面</p>
        </div>
      )}

      {visited.map((nodeId) => (
        <div key={nodeId} className="staff-station-view" hidden={nodeId !== current}>
          <StationControl nodeId={nodeId} active={nodeId === current} />
        </div>
      ))}
    </div>
  );
}
