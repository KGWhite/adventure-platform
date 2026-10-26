import { useCallback, useEffect, useRef, useState } from 'react';
import { playScanFeedback } from '../utils/scanFeedback.js';

/** Web NFC is only available in Chrome on Android over HTTPS. */
export const isWebNfcSupported = () => typeof window !== 'undefined' && 'NDEFReader' in window;

function decodeRecord(record: any): string | null {
  if (!record?.data) return null;
  if (record.recordType === 'text' || record.recordType === 'url') {
    return new TextDecoder(record.encoding || 'utf-8').decode(record.data).trim();
  }
  return null;
}

/**
 * Continuous Web NFC reading for action cards. Reads the first text or URL
 * NDEF record of each tag; the same payload is ignored within dedupeMs.
 */
export function useNfcScanner(onDetected: (payload: string) => void, dedupeMs = 2000) {
  const [nfcActive, setNfcActive] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastDetectionRef = useRef<{ payload: string; at: number } | null>(null);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  // Stable so callers can release the reader from an effect
  const stopNfc = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setNfcActive(false);
  }, []);

  const startNfc = async () => {
    if (!isWebNfcSupported()) {
      setNfcError('此裝置不支援 Web NFC。');
      return;
    }
    setNfcError(null);
    const controller = new AbortController();
    try {
      const reader = new (window as any).NDEFReader();
      reader.onreading = (event: any) => {
        const payload = (event.message?.records ?? []).map(decodeRecord).find(Boolean);
        if (!payload) return;
        const now = Date.now();
        const last = lastDetectionRef.current;
        if (last && last.payload === payload && now - last.at < dedupeMs) return;
        lastDetectionRef.current = { payload, at: now };
        playScanFeedback();
        onDetectedRef.current(payload);
      };
      reader.onreadingerror = () => setNfcError('無法讀取這張 NFC 卡，請再試一次。');
      await reader.scan({ signal: controller.signal });
      abortRef.current = controller;
      setNfcActive(true);
    } catch (err: any) {
      setNfcError(err?.message || '無法啟動 NFC 讀取。');
      setNfcActive(false);
    }
  };

  useEffect(() => stopNfc, [stopNfc]);

  return { nfcSupported: isWebNfcSupported(), nfcActive, nfcError, startNfc, stopNfc };
}
