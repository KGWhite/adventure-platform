import { useEffect, useRef, useState } from 'react';
import type { BattleState, PlayerInfo } from '../../types/battle.js';
import './BossActorView.css';

interface BossOption {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attackPower: number;
}

const DEFAULT_BOSSES: BossOption[] = [
  { id: 'boss-01', name: 'Black Knight', hp: 150, maxHp: 150, attackPower: 15 },
];

export function BossActorView() {
  const [bosses, setBosses] = useState<BossOption[]>(DEFAULT_BOSSES);
  const [selectedBossId, setSelectedBossId] = useState<string>('boss-01');
  const [credentialInput, setCredentialInput] = useState<string>('cred-demo-001');
  const [scannerMode, setScannerMode] = useState<'manual' | 'camera'>('manual');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [scannedPlayer, setScannedPlayer] = useState<PlayerInfo | null>(null);
  const [activeBattle, setActiveBattle] = useState<BattleState | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = (msg: string) => {
    setActionLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);
  };

  // Fetch bosses list on mount
  useEffect(() => {
    fetch('/api/v1/bosses')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBosses(data);
          setSelectedBossId(data[0].id);
        }
      })
      .catch(() => {
        // Fallback to default
      });
  }, []);

  // Camera QR Scanner logic
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      startQrFrameDetection();
    } catch (err: any) {
      setCameraError(
        err.message || 'Camera permission denied or camera not available. Please use Manual Input.',
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startQrFrameDetection = () => {
    // Check if BarcodeDetector is supported natively in modern browsers
    const hasBarcodeDetector = 'BarcodeDetector' in window;
    let detector: any = null;

    if (hasBarcodeDetector) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = null;
      }
    }

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            handleDetectedCode(rawValue);
            return;
          }
        } catch {
          // ignore detector error
        }
      }

      // Canvas fallback detection
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          // If native scanner not supported, camera provides viewfinder
        }
      }
    }, 400);
  };

  const handleDetectedCode = (code: string) => {
    stopCamera();
    let token = code.trim();
    // Support URL schemas, e.g. adventure://player/cred-demo-001
    if (token.startsWith('adventure://player/')) {
      token = token.replace('adventure://player/', '');
    }
    setCredentialInput(token);
    validateAndScan(token);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Common Credential Validation Flow (Used by both Camera and Manual)
  const validateAndScan = async (credValue?: string) => {
    const value = (credValue || credentialInput).trim();
    if (!value) {
      setErrorMsg('Please enter or scan a credential value.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/battles/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialValue: value,
          displayId: selectedBossId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Player not found with this credential.');
      }

      const data = await res.json();
      setScannedPlayer(data.player);
      addLog(`Scanned player: ${data.player.name} (${data.player.id})`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan player.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start Battle Flow
  const handleStartBattle = async () => {
    if (!scannedPlayer) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialValue: credentialInput.trim(),
          bossId: selectedBossId,
          displayId: selectedBossId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to initialize battle.');
      }

      const battle: BattleState = await res.json();
      setActiveBattle(battle);
      addLog(`Battle started! ID: ${battle.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start battle.');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Combat Turn (Attack)
  const handleAttack = async () => {
    if (!activeBattle || activeBattle.status !== 'active') return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/battles/${activeBattle.id}/attack`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to execute attack.');
      }

      const updated: BattleState = await res.json();
      setActiveBattle(updated);

      if (updated.lastTurn) {
        addLog(
          `Attack: Player dealt ${updated.lastTurn.playerDamage} dmg. Boss countered ${updated.lastTurn.bossDamage} dmg.`,
        );
      }

      if (updated.status === 'victory') {
        addLog(`🎉 VICTORY! Granted +${updated.reward?.gold} Gold, +${updated.reward?.merit} Merit!`);
      } else if (updated.status === 'defeat') {
        addLog('💀 DEFEAT! Challenger has fallen.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Combat action failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForNext = () => {
    setActiveBattle(null);
    setScannedPlayer(null);
    setErrorMsg(null);
    addLog('Terminal reset for next challenger.');
  };

  const selectedBoss = bosses.find((b) => b.id === selectedBossId) || bosses[0];

  return (
    <div className="boss-actor-root">
      {/* Top App Bar */}
      <header className="actor-topbar">
        <div className="topbar-branding">
          <span className="branding-icon">⚔️</span>
          <div>
            <h1 className="branding-title">BOSS ACTOR TERMINAL</h1>
            <span className="branding-subtitle">World Node Field Controller</span>
          </div>
        </div>

        <a href={`/display/${selectedBossId}`} target="_blank" rel="noreferrer" className="open-display-link">
          📺 Open Display
        </a>
      </header>

      <main className="actor-main-content">
        {/* Error Alert */}
        {errorMsg && (
          <div className="actor-alert actor-alert-error">
            <span>⚠️ {errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="alert-close-btn">
              ×
            </button>
          </div>
        )}

        {/* 1. BOSS SELECTION */}
        <section className="actor-card section-boss-select">
          <label className="section-title" htmlFor="boss-select-input">
            1. ACTIVE BOSS POST
          </label>
          <div className="boss-select-row">
            <select
              id="boss-select-input"
              className="actor-select"
              value={selectedBossId}
              onChange={(e) => setSelectedBossId(e.target.value)}
              disabled={!!activeBattle && activeBattle.status === 'active'}
            >
              {bosses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (HP: {b.hp}/{b.maxHp}, ATK: {b.attackPower})
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 2. PLAYER SCANNER SECTION (If no active battle) */}
        {!activeBattle && (
          <section className="actor-card section-scanner">
            <div className="section-header-row">
              <span className="section-title">2. SCAN ADVENTURE CARD</span>
              <div className="tab-pill-group">
                <button
                  type="button"
                  className={`tab-pill ${scannerMode === 'manual' ? 'active' : ''}`}
                  onClick={() => {
                    setScannerMode('manual');
                    stopCamera();
                  }}
                >
                  ⌨️ Manual Input
                </button>
                <button
                  type="button"
                  className={`tab-pill ${scannerMode === 'camera' ? 'active' : ''}`}
                  onClick={() => {
                    setScannerMode('camera');
                    startCamera();
                  }}
                >
                  📷 Camera Scan
                </button>
              </div>
            </div>

            {/* Camera Viewfinder */}
            {scannerMode === 'camera' && (
              <div className="camera-viewfinder-box">
                {cameraActive && <div className="camera-live-badge">LIVE SCANNER</div>}
                {cameraError ? (
                  <div className="camera-error-notice">
                    <p>{cameraError}</p>
                    <button type="button" onClick={startCamera} className="actor-btn actor-btn-sm">
                      Retry Camera
                    </button>
                  </div>
                ) : (
                  <div className="video-container">
                    <video ref={videoRef} playsInline muted className="scanner-video" />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div className="viewfinder-overlay">
                      <div className="viewfinder-reticle">
                        <div className="reticle-laser" />
                      </div>
                      <p className="reticle-hint">Point camera at Adventure Card QR Code</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Credential Input (Dev Mode) */}
            {scannerMode === 'manual' && (
              <div className="manual-input-box">
                <div className="quick-presets-row">
                  <span className="presets-label">Quick Demo Cards:</span>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      setCredentialInput('cred-demo-001');
                      validateAndScan('cred-demo-001');
                    }}
                  >
                    🛡️ Aria (cred-demo-001)
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      setCredentialInput('cred-demo-002');
                      validateAndScan('cred-demo-002');
                    }}
                  >
                    ⚔️ Leon (cred-demo-002)
                  </button>
                </div>

                <div className="credential-input-group">
                  <input
                    type="text"
                    className="actor-input"
                    placeholder="Enter credential e.g. cred-demo-001"
                    value={credentialInput}
                    onChange={(e) => setCredentialInput(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="actor-btn actor-btn-primary"
                    onClick={() => validateAndScan()}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Resolving...' : '🔍 Identify Player'}
                  </button>
                </div>
              </div>
            )}

            {/* Resolved Challenger Card */}
            {scannedPlayer && (
              <div className="resolved-challenger-card">
                <div className="challenger-badge-found">✓ CHALLENGER IDENTIFIED</div>
                <div className="challenger-main-row">
                  <div className="challenger-icon">🛡️</div>
                  <div className="challenger-details">
                    <div className="challenger-name">{scannedPlayer.name}</div>
                    <div className="challenger-meta">
                      Lv.{scannedPlayer.level} Adventurer • HP: {scannedPlayer.hp}/{scannedPlayer.maxHp}
                    </div>
                    <div className="challenger-economy">
                      <span>🪙 {scannedPlayer.gold} Gold</span>
                      <span>🎖️ {scannedPlayer.merit} Merit</span>
                    </div>
                  </div>
                </div>

                {/* Big Start Battle Button */}
                <button
                  type="button"
                  className="actor-btn actor-btn-danger actor-btn-lg start-battle-btn"
                  onClick={handleStartBattle}
                  disabled={isLoading}
                >
                  ⚔️ START BATTLE WITH {selectedBoss?.name.toUpperCase()}
                </button>
              </div>
            )}
          </section>
        )}

        {/* 3. ACTIVE BATTLE COMBAT CONTROLLER */}
        {activeBattle && (
          <section className="actor-card section-combat">
            <div className="combat-status-badge">
              {activeBattle.status === 'active' && '⚔️ BATTLE IN PROGRESS'}
              {activeBattle.status === 'victory' && '🎉 VICTORY ACHIEVED'}
              {activeBattle.status === 'defeat' && '💀 CHALLENGER DEFEATED'}
            </div>

            {/* Mini Health Meters */}
            <div className="combat-meters-grid">
              <div className="meter-card player-meter">
                <div className="meter-label">CHALLENGER: {activeBattle.playerName}</div>
                <div className="meter-val">{activeBattle.playerHp} / {activeBattle.playerMaxHp} HP</div>
                <div className="meter-bar">
                  <div
                    className="meter-fill player-fill"
                    style={{
                      width: `${Math.max(0, (activeBattle.playerHp / activeBattle.playerMaxHp) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="meter-card boss-meter">
                <div className="meter-label">BOSS: {activeBattle.bossName}</div>
                <div className="meter-val">{activeBattle.bossHp} / {activeBattle.bossMaxHp} HP</div>
                <div className="meter-bar">
                  <div
                    className="meter-fill boss-fill"
                    style={{
                      width: `${Math.max(0, (activeBattle.bossHp / activeBattle.bossMaxHp) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ONE-HAND LARGE ATTACK BUTTON */}
            {activeBattle.status === 'active' ? (
              <div className="combat-action-area">
                <button
                  type="button"
                  className="actor-btn actor-btn-danger actor-btn-xl attack-button"
                  onClick={handleAttack}
                  disabled={isLoading}
                >
                  {isLoading ? 'EXECUTING TURN...' : '💥 ATTACK BOSS'}
                </button>
                <p className="attack-hint">單手操作：點擊觸發一次玩家攻擊與 Boss 反擊判定</p>
              </div>
            ) : (
              /* Battle End Outcome */
              <div className="combat-finished-area">
                {activeBattle.status === 'victory' && (
                  <div className="outcome-alert victory-alert">
                    <div className="outcome-icon">🏆</div>
                    <h3>VICTORY!</h3>
                    <p>Boss has been defeated.</p>
                    <div className="rewards-granted">
                      <span>+{activeBattle.reward?.gold} Gold</span>
                      <span>+{activeBattle.reward?.merit} Merit</span>
                      <span>{activeBattle.reward?.item}</span>
                    </div>
                  </div>
                )}

                {activeBattle.status === 'defeat' && (
                  <div className="outcome-alert defeat-alert">
                    <div className="outcome-icon">💀</div>
                    <h3>DEFEAT</h3>
                    <p>Challenger HP dropped to 0.</p>
                  </div>
                )}

                <button
                  type="button"
                  className="actor-btn actor-btn-primary actor-btn-lg reset-next-btn"
                  onClick={handleResetForNext}
                >
                  🔄 Reset for Next Challenger
                </button>
              </div>
            )}
          </section>
        )}

        {/* 4. ACTIVITY TELEMETRY LOG */}
        <section className="actor-card section-telemetry">
          <div className="section-title">TERMINAL ACTION LOG</div>
          <div className="telemetry-log-box">
            {actionLog.length === 0 ? (
              <div className="log-empty">No actions logged yet.</div>
            ) : (
              actionLog.map((line, idx) => (
                <div key={idx} className="log-line">
                  {line}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
