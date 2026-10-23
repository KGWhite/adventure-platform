import { sfx } from './audioEffects.js';

const FLASH_CLASS = 'scan-flash';
const FLASH_MS = 200;

let flashTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Immediate local feedback for a decoded card: vibration, sound and a short
 * screen-edge flash. Called before any API request so children see a
 * reaction even on slow networks.
 */
export function playScanFeedback() {
  try {
    navigator.vibrate?.(50);
  } catch {
    // vibration is optional
  }
  sfx.playScan();

  const root = document.body;
  root.classList.remove(FLASH_CLASS);
  // Force reflow so the animation restarts on rapid consecutive scans
  void root.offsetWidth;
  root.classList.add(FLASH_CLASS);
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => root.classList.remove(FLASH_CLASS), FLASH_MS);
}
