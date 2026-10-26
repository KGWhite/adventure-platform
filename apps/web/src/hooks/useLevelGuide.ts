import { useEffect, useState } from 'react';
import type { LevelGuide } from '../types/progression.js';

/** Level thresholds and skill unlocks shown on idle status and boss screens. */
export function useLevelGuide(): LevelGuide | null {
  const [guide, setGuide] = useState<LevelGuide | null>(null);

  useEffect(() => {
    fetch('/api/v1/status/levels')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LevelGuide | null) => data && setGuide(data))
      .catch(() => {});
  }, []);

  return guide;
}
