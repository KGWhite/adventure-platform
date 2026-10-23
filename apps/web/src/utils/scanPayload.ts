const PLAYER_PREFIX = 'adventure://player/';
const CARD_PREFIX = 'adventure://card/';

export type ScanPayload =
  | { kind: 'player'; value: string }
  | { kind: 'card'; value: string }
  | { kind: 'raw'; value: string };

/** Classifies a scanned QR / NFC payload as an identity card or an action card. */
export function parseScanPayload(raw: string): ScanPayload {
  const value = raw.trim();
  if (value.startsWith(PLAYER_PREFIX)) {
    return { kind: 'player', value: value.slice(PLAYER_PREFIX.length) };
  }
  if (value.startsWith(CARD_PREFIX)) {
    return { kind: 'card', value: value.slice(CARD_PREFIX.length) };
  }
  return { kind: 'raw', value };
}

export const WRONG_CARD_FOR_IDENTITY = '這是行動卡，請出示冒險者卡。';
export const WRONG_CARD_FOR_ACTION = '這是冒險者卡，請刷行動卡。';
