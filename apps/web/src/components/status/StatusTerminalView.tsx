import { useEffect, useRef, useState } from 'react';
import { useNfcScanner } from '../../hooks/useNfcScanner.js';
import { useQrScanner } from '../../hooks/useQrScanner.js';
import type { SkillCardHint, StatusScanResponse, StatusSkill } from '../../types/progression.js';
import { sfx } from '../../utils/audioEffects.js';
import { itemIcon } from '../../utils/itemIcons.js';
import { playScanFeedback } from '../../utils/scanFeedback.js';
import { WRONG_CARD_FOR_IDENTITY, parseScanPayload } from '../../utils/scanPayload.js';
import './StatusTerminalView.css';

type Phase = 'idle' | 'levelup' | 'status';

const IDLE_RESET_MS = 20_000;
const LEVEL_UP_MS = 3_000;
const NOTICE_MS = 4_000;

const DEMO_CARDS = [
  { name: 'Aria', cred: 'cred-demo-001' },
  { name: 'Leon', cred: 'cred-demo-002' },
  { name: 'Rookie', cred: 'ADV-DEV-001-QR' },
];

const CARD_ICONS: Record<SkillCardHint, string> = {
  STRIKE: '⚔️',
  FIRE: '🔥',
  WATER: '💧',
  WIND: '🌪️',
  ELEMENT: '✨',
};

const SKILL_THEME: Record<string, string> = {
  strike: 'theme-strike',
  'element-bolt': 'theme-element',
  'element-slash': 'theme-element',
  'fire-tornado': 'theme-fire',
  'healing-rain': 'theme-water',
  'steam-burst': 'theme-steam',
};

function SkillCard({ skill }: { skill: StatusSkill }) {
  if (!skill.unlocked) {
    return (
      <div className="status-skill locked">
        <div className="status-skill-lock">🔒</div>
        <div className="status-skill-name">？？？</div>
        <div className="status-skill-unlock">Lv{skill.requiredLevel} 解鎖</div>
      </div>
    );
  }
  return (
    <div className={`status-skill ${SKILL_THEME[skill.id] ?? ''} ${skill.isNew ? 'is-new' : ''}`}>
      {skill.isNew && <div className="status-skill-new">NEW</div>}
      <div className="status-skill-cards">
        {skill.cards.map((card, i) => (
          <span key={i}>{CARD_ICONS[card]}</span>
        ))}
      </div>
      <div className="status-skill-name">{skill.name}</div>
    </div>
  );
}

export function StatusTerminalView() {
  const displayIdMatch = window.location.pathname.match(/^\/status\/([^/]+)/);
  const displayId = displayIdMatch ? displayIdMatch[1] : 'status-01';

  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState<StatusScanResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showDevCards, setShowDevCards] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    [idleTimerRef, phaseTimerRef].forEach((ref) => {
      if (ref.current) clearTimeout(ref.current);
      ref.current = null;
    });
  };

  const backToIdle = () => {
    clearTimers();
    setPhase('idle');
    setStatus(null);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };

  useEffect(
    () => () => {
      [idleTimerRef, phaseTimerRef, noticeTimerRef].forEach((ref) => {
        if (ref.current) clearTimeout(ref.current);
      });
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

      const result = data as StatusScanResponse;
      clearTimers();
      setStatus(result);
      setNotice(null);
      if (result.leveledUpSinceLastSeen) {
        setPhase('levelup');
        sfx.playVictory();
        phaseTimerRef.current = setTimeout(() => setPhase('status'), LEVEL_UP_MS);
      } else {
        setPhase('status');
      }
      idleTimerRef.current = setTimeout(backToIdle, IDLE_RESET_MS);
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

  const level = status?.level;
  const progressPercent =
    level && level.nextLevelMerit !== null
      ? Math.min(
          100,
          ((level.merit - level.currentLevelMerit) / (level.nextLevelMerit - level.currentLevelMerit)) * 100,
        )
      : 100;
  const newSkills = status?.skills.filter((skill) => skill.isNew) ?? [];

  return (
    <div className="status-root">
      {notice && <div className="status-notice">{notice}</div>}

      {phase === 'idle' && (
        <main className="status-idle">
          <div className="status-idle-crest">🛡️</div>
          <h1 className="status-idle-title">刷你的冒險者卡！</h1>
          <p className="status-idle-sub">看看你現在幾級、學會了哪些技能</p>
        </main>
      )}

      {phase === 'levelup' && status && (
        <main className="status-levelup">
          <div className="status-levelup-banner">LEVEL UP!</div>
          <div className="status-levelup-level">Lv{status.level.current}</div>
          <div className="status-levelup-name">{status.player.name}</div>
          <div className="status-levelup-skills">
            {newSkills.map((skill) => (
              <div key={skill.id} className="status-levelup-skill">
                學會了 {skill.name}！
              </div>
            ))}
          </div>
        </main>
      )}

      {phase === 'status' && status && level && (
        <main className="status-main">
          <section className="status-hero">
            <div className="status-level-badge">
              <span className="status-level-label">Lv</span>
              <span className="status-level-number">{level.current}</span>
            </div>
            <div className="status-hero-info">
              <div className="status-name">{status.player.name}</div>
              <div className="status-rank">{status.player.rank.name}</div>
              <div className="status-progress">
                <div className="status-progress-track">
                  <div className="status-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="status-progress-text">
                  {level.meritToNext === null
                    ? '已達最高等級 MAX！'
                    : `再 ${level.meritToNext} 功績升到 Lv${level.current + 1}！`}
                </div>
              </div>
              <div className="status-resources">
                <span>🪙 {status.player.gold}</span>
                <span>🎖️ {status.player.merit}</span>
                <span>
                  {status.equipment.WEAPON
                    ? itemIcon(status.equipment.WEAPON.item.iconKey, 'WEAPON')
                    : '⚔️'}{' '}
                  {status.equipment.WEAPON?.item.name ?? '沒有武器'}
                </span>
                <span>
                  {status.equipment.ARMOR ? itemIcon(status.equipment.ARMOR.item.iconKey, 'ARMOR') : '🛡️'}{' '}
                  {status.equipment.ARMOR?.item.name ?? '沒有防具'}
                </span>
              </div>
            </div>
          </section>

          <section className="status-skills">
            <h2 className="status-skills-title">我的技能卡</h2>
            {newSkills.length > 0 && <p className="status-skills-hint">🎁 請到公會領取新的技能卡！</p>}
            <div className="status-skill-grid">
              {status.skills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          </section>
        </main>
      )}

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
          DEMO_CARDS.map((card) => (
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
