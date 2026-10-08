import { useEffect, useRef, useState } from 'react';
import type { GuildScanResponse, PlayerQuest, Quest } from '../../types/quest.js';
import './GuildTerminalView.css';

const DEMO_PRESETS = [
  { name: 'Aria', cred: 'cred-demo-001', rank: 'Rank F' },
  { name: 'Leon', cred: 'cred-demo-002', rank: 'Rank F' },
  { name: 'Rookie', cred: 'ADV-DEV-001-QR', rank: 'Rank F' },
];

export function GuildTerminalView() {
  const [credentialInput, setCredentialInput] = useState<string>('cred-demo-001');
  const [scannerMode, setScannerMode] = useState<'manual' | 'camera'>('manual');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [playerData, setPlayerData] = useState<GuildScanResponse['player'] | null>(null);
  const [activeQuest, setActiveQuest] = useState<PlayerQuest | null>(null);
  const [availableQuests, setAvailableQuests] = useState<Quest[]>([]);
  const [claimCelebration, setClaimCelebration] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        err.message || '無法開啟相機，請確認瀏覽器相機權限或使用手動測試模式。',
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
            handleDetectedCode(barcodes[0].rawValue);
            return;
          }
        } catch {
          // ignore detector error
        }
      }

      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        }
      }
    }, 400);
  };

  const handleDetectedCode = (code: string) => {
    stopCamera();
    let token = code.trim();
    if (token.startsWith('adventure://player/')) {
      token = token.replace('adventure://player/', '');
    }
    setCredentialInput(token);
    scanGuildTerminal(token);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Fetch / Scan Guild Terminal
  const scanGuildTerminal = async (credVal?: string) => {
    const val = (credVal || credentialInput).trim();
    if (!val) {
      setErrorMsg('請輸入或掃描冒險者憑證 (Adventure Credential)。');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/v1/guild/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialValue: val }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `掃描失敗 (${res.status})`);
      }

      const data: GuildScanResponse = await res.json();
      setPlayerData(data.player);
      setActiveQuest(data.activeQuest);
      setAvailableQuests(data.availableQuests);
      setSuccessNotice(`歡迎冒險者 ${data.player.name}！已連線公會伺服器。`);
    } catch (err: any) {
      setErrorMsg(err.message || '掃描時發生錯誤，請重試。');
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time WebSocket / SSE event subscription
  useEffect(() => {
    if (!playerData) return;

    let ws: WebSocket | null = null;
    let sse: EventSource | null = null;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleLiveEvent(payload);
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        // Fallback to SSE
        if (!sse) {
          sse = new EventSource('/api/v1/events/sse?displayId=guild-01');
          sse.onmessage = (e) => {
            try {
              const payload = JSON.parse(e.data);
              handleLiveEvent(payload);
            } catch {
              // ignore
            }
          };
        }
      };
    } catch {
      // ignore
    }

    const handleLiveEvent = (event: any) => {
      if (!event || !event.type) return;

      if (
        event.type === 'quest.completed' ||
        event.type === 'quest.progress_updated' ||
        event.type === 'battle.victory'
      ) {
        if (event.data?.playerId === playerData.id || !event.data?.playerId) {
          // Refresh state from server
          scanGuildTerminal(playerData.credentialValue || credentialInput);
        }
      }
    };

    return () => {
      if (ws) ws.close();
      if (sse) sse.close();
    };
  }, [playerData?.id]);

  // Accept Quest
  const handleAcceptQuest = async (questId: string) => {
    if (!playerData) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/v1/player-quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialValue: playerData.credentialValue || credentialInput,
          questId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `接取任務失敗 (${res.status})`);
      }

      const acceptedPq: PlayerQuest = await res.json();
      setActiveQuest(acceptedPq);
      setSuccessNotice(`✅ 成功接取任務「${acceptedPq.quest?.title || '討伐任務'}」！請前往 Boss 房間進行挑戰。`);
    } catch (err: any) {
      setErrorMsg(err.message || '接取任務時發生錯誤。');
    } finally {
      setIsLoading(false);
    }
  };

  // Claim Reward
  const handleClaimReward = async (playerQuestId: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessNotice(null);

    try {
      const res = await fetch(`/api/v1/player-quests/${playerQuestId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `領取獎勵失敗 (${res.status})`);
      }

      const result = await res.json();
      setActiveQuest(result.playerQuest);
      if (playerData) {
        setPlayerData({
          ...playerData,
          gold: result.player.gold,
          merit: result.player.merit,
        });
      }

      setClaimCelebration(true);
      setSuccessNotice(
        `🏆 獎勵已發放！獲得 ${result.reward.gold} Gold 與 ${result.reward.merit} Merit！`,
      );
      setTimeout(() => setClaimCelebration(false), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || '領取報酬時發生錯誤。');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset / Clear
  const handleReset = () => {
    setPlayerData(null);
    setActiveQuest(null);
    setErrorMsg(null);
    setSuccessNotice(null);
    setClaimCelebration(false);
    stopCamera();
  };

  return (
    <div className="guild-terminal-container">
      {/* Top Banner Header */}
      <header className="guild-header">
        <div className="guild-brand">
          <div className="guild-emblem">⚔️</div>
          <div>
            <h1 className="guild-title">ADVENTURER GUILD TERMINAL</h1>
            <p className="guild-subtitle">冒險者公會實體終端機 · 委託接取與報酬結算</p>
          </div>
        </div>
        <div className="guild-header-actions">
          <a href="/actor/boss" className="guild-nav-link" target="_blank" rel="noreferrer">
            前往 Boss 操偶終端 ➔
          </a>
          <a href="/display/boss-01" className="guild-nav-link" target="_blank" rel="noreferrer">
            開啟 Boss 大螢幕 ➔
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="guild-main">
        {/* Scanner / ID Verification Card */}
        {!playerData ? (
          <section className="guild-card scanner-card">
            <h2 className="card-section-title">🛡️ 冒險者身分識別 (ADVENTURE CARD)</h2>
            <p className="scanner-instruction">
              請出示冒險者身分卡（QR Adventure Card），讓公會水晶終端機感應登錄：
            </p>

            {/* Mode Switch */}
            <div className="scanner-mode-tabs">
              <button
                type="button"
                className={`tab-btn ${scannerMode === 'camera' ? 'active' : ''}`}
                onClick={() => {
                  setScannerMode('camera');
                  startCamera();
                }}
              >
                📷 相機 QR 掃描
              </button>
              <button
                type="button"
                className={`tab-btn ${scannerMode === 'manual' ? 'active' : ''}`}
                onClick={() => {
                  setScannerMode('manual');
                  stopCamera();
                }}
              >
                ⌨️ 手動／測試卡片輸入
              </button>
            </div>

            {/* Camera View */}
            {scannerMode === 'camera' && (
              <div className="camera-box">
                {cameraActive ? (
                  <div className="video-wrapper">
                    <video ref={videoRef} playsInline muted autoPlay className="camera-video" />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div className="qr-guide-box" />
                  </div>
                ) : (
                  <div className="camera-prompt">
                    <button type="button" className="action-btn gold-btn" onClick={startCamera}>
                      啟動掃描鏡頭
                    </button>
                  </div>
                )}
                {cameraError && <div className="camera-error-banner">{cameraError}</div>}
              </div>
            )}

            {/* Manual Presets */}
            {scannerMode === 'manual' && (
              <div className="manual-box">
                <div className="preset-chips">
                  <span className="preset-label">開發測試帳號：</span>
                  {DEMO_PRESETS.map((p) => (
                    <button
                      key={p.cred}
                      type="button"
                      className="preset-chip"
                      onClick={() => {
                        setCredentialInput(p.cred);
                        scanGuildTerminal(p.cred);
                      }}
                    >
                      {p.name} ({p.cred})
                    </button>
                  ))}
                </div>

                <div className="input-group">
                  <input
                    type="text"
                    value={credentialInput}
                    onChange={(e) => setCredentialInput(e.target.value)}
                    placeholder="輸入 Credential 代碼 (例: cred-demo-001)"
                    className="guild-text-input"
                  />
                  <button
                    type="button"
                    className="action-btn gold-btn"
                    disabled={isLoading}
                    onClick={() => scanGuildTerminal()}
                  >
                    {isLoading ? '驗證中...' : '掃描登錄 ➔'}
                  </button>
                </div>
              </div>
            )}

            {errorMsg && <div className="guild-alert error-alert">{errorMsg}</div>}
          </section>
        ) : (
          /* Adventurer Logged-in State */
          <div className="guild-content-grid">
            {/* Left Column: Player Status Card */}
            <section className="guild-card player-status-card">
              <div className="card-top-bar">
                <span className="badge rank-badge">{playerData.rank}</span>
                <button type="button" className="switch-card-btn" onClick={handleReset}>
                  換卡／登出 ↩
                </button>
              </div>

              <div className="player-hero">
                <div className="player-avatar">🧙‍♂️</div>
                <div className="player-meta">
                  <h2 className="player-name">{playerData.name}</h2>
                  <span className="player-level">Level {playerData.level} 冒險者</span>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="player-stats-section">
                <div className="stat-row">
                  <span className="stat-label">❤️ 生命值 (HP)</span>
                  <span className="stat-value">
                    {playerData.hp} / {playerData.maxHp}
                  </span>
                </div>
                <div className="hp-bar-bg">
                  <div
                    className="hp-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, (playerData.hp / playerData.maxHp) * 100))}%`,
                    }}
                  />
                </div>

                <div className="resource-counters">
                  <div className="resource-badge gold-resource">
                    <span className="res-icon">🪙</span>
                    <div className="res-details">
                      <span className="res-num">{playerData.gold}</span>
                      <span className="res-name">Gold 金幣</span>
                    </div>
                  </div>
                  <div className="resource-badge merit-resource">
                    <span className="res-icon">🎖️</span>
                    <div className="res-details">
                      <span className="res-num">{playerData.merit}</span>
                      <span className="res-name">Merit 功績</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="credential-tag">
                憑證卡號：<code>{playerData.credentialValue || credentialInput}</code>
              </div>
            </section>

            {/* Right Column: Quest Management Card */}
            <section className="guild-card quest-management-card">
              {successNotice && <div className="guild-alert success-alert">{successNotice}</div>}
              {errorMsg && <div className="guild-alert error-alert">{errorMsg}</div>}

              {/* Status 1: Completed Quest waiting to be claimed! */}
              {activeQuest && activeQuest.status === 'completed' && (
                <div className="quest-state-box completed-box">
                  <div className="completion-ribbon">✨ QUEST COMPLETE ✨</div>
                  <h3 className="quest-title-large">
                    {activeQuest.quest?.title || '討伐黑騎士 (Defeat the Black Knight)'}
                  </h3>
                  <p className="quest-desc">
                    {activeQuest.quest?.description ||
                      '黑騎士已被擊潰！你達成了公會委託，為領地除害，立刻領取豐厚的任務賞金！'}
                  </p>

                  <div className="progress-meter">
                    <div className="meter-label">
                      <span>討伐進度</span>
                      <span>
                        {activeQuest.progress} / {activeQuest.targetCount} (達成 100%)
                      </span>
                    </div>
                    <div className="meter-bar-bg">
                      <div className="meter-bar-fill complete" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div className="reward-preview-card">
                    <span className="preview-label">任務結算報酬 (Quest Reward)：</span>
                    <div className="preview-values">
                      <span className="reward-chip gold-chip">
                        🪙 +{activeQuest.quest?.rewardGold ?? 200} Gold
                      </span>
                      <span className="reward-chip merit-chip">
                        🎖️ +{activeQuest.quest?.rewardMerit ?? 20} Merit
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="action-btn claim-btn pulse-glow"
                    disabled={isLoading}
                    onClick={() => handleClaimReward(activeQuest.id)}
                  >
                    {isLoading ? '領取中...' : '🏆 領取報酬 (Claim Reward)'}
                  </button>
                </div>
              )}

              {/* Status 2: Active Quest in progress (accepted) */}
              {activeQuest && activeQuest.status === 'accepted' && (
                <div className="quest-state-box in-progress-box">
                  <div className="quest-status-badge in-progress-badge">⚔️ 進行中委託</div>
                  <h3 className="quest-title-large">
                    {activeQuest.quest?.title || '討伐黑騎士 (Defeat the Black Knight)'}
                  </h3>
                  <p className="quest-desc">
                    {activeQuest.quest?.description ||
                      '前往 Boss 之間，擊敗作惡多端的黑騎士，證明冒險者的實力。'}
                  </p>

                  <div className="progress-meter">
                    <div className="meter-label">
                      <span>討伐進度 (Defeat Count)</span>
                      <span>
                        {activeQuest.progress} / {activeQuest.targetCount}
                      </span>
                    </div>
                    <div className="meter-bar-bg">
                      <div
                        className="meter-bar-fill"
                        style={{
                          width: `${Math.min(100, (activeQuest.progress / activeQuest.targetCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="reward-preview-card">
                    <span className="preview-label">達成預計獎勵：</span>
                    <div className="preview-values">
                      <span className="reward-chip gold-chip">
                        🪙 {activeQuest.quest?.rewardGold ?? 200} Gold
                      </span>
                      <span className="reward-chip merit-chip">
                        🎖️ {activeQuest.quest?.rewardMerit ?? 20} Merit
                      </span>
                    </div>
                  </div>

                  <div className="quest-guidance-callout">
                    <div className="callout-icon">📍</div>
                    <div>
                      <strong>下一步行動：</strong>
                      <p>
                        持卡前往 Boss 戰鬥區域。Boss 操偶師（/actor/boss）掃描卡片進入戰鬥並擊敗黑騎士後，伺服器將自動認證討伐進度！
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="action-btn outline-btn"
                    onClick={() => scanGuildTerminal(playerData.credentialValue)}
                  >
                    🔄 檢查最新討伐進度
                  </button>
                </div>
              )}

              {/* Status 3: Quest Claimed (claimed) */}
              {activeQuest && activeQuest.status === 'claimed' && (
                <div className="quest-state-box claimed-box">
                  <div className="quest-status-badge claimed-badge">✅ 委託已完成並領獎</div>
                  <h3 className="quest-title-large">
                    {activeQuest.quest?.title || '討伐黑騎士'}
                  </h3>
                  <p className="quest-desc">
                    獎勵已全數發放至冒險者帳戶。感謝你對公會的貢獻！
                  </p>
                  <button
                    type="button"
                    className="action-btn gold-btn"
                    onClick={() => {
                      setActiveQuest(null);
                      scanGuildTerminal(playerData.credentialValue);
                    }}
                  >
                    📜 檢視其他公會委託
                  </button>
                </div>
              )}

              {/* Status 4: No active quest -> Available Quests List */}
              {!activeQuest && (
                <div className="available-quests-list">
                  <div className="section-header">
                    <h3 className="card-section-title">📜 公會可接取委託 (AVAILABLE QUESTS)</h3>
                    <span className="badge">1 項委託招募中</span>
                  </div>

                  {availableQuests.length === 0 ? (
                    <p className="no-quests-msg">目前公會委託板尚無可用委託。</p>
                  ) : (
                    availableQuests.map((quest) => (
                      <div key={quest.id} className="quest-entry-card">
                        <div className="quest-entry-main">
                          <div className="quest-entry-header">
                            <h4 className="quest-entry-title">{quest.title}</h4>
                            <span className="quest-target-tag">
                              目標：擊敗 {quest.targetId === 'boss-01' ? '黑騎士' : quest.targetId} × {quest.targetCount}
                            </span>
                          </div>
                          <p className="quest-entry-desc">{quest.description}</p>
                          <div className="quest-entry-rewards">
                            <span className="reward-tag">🪙 {quest.rewardGold} Gold</span>
                            <span className="reward-tag">🎖️ {quest.rewardMerit} Merit</span>
                          </div>
                        </div>
                        <div className="quest-entry-action">
                          <button
                            type="button"
                            className="action-btn gold-btn"
                            disabled={isLoading}
                            onClick={() => handleAcceptQuest(quest.id)}
                          >
                            接取任務 ➔
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Celebration Backdrop animation on claiming */}
      {claimCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-modal">
            <div className="celebration-icon">🎉</div>
            <h2>CLAIM SUCCESSFUL!</h2>
            <p>公會獎勵已存入你的冒險者檔案！</p>
          </div>
        </div>
      )}
    </div>
  );
}
