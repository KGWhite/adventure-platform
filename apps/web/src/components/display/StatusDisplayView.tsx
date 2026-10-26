import { useGameEvents } from '../../hooks/useGameEvents.js';
import { useLevelGuide } from '../../hooks/useLevelGuide.js';
import type { GameEvent } from '../../types/battle.js';
import type { StatusScanResponse } from '../../types/progression.js';
import { StatusScreen } from '../status/StatusScreen.js';
import { useStatusPresenter } from '../status/statusPresenter.js';
import '../status/StatusTerminalView.css';

// Status big screen: mirrors status scans made at this node (the /staff
// status station or the /status kiosk) through `status.viewed` events.
export function StatusDisplayView({ nodeId }: { nodeId?: string } = {}) {
  const displayIdMatch = window.location.pathname.match(/^\/display\/([^/]+)/);
  const displayId = nodeId ?? (displayIdMatch ? displayIdMatch[1] : 'status-01');
  const { phase, status, present } = useStatusPresenter();
  const guide = useLevelGuide();

  useGameEvents(displayId, (event: GameEvent<StatusScanResponse>) => {
    if (event.type === 'status.viewed') present(event.data);
  });

  return (
    <div className="status-root">
      <StatusScreen phase={phase} status={status} guide={guide} />
    </div>
  );
}
