import { useState } from 'react';
import { useNfcScanner } from '../../hooks/useNfcScanner.js';
import { useQrScanner } from '../../hooks/useQrScanner.js';
import type { StatusScanResponse } from '../../types/progression.js';
import { playScanFeedback } from '../../utils/scanFeedback.js';
import { WRONG_CARD_FOR_IDENTITY, parseScanPayload } from '../../utils/scanPayload.js';
import { STATUS_DEMO_CARDS } from '../status/statusPresenter.js';

// Status station on the staff phone: scan a card and show a compact summary;
// the big screen shows the full status page through `status.viewed`.
export function StatusStationControl({ nodeId }: { nodeId: string }) {
  const [status, setStatus] = useState<StatusScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const scanCard = async (credentialValue: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/status/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialValue, displayId: nodeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `讀取失敗 (${res.status})`);
      setStatus(data as StatusScanResponse);
    } catch (err: any) {
      setError(err.message || '讀取失敗，請再刷一次。');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayload = (raw: string) => {
    const payload = parseScanPayload(raw);
    if (payload.kind === 'card') {
      setError(WRONG_CARD_FOR_IDENTITY);
      return;
    }
    scanCard(payload.value);
  };

  const { videoRef, cameraActive, cameraError, startCamera, stopCamera } = useQrScanner(handlePayload, {
    continuous: true,
    dedupeMs: 3000,
  });
  const { nfcSupported, nfcActive, startNfc } = useNfcScanner(handlePayload, 3000);

  const newSkills = status?.skills.filter((skill) => skill.isNew) ?? [];

  return (
    <div className="staff-status">
      <section className="staff-panel">
        <h2 className="staff-panel-title">🛡️ 刷卡查看等級與技能</h2>
        <div className="staff-scan-actions">
          {cameraActive ? (
            <button type="button" className="staff-btn" onClick={stopCamera}>
              ⏹ 關閉相機
            </button>
          ) : (
            <button type="button" className="staff-btn" onClick={startCamera}>
              📷 相機掃描
            </button>
          )}
          {nfcSupported && !nfcActive && (
            <button type="button" className="staff-btn" onClick={startNfc}>
              📶 啟用 NFC
            </button>
          )}
        </div>
        {cameraActive && <video ref={videoRef} playsInline muted autoPlay className="staff-camera" />}
        {cameraError && <div className="staff-alert">{cameraError}</div>}
        <div className="staff-demo-cards">
          <span>測試卡：</span>
          {STATUS_DEMO_CARDS.map((card) => (
            <button
              key={card.cred}
              type="button"
              className="staff-chip"
              disabled={isLoading}
              onClick={() => {
                playScanFeedback();
                scanCard(card.cred);
              }}
            >
              {card.name}
            </button>
          ))}
        </div>
        {error && <div className="staff-alert">{error}</div>}
      </section>

      {status && (
        <section className="staff-panel">
          <div className="staff-status-head">
            <span className="staff-status-level">Lv{status.level.current}</span>
            <div>
              <div className="staff-status-name">{status.player.name}</div>
              <div className="staff-status-meta">
                {status.level.meritToNext === null
                  ? '已達最高等級 MAX'
                  : `再 ${status.level.meritToNext} 功績升到 Lv${status.level.current + 1}`}
              </div>
            </div>
          </div>
          {newSkills.length > 0 && (
            <div className="staff-status-new">
              ⭐ 新技能：{newSkills.map((skill) => skill.name).join('、')}，請發給新的技能卡
            </div>
          )}
          <div className="staff-status-meta">
            已學會 {status.skills.filter((skill) => skill.unlocked).length} / {status.skills.length} 個技能 ·
            大螢幕顯示完整技能卡牆
          </div>
        </section>
      )}
    </div>
  );
}
