import { useEffect, useRef, useState } from 'react';
import { useGameEvents } from '../../hooks/useGameEvents.js';
import { useNfcScanner } from '../../hooks/useNfcScanner.js';
import { useQrScanner } from '../../hooks/useQrScanner.js';
import type {
  ActionCardKind,
  ActionCardSummary,
  BattleState,
  GameEvent,
  PlayCardResponse,
  PlayerInfo,
} from '../../types/battle.js';
import { playScanFeedback } from '../../utils/scanFeedback.js';
import {
  WRONG_CARD_FOR_ACTION,
  WRONG_CARD_FOR_IDENTITY,
  parseScanPayload,
} from '../../utils/scanPayload.js';
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

const CARD_KINDS: { type: ActionCardKind; icon: string; label: string }[] = [
  { type: 'STRIKE', icon: '⚔️', label: '攻擊' },
  { type: 'FIRE', icon: '🔥', label: '火' },
  { type: 'WATER', icon: '💧', label: '水' },
  { type: 'WIND', icon: '🌪️', label: '風' },
];

const CARD_ICONS: Record<ActionCardKind, string> = {
  STRIKE: '⚔️',
  FIRE: '🔥',
  WATER: '💧',
  WIND: '🌪️',
};

export function BossActorView() {
  const [bosses, setBosses] = useState<BossOption[]>(DEFAULT_BOSSES);
  const [selectedBossId, setSelectedBossId] = useState<string>('boss-01');
  const [credentialInput, setCredentialInput] = useState<string>('cred-demo-001');
  const [scannerMode, setScannerMode] = useState<'manual' | 'camera'>('manual');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [scannedPlayer, setScannedPlayer] = useState<PlayerInfo | null>(null);
  const [activeBattle, setActiveBattle] = useState<BattleState | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const [attackMode, setAttackMode] = useState<'button' | 'card'>('button');
  // Manual buttons rotate through the physical cards of each type so the
  // per-card cooldown does not block same-type combos (e.g. a fizzle)
  const [manualCards, setManualCards] = useState<Record<ActionCardKind, string[]>>({
    STRIKE: ['card-strike-001', 'card-strike-002'],
    FIRE: ['card-fire-001', 'card-fire-002'],
    WATER: ['card-water-001', 'card-water-002'],
    WIND: ['card-wind-001', 'card-wind-002'],
  });
  const manualCardIndexRef = useRef<Record<ActionCardKind, number>>({ STRIKE: 0, FIRE: 0, WATER: 0, WIND: 0 });
  const [castSlot, setCastSlot] = useState<ActionCardKind[]>([]);
  const [comboDeadline, setComboDeadline] = useState<string | null>(null);
  const [clock, setClock] = useState(0);
  const [lastCardMessage, setLastCardMessage] = useState<string | null>(null);

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

  // Fetch action cards for the manual card buttons
  useEffect(() => {
    fetch('/api/v1/action-cards')
      .then((res) => (res.ok ? res.json() : []))
      .then((cards: ActionCardSummary[]) => {
        const byType: Partial<Record<ActionCardKind, string[]>> = {};
        for (const card of cards) (byType[card.type] ??= []).push(card.value);
        setManualCards((prev) => ({ ...prev, ...byType }));
      })
      .catch(() => {
        // Keep seed defaults
      });
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

  const {
    videoRef: identityVideoRef,
    cameraActive: identityCameraActive,
    cameraError: identityCameraError,
    startCamera: startIdentityCamera,
    stopCamera: stopIdentityCamera,
  } = useQrScanner((raw) => {
    const payload = parseScanPayload(raw);
    if (payload.kind === 'card') {
      setErrorMsg(WRONG_CARD_FOR_IDENTITY);
      return;
    }
    setCredentialInput(payload.value);
    validateAndScan(payload.value);
  });

  const applyBattle = (battle: BattleState) => {
    setActiveBattle(battle);
    setCastSlot(battle.castSlot.map((entry) => entry.type));
    setComboDeadline(battle.comboDeadline);
    setClock(Date.now());
    // Card readers only run while a battle is active
    if (battle.status !== 'active') stopCardReaders();
  };

  // Play an action card (camera, NFC or manual button)
  const playCard = async (cardValue: string) => {
    if (!activeBattle || activeBattle.status !== 'active') return;
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/battles/${activeBattle.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `刷卡失敗 (${res.status})`);

      const result = data as PlayCardResponse;
      if (result.result === 'cooldown') return;
      applyBattle(result.battle);

      if (result.result === 'charged') {
        setLastCardMessage('🔮 蓄力中！再刷一張卡組合技能');
      } else if (result.result === 'fizzled') {
        setLastCardMessage('💨 魔法失控！相同元素互相抵消');
      } else if (result.skill) {
        const effect =
          result.skill.heal > 0 ? `回復 ${result.skill.heal} HP` : `造成 ${result.skill.damage} 傷害`;
        setLastCardMessage(
          result.skill.lockedSkill
            ? `🔒 還沒學會${result.skill.lockedSkill.name}（Lv${result.skill.lockedSkill.requiredLevel}），先用${result.skill.name}！${effect}`
            : `✨ ${result.skill.name}！${effect}`,
        );
      }
      addLog(`Card ${cardValue}: ${result.result}${result.skill ? ` (${result.skill.name})` : ''}`);

      if (result.battle.status === 'victory') {
        addLog(`🎉 VICTORY! Granted +${result.battle.reward?.gold} Gold, +${result.battle.reward?.merit} Merit!`);
      } else if (result.battle.status === 'defeat') {
        addLog('💀 DEFEAT! Challenger has fallen.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '刷卡失敗。');
    }
  };

  const handleCardPayload = (raw: string) => {
    const payload = parseScanPayload(raw);
    if (payload.kind === 'player') {
      setErrorMsg(WRONG_CARD_FOR_ACTION);
      return;
    }
    playCard(payload.value);
  };

  const {
    videoRef: cardVideoRef,
    cameraActive: cardCameraActive,
    cameraError: cardCameraError,
    startCamera: startCardCamera,
    stopCamera: stopCardCamera,
  } = useQrScanner(handleCardPayload, { continuous: true, intervalMs: 150 });
  const { nfcSupported, nfcActive, nfcError, startNfc, stopNfc } = useNfcScanner(handleCardPayload);

  function stopCardReaders() {
    stopCardCamera();
    stopNfc();
  }

  // Tick the combo countdown while an element card is charged
  useEffect(() => {
    if (!comboDeadline) return;
    const timer = setInterval(() => setClock(Date.now()), 200);
    return () => clearInterval(timer);
  }, [comboDeadline]);

  const comboSecondsLeft = comboDeadline
    ? Math.min(6, Math.max(0, Math.ceil((new Date(comboDeadline).getTime() - clock) / 1000)))
    : null;

  // A lone element card resolves on the server when its combo window expires
  useGameEvents(selectedBossId, (event: GameEvent) => {
    if (event.type !== 'skill.cast' || event.data?.skillId !== 'element-bolt') return;
    if (!activeBattle || event.data.battleId !== activeBattle.id) return;
    fetch(`/api/v1/battles/${activeBattle.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((battle: BattleState | null) => battle && applyBattle(battle))
      .catch(() => {});
    setLastCardMessage(`✨ ${event.data.skillName}！造成 ${event.data.damage} 傷害`);
    addLog(`Combo window expired: ${event.data.skillName} dealt ${event.data.damage} dmg.`);
  });

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
      applyBattle(battle);
      setLastCardMessage(null);
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
      applyBattle(updated);

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
    stopCardReaders();
    setActiveBattle(null);
    setScannedPlayer(null);
    setErrorMsg(null);
    setLastCardMessage(null);
    addLog('Terminal reset for next challenger.');
  };

  const switchAttackMode = (mode: 'button' | 'card') => {
    setAttackMode(mode);
    if (mode === 'button') stopCardReaders();
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
                    stopIdentityCamera();
                  }}
                >
                  ⌨️ Manual Input
                </button>
                <button
                  type="button"
                  className={`tab-pill ${scannerMode === 'camera' ? 'active' : ''}`}
                  onClick={() => {
                    setScannerMode('camera');
                    startIdentityCamera();
                  }}
                >
                  📷 Camera Scan
                </button>
              </div>
            </div>

            {/* Camera Viewfinder */}
            {scannerMode === 'camera' && (
              <div className="camera-viewfinder-box">
                {identityCameraActive && <div className="camera-live-badge">LIVE SCANNER</div>}
                {identityCameraError ? (
                  <div className="camera-error-notice">
                    <p>{identityCameraError}</p>
                    <button
                      type="button"
                      onClick={startIdentityCamera}
                      className="actor-btn actor-btn-sm"
                    >
                      Retry Camera
                    </button>
                  </div>
                ) : (
                  identityCameraActive && (
                    <div className="video-container">
                      <video
                        ref={identityVideoRef}
                        playsInline
                        muted
                        autoPlay
                        className="scanner-video"
                      />
                      <div className="viewfinder-overlay">
                        <div className="viewfinder-reticle">
                          <div className="reticle-laser" />
                        </div>
                        <p className="reticle-hint">Point camera at Adventure Card QR Code</p>
                      </div>
                    </div>
                  )
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
                      playScanFeedback();
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
                      playScanFeedback();
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
                    onClick={() => {
                      playScanFeedback();
                      validateAndScan();
                    }}
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

            {activeBattle.status === 'active' ? (
              <>
                <div className="tab-pill-group attack-mode-toggle">
                  <button
                    type="button"
                    className={`tab-pill ${attackMode === 'button' ? 'active' : ''}`}
                    onClick={() => switchAttackMode('button')}
                  >
                    🔘 按鈕攻擊
                  </button>
                  <button
                    type="button"
                    className={`tab-pill ${attackMode === 'card' ? 'active' : ''}`}
                    onClick={() => switchAttackMode('card')}
                  >
                    🃏 卡片攻擊
                  </button>
                </div>

                {attackMode === 'button' ? (
                  /* ONE-HAND LARGE ATTACK BUTTON */
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
                  /* ACTION CARD MODE */
                  <div className="card-mode-area">
                    <div className="card-slot-row">
                      {[0, 1].map((index) => (
                        <div key={index} className={`card-slot ${castSlot[index] ? 'filled' : ''}`}>
                          {castSlot[index] ? CARD_ICONS[castSlot[index]] : '＋'}
                        </div>
                      ))}
                      <div className="combo-countdown">
                        {comboSecondsLeft !== null ? `⏳ ${comboSecondsLeft}s` : '等待刷卡'}
                      </div>
                    </div>
                    {/* Always rendered so the card buttons never shift while tapping */}
                    <div className="card-result-banner">{lastCardMessage ?? '請刷行動卡'}</div>

                    <div className="card-reader-controls">
                      <button
                        type="button"
                        className={`actor-btn actor-btn-sm ${cardCameraActive ? 'reader-on' : ''}`}
                        onClick={cardCameraActive ? stopCardCamera : startCardCamera}
                      >
                        {cardCameraActive ? '📷 關閉相機' : '📷 開啟相機連續掃描'}
                      </button>
                      {nfcSupported && (
                        <button
                          type="button"
                          className={`actor-btn actor-btn-sm ${nfcActive ? 'reader-on' : ''}`}
                          onClick={nfcActive ? stopNfc : startNfc}
                        >
                          {nfcActive ? '📶 NFC 讀取中' : '📶 啟用 NFC'}
                        </button>
                      )}
                    </div>
                    {(cardCameraError || nfcError) && (
                      <p className="card-reader-error">{cardCameraError || nfcError}</p>
                    )}
                    {cardCameraActive && (
                      <div className="video-container card-video">
                        <video
                          ref={cardVideoRef}
                          playsInline
                          muted
                          autoPlay
                          className="scanner-video"
                        />
                        <div className="viewfinder-overlay">
                          <p className="reticle-hint">請小朋友把行動卡放到鏡頭前</p>
                        </div>
                      </div>
                    )}

                    <div className="manual-card-grid">
                      {CARD_KINDS.map((kind) => (
                        <button
                          key={kind.type}
                          type="button"
                          className={`manual-card-btn card-${kind.type.toLowerCase()}`}
                          onClick={() => {
                            playScanFeedback();
                            const values = manualCards[kind.type];
                            const index = manualCardIndexRef.current[kind.type]++ % values.length;
                            playCard(values[index]);
                          }}
                        >
                          <span className="manual-card-icon">{kind.icon}</span>
                          <span>{kind.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
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
