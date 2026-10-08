import { useEffect, useRef, useState } from 'react';
import { useGameEvents } from '../../hooks/useGameEvents.js';
import type { BattleReward, GameEvent } from '../../types/battle.js';
import { sfx } from '../../utils/audioEffects.js';
import './BossDisplayView.css';

type DisplayState = 'IDLE' | 'SCANNED' | 'BATTLE' | 'VICTORY' | 'DEFEAT';

interface ChallengerData {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  gold: number;
  merit: number;
}

interface BattleDisplayData {
  battleId: string;
  playerName: string;
  playerHp: number;
  playerMaxHp: number;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  lastPlayerDamage: number | null;
  lastBossDamage: number | null;
  turnCount: number;
}

export function BossDisplayView() {
  // Extract displayId from URL, e.g. /display/boss-01 -> boss-01
  const path = window.location.pathname;
  const displayIdMatch = path.match(/^\/display\/([^/]+)/);
  const displayId = displayIdMatch ? displayIdMatch[1] : 'boss-01';

  const [displayState, setDisplayState] = useState<DisplayState>('IDLE');
  const [challenger, setChallenger] = useState<ChallengerData | null>(null);
  const [battleData, setBattleData] = useState<BattleDisplayData | null>(null);
  const [rewards, setRewards] = useState<BattleReward | null>(null);
  const [feedMessages, setFeedMessages] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [resetCountdown, setResetCountdown] = useState<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const resetTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addFeed = (msg: string) => {
    setFeedMessages((prev) => [msg, ...prev.slice(0, 4)]);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const startResetTimer = (seconds = 8) => {
    if (resetTimerRef.current) clearInterval(resetTimerRef.current);
    setResetCountdown(seconds);

    let remaining = seconds;
    const interval = setInterval(() => {
      remaining -= 1;
      setResetCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        resetToIdle();
      }
    }, 1000);

    resetTimerRef.current = interval as any;
  };

  const resetToIdle = () => {
    if (resetTimerRef.current) clearInterval(resetTimerRef.current);
    setDisplayState('IDLE');
    setChallenger(null);
    setBattleData(null);
    setRewards(null);
    setResetCountdown(null);
    addFeed('Chamber reset. Waiting for new challenger...');
  };

  const handleGameEvent = (event: GameEvent) => {
    switch (event.type) {
      case 'player.scanned': {
        const p = event.data.player;
        setChallenger(p);
        setDisplayState('SCANNED');
        addFeed(`Adventurer ${p.name} (Lv.${p.level}) entered the arena!`);
        if (audioEnabled) sfx.playScan();
        break;
      }

      case 'battle.started': {
        const d = event.data;
        setBattleData({
          battleId: d.battleId,
          playerName: d.player.name,
          playerHp: d.player.hp,
          playerMaxHp: d.player.maxHp,
          bossName: d.boss.name,
          bossHp: d.boss.hp,
          bossMaxHp: d.boss.maxHp,
          lastPlayerDamage: null,
          lastBossDamage: null,
          turnCount: 0,
        });
        setDisplayState('BATTLE');
        addFeed(`⚔️ Battle begins! ${d.player.name} VS ${d.boss.name}`);
        if (audioEnabled) sfx.playHit();
        break;
      }

      case 'battle.attack': {
        triggerShake();
        if (audioEnabled) sfx.playHit();
        break;
      }

      case 'battle.damage': {
        const dmg = event.data;
        triggerShake();
        if (audioEnabled) sfx.playHit();

        setBattleData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            playerHp: dmg.playerHp,
            bossHp: dmg.bossHp,
            lastPlayerDamage: dmg.playerDamageDealt,
            lastBossDamage: dmg.bossDamageDealt,
            turnCount: prev.turnCount + 1,
          };
        });

        if (dmg.playerDamageDealt > 0) {
          addFeed(`💥 ${battleData?.playerName || 'Player'} dealt ${dmg.playerDamageDealt} damage to Boss!`);
        }
        if (dmg.bossDamageDealt > 0) {
          addFeed(`🛡️ Boss countered for ${dmg.bossDamageDealt} damage!`);
        }
        break;
      }

      case 'battle.victory': {
        setDisplayState('VICTORY');
        addFeed(`🏆 VICTORY! The Black Knight has been defeated!`);
        if (audioEnabled) sfx.playVictory();
        startResetTimer(9);
        break;
      }

      case 'reward.received': {
        const r = event.data;
        setRewards({
          gold: r.gold,
          merit: r.merit,
          item: r.item,
        });
        addFeed(`🎁 Rewards distributed: +${r.gold} Gold, +${r.merit} Merit!`);
        break;
      }

      case 'battle.defeat': {
        setDisplayState('DEFEAT');
        addFeed(`💀 DEFEAT! Challenger fell in battle...`);
        if (audioEnabled) sfx.playDefeat();
        startResetTimer(8);
        break;
      }
    }
  };

  const { connected, transport } = useGameEvents(displayId, handleGameEvent);

  useEffect(() => {
    sfx.enabled = audioEnabled;
  }, [audioEnabled]);

  return (
    <div className={`boss-display-root ${isShaking ? 'screen-shake' : ''}`}>
      {/* HUD Header */}
      <header className="display-hud-header">
        <div className="hud-badge-arena">
          <span className="hud-icon">🏛️</span>
          <span className="hud-label">ARENA CHAMBER 01</span>
        </div>

        <div className="hud-meta-group">
          <button
            type="button"
            className="hud-audio-btn"
            onClick={() => setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? '🔊 SFX ON' : '🔇 SFX MUTED'}
          </button>

          <div className={`hud-connection-pill ${connected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            <span className="connection-text">
              {connected ? `${transport.toUpperCase()} • ${displayId}` : 'CONNECTING...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Display Area */}
      <main className="display-content-viewport">
        {/* 1. IDLE STATE */}
        {displayState === 'IDLE' && (
          <div className="stage-idle-wrapper">
            <div className="boss-crest-container">
              <div className="runic-ring-pulse" />
              <div className="boss-avatar-emblem">⚔️</div>
            </div>

            <h1 className="boss-title-hero">THE BLACK KNIGHT</h1>
            <p className="boss-subtitle-hero">GUARDIAN OF THE ADVENTURER GATEWAY</p>

            <div className="waiting-pulse-container">
              <div className="pulse-beacon" />
              <div className="waiting-text">WAITING FOR CHALLENGER...</div>
              <div className="card-hint-text">請至 Boss Actor 終端掃描 Adventure Card</div>
            </div>
          </div>
        )}

        {/* 2. CHALLENGER SCANNED STATE */}
        {displayState === 'SCANNED' && challenger && (
          <div className="stage-scanned-wrapper">
            <div className="scanned-banner-alert">CHALLENGER IDENTIFIED</div>

            <div className="challenger-card-hero">
              <div className="challenger-avatar-circle">🛡️</div>
              <div className="challenger-name-hero">{challenger.name}</div>
              <div className="challenger-badge-rank">Rank F • Level {challenger.level} Adventurer</div>

              <div className="challenger-stat-row">
                <div className="stat-pill">
                  <span className="stat-label">HP</span>
                  <span className="stat-val">{challenger.hp} / {challenger.maxHp}</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">GOLD</span>
                  <span className="stat-val">{challenger.gold}</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">MERIT</span>
                  <span className="stat-val">{challenger.merit}</span>
                </div>
              </div>
            </div>

            <div className="arena-prep-notice">
              <span className="prep-spinner" />
              <span>Boss Actor is preparing combat parameters...</span>
            </div>
          </div>
        )}

        {/* 3. BATTLE IN PROGRESS */}
        {displayState === 'BATTLE' && battleData && (
          <div className="stage-battle-wrapper">
            {/* Split Arena HUD */}
            <div className="arena-combatants-grid">
              {/* Left: Player Combatant */}
              <div className="combatant-pod player-pod">
                <div className="combatant-header">
                  <div className="combatant-avatar">🛡️</div>
                  <div className="combatant-meta">
                    <div className="combatant-role">CHALLENGER</div>
                    <div className="combatant-name">{battleData.playerName}</div>
                  </div>
                </div>

                <div className="hp-bar-frame">
                  <div className="hp-bar-labels">
                    <span className="hp-title">HEALTH</span>
                    <span className="hp-numbers">{battleData.playerHp} / {battleData.playerMaxHp}</span>
                  </div>
                  <div className="hp-track">
                    <div
                      className="hp-fill player-hp-fill"
                      style={{ width: `${Math.max(0, (battleData.playerHp / battleData.playerMaxHp) * 100)}%` }}
                    />
                  </div>
                </div>

                {battleData.lastBossDamage !== null && battleData.lastBossDamage > 0 && (
                  <div className="floating-damage-number damage-player">
                    -{battleData.lastBossDamage}
                  </div>
                )}
              </div>

              {/* Center: VS Emblem */}
              <div className="combat-center-vs">
                <div className="vs-emblem-fire">VS</div>
                <div className="turn-counter-badge">TURN {battleData.turnCount}</div>
              </div>

              {/* Right: Boss Combatant */}
              <div className="combatant-pod boss-pod">
                <div className="combatant-header">
                  <div className="combatant-meta right-align">
                    <div className="combatant-role">FLOOR BOSS</div>
                    <div className="combatant-name">{battleData.bossName}</div>
                  </div>
                  <div className="combatant-avatar boss-avatar">⚔️</div>
                </div>

                <div className="hp-bar-frame">
                  <div className="hp-bar-labels">
                    <span className="hp-numbers">{battleData.bossHp} / {battleData.bossMaxHp}</span>
                    <span className="hp-title">BOSS HP</span>
                  </div>
                  <div className="hp-track">
                    <div
                      className="hp-fill boss-hp-fill"
                      style={{ width: `${Math.max(0, (battleData.bossHp / battleData.bossMaxHp) * 100)}%` }}
                    />
                  </div>
                </div>

                {battleData.lastPlayerDamage !== null && battleData.lastPlayerDamage > 0 && (
                  <div className="floating-damage-number damage-boss">
                    -{battleData.lastPlayerDamage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. VICTORY STATE */}
        {displayState === 'VICTORY' && (
          <div className="stage-outcome-wrapper victory-theme">
            <div className="victory-crown-icon">👑</div>
            <h1 className="outcome-title victory-title">VICTORY</h1>
            <p className="outcome-subtitle">THE BLACK KNIGHT HAS FALLEN!</p>

            <div className="rewards-trophy-card">
              <h3 className="rewards-heading">BATTLE REWARDS ACQUIRED</h3>
              <div className="rewards-items-row">
                <div className="reward-item-pill gold">
                  <span className="reward-icon">🪙</span>
                  <span className="reward-value">+{rewards?.gold ?? 120} Gold</span>
                </div>
                <div className="reward-item-pill merit">
                  <span className="reward-icon">🎖️</span>
                  <span className="reward-value">+{rewards?.merit ?? 10} Merit</span>
                </div>
                <div className="reward-item-pill medal">
                  <span className="reward-icon">🏅</span>
                  <span className="reward-value">{rewards?.item ?? 'Black Knight Medal'}</span>
                </div>
              </div>
              <div className="reward-db-sync-text">✓ Player Ledger and Gold balance updated on Server</div>
            </div>

            {resetCountdown !== null && (
              <div className="countdown-reset-badge">
                Returning to standby in {resetCountdown}s...
              </div>
            )}
          </div>
        )}

        {/* 5. DEFEAT STATE */}
        {displayState === 'DEFEAT' && (
          <div className="stage-outcome-wrapper defeat-theme">
            <div className="defeat-skull-icon">💀</div>
            <h1 className="outcome-title defeat-title">DEFEAT</h1>
            <p className="outcome-subtitle">THE CHALLENGER HAS FALLEN BEFORE THE KNIGHT</p>

            <div className="defeat-advice-card">
              <p>勇氣可嘉！請先至神殿治療或重整裝備後再次挑戰。</p>
            </div>

            {resetCountdown !== null && (
              <div className="countdown-reset-badge">
                Returning to standby in {resetCountdown}s...
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Feed Ticker */}
      <footer className="display-footer-feed">
        <div className="feed-title">ARENA LOG:</div>
        <div className="feed-stream">
          {feedMessages.length === 0 ? (
            <span className="feed-item-empty">Ready for arena combat telemetry.</span>
          ) : (
            feedMessages.map((msg, i) => (
              <span key={i} className="feed-item">
                {msg}
              </span>
            ))
          )}
        </div>
      </footer>
    </div>
  );
}
