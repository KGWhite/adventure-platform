import { useEffect, useRef, useState } from 'react';
import type { StatusScanResponse } from '../../types/progression.js';
import { sfx } from '../../utils/audioEffects.js';

export type StatusPhase = 'idle' | 'levelup' | 'status';

const IDLE_RESET_MS = 20_000;
const LEVEL_UP_MS = 3_000;
export const NOTICE_MS = 4_000;

export const STATUS_DEMO_CARDS = [
  { name: 'Aria', cred: 'cred-demo-001' },
  { name: 'Leon', cred: 'cred-demo-002' },
  { name: 'Rookie', cred: 'ADV-DEV-001-QR' },
];

// Shows a status scan result: LEVEL UP first when there are new skills, then
// the status page, then back to idle after a while without another scan.
export function useStatusPresenter() {
  const [phase, setPhase] = useState<StatusPhase>('idle');
  const [status, setStatus] = useState<StatusScanResponse | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    [idleTimerRef, phaseTimerRef].forEach((ref) => {
      if (ref.current) clearTimeout(ref.current);
      ref.current = null;
    });
  };

  const backToIdle = () => {
    clearTimers();
    setPhase('idle');
    setStatus(null);
  };

  const present = (result: StatusScanResponse) => {
    clearTimers();
    setStatus(result);
    if (result.leveledUpSinceLastSeen) {
      setPhase('levelup');
      sfx.playVictory();
      phaseTimerRef.current = setTimeout(() => setPhase('status'), LEVEL_UP_MS);
    } else {
      setPhase('status');
    }
    idleTimerRef.current = setTimeout(backToIdle, IDLE_RESET_MS);
  };

  useEffect(() => clearTimers, []);

  return { phase, status, present, backToIdle };
}
