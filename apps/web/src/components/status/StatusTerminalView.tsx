import { useEffect, useRef, useState } from 'react';
import { useNfcScanner } from '../../hooks/useNfcScanner.js';
import { useQrScanner } from '../../hooks/useQrScanner.js';
import type { StatusScanResponse } from '../../types/progression.js';
import { playScanFeedback } from '../../utils/scanFeedback.js';
import { WRONG_CARD_FOR_IDENTITY, parseScanPayload } from '../../utils/scanPayload.js';
import { StatusScreen } from './StatusScreen.js';
import { NOTICE_MS, STATUS_DEMO_CARDS, useStatusPresenter } from './statusPresenter.js';
import './StatusTerminalView.css';

export function StatusTerminalView() {
  const displayIdMatch = window.location.pathname.match(/^\/status\/([^/]+)/);
  const displayId = displayIdMatch ? displayIdMatch[1] : 'status-01';

  const { phase, status, present } = useStatusPresenter();
  const [notice, setNotice] = useState<string | null>(null);
  const [showDevCards, setShowDevCards] = useState(false);

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };

  useEffect(
    () => () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    },
    [],
  );

  const scanCard = async (credentialValue: string) => {
    try {
      const res = await fetch('/api/v1/status/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialValue, displayId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `讀取失敗 (${res.status})`);

      setNotice(null);
      present(data as StatusScanResponse);
    } catch (err: any) {
      showNotice(err.message || '讀取失敗，請再刷一次。');
    }
  };

  const handlePayload = (raw: string) => {
    const payload = parseScanPayload(raw);
    if (payload.kind === 'card') {
      showNotice(WRONG_CARD_FOR_IDENTITY);
      return;
    }
    scanCard(payload.value);
  };

  const { videoRef, cameraActive, cameraError, startCamera } = useQrScanner(handlePayload, {
    continuous: true,
    dedupeMs: 3000,
  });
  const { nfcSupported, nfcActive, startNfc } = useNfcScanner(handlePayload, 3000);

  return (
    <div className="status-root">
      {notice && <div className="status-notice">{notice}</div>}

      <StatusScreen phase={phase} status={status} />

      <footer className="status-footer">
        {!cameraActive && (
          <button type="button" className="status-footer-btn" onClick={startCamera}>
            📷 啟動掃描
          </button>
        )}
        {nfcSupported && !nfcActive && (
          <button type="button" className="status-footer-btn" onClick={startNfc}>
            📶 啟用 NFC
          </button>
        )}
        {cameraError && <span className="status-footer-error">{cameraError}</span>}
        <button type="button" className="status-footer-link" onClick={() => setShowDevCards(!showDevCards)}>
          測試卡
        </button>
        {showDevCards &&
          STATUS_DEMO_CARDS.map((card) => (
            <button
              key={card.cred}
              type="button"
              className="status-footer-btn"
              onClick={() => {
                playScanFeedback();
                scanCard(card.cred);
              }}
            >
              {card.name}
            </button>
          ))}
        {cameraActive && <video ref={videoRef} playsInline muted autoPlay className="status-camera-preview" />}
      </footer>
    </div>
  );
}
