import { useEffect, useRef, useState } from 'react';
import { useGameEvents } from '../../hooks/useGameEvents.js';
import type { GameEvent, PlayerInfo } from '../../types/battle.js';
import type { AdventurerLevelUpData } from '../../types/progression.js';
import type { Quest, QuestAcceptedData, QuestRewardClaimedData } from '../../types/quest.js';
import { sfx } from '../../utils/audioEffects.js';
import './GuildDisplayView.css';

type DisplayState = 'IDLE' | 'WELCOME' | 'ACCEPTED' | 'REWARD' | 'LEVEL_UP';

const IDLE_AFTER_MS = 60_000;
const SHOWCASE_MS = 6_000;

// Guild hall big screen: the quest board while idle, then the adventurer at
// the counter with quest acceptance, reward and level-up moments.
export function GuildDisplayView({ nodeId }: { nodeId?: string } = {}) {
  const displayIdMatch = window.location.pathname.match(/^\/display\/([^/]+)/);
  const displayId = nodeId ?? (displayIdMatch ? displayIdMatch[1] : 'guild-01');

  const [quests, setQuests] = useState<Quest[]>([]);
  const [displayState, setDisplayStateValue] = useState<DisplayState>('IDLE');
  // Events can arrive back to back (reward, then level-up) before a re-render
  const displayStateRef = useRef<DisplayState>('IDLE');
  const setDisplayState = (state: DisplayState) => {
    displayStateRef.current = state;
    setDisplayStateValue(state);
  };
  const [adventurer, setAdventurer] = useState<PlayerInfo | null>(null);
  const [accepted, setAccepted] = useState<QuestAcceptedData | null>(null);
  const [reward, setReward] = useState<QuestRewardClaimedData | null>(null);
  const [levelUp, setLevelUp] = useState<AdventurerLevelUpData | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showcaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A level-up that arrives while the reward is on screen plays right after it
  const pendingLevelUpRef = useRef<AdventurerLevelUpData | null>(null);

  useEffect(() => {
    fetch('/api/v1/quests')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Quest[]) => setQuests(data.filter((quest) => quest.enabled)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    sfx.enabled = audioEnabled;
  }, [audioEnabled]);

  useEffect(
    () => () => {
      [idleTimerRef, showcaseTimerRef].forEach((ref) => {
        if (ref.current) clearTimeout(ref.current);
      });
    },
    [],
  );

  const scheduleIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setDisplayState('IDLE');
      setAdventurer(null);
      pendingLevelUpRef.current = null;
    }, IDLE_AFTER_MS);
  };

  const showcase = (state: DisplayState) => {
    setDisplayState(state);
    if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
    showcaseTimerRef.current = setTimeout(() => {
      const pending = pendingLevelUpRef.current;
      if (pending) {
        pendingLevelUpRef.current = null;
        setLevelUp(pending);
        sfx.playVictory();
        showcase('LEVEL_UP');
      } else {
        setDisplayState('WELCOME');
      }
    }, SHOWCASE_MS);
    scheduleIdle();
  };

  const handleGameEvent = (event: GameEvent) => {
    switch (event.type) {
      case 'player.scanned': {
        const player = event.data.player as PlayerInfo;
        // The guild counter rescans to refresh; only greet a new adventurer
        if (player.id !== adventurer?.id || displayStateRef.current === 'IDLE') {
          if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
          pendingLevelUpRef.current = null;
          setDisplayState('WELCOME');
          sfx.playScan();
        }
        setAdventurer(player);
        scheduleIdle();
        break;
      }

      case 'quest.accepted': {
        setAccepted(event.data as QuestAcceptedData);
        sfx.playScan();
        showcase('ACCEPTED');
        break;
      }

      case 'quest.reward_claimed': {
        const data = event.data as QuestRewardClaimedData;
        setReward(data);
        setAdventurer((prev) =>
          prev && prev.id === data.playerId
            ? { ...prev, gold: prev.gold + data.rewardGold, merit: prev.merit + data.rewardMerit }
            : prev,
        );
        sfx.playVictory();
        showcase('REWARD');
        break;
      }

      case 'adventurer.level_up': {
        const data = event.data as AdventurerLevelUpData;
        setAdventurer((prev) => (prev && prev.id === data.playerId ? { ...prev, level: data.toLevel } : prev));
        if (displayStateRef.current === 'REWARD') {
          pendingLevelUpRef.current = data;
        } else {
          setLevelUp(data);
          sfx.playVictory();
          showcase('LEVEL_UP');
        }
        break;
      }
    }
  };

  const { connected, transport } = useGameEvents(displayId, handleGameEvent);

  return (
    <div className="guild-display-root">
      <header className="guild-hud-header">
        <div className="guild-hud-title">
          <span>🏛</span>
          <span>ADVENTURER GUILD</span>
        </div>
        <div className="guild-hud-meta">
          <button type="button" className="guild-hud-btn" onClick={() => setAudioEnabled(!audioEnabled)}>
            {audioEnabled ? '🔊 SFX ON' : '🔇 SFX MUTED'}
          </button>
          <span className={`guild-hud-pill ${connected ? 'online' : 'offline'}`}>
            {connected ? `● LIVE (${transport.toUpperCase()})` : '○ OFFLINE'}
          </span>
        </div>
      </header>

      <main className="guild-stage">
        {displayState === 'IDLE' && (
          <div className="guild-board">
            <h1 className="guild-board-title">📜 公會委託告示板</h1>
            <div className="guild-board-grid">
              {quests.length === 0 && <div className="guild-board-empty">目前沒有招募中的委託</div>}
              {quests.map((quest) => (
                <div key={quest.id} className="guild-board-note">
                  <div className="guild-board-note-title">{quest.title}</div>
                  <p className="guild-board-note-desc">{quest.description}</p>
                  <div className="guild-board-note-rewards">
                    <span>🪙 {quest.rewardGold}</span>
                    <span>🎖️ {quest.rewardMerit}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="guild-hint">請向公會櫃台出示你的冒險者卡</p>
          </div>
        )}

        {displayState === 'WELCOME' && adventurer && (
          <div className="guild-welcome">
            <div className="guild-welcome-title">歡迎回到公會，{adventurer.name}！</div>
            <div className="guild-welcome-level">Lv {adventurer.level}</div>
            <div className="guild-welcome-stats">
              <span>❤️ {adventurer.hp} / {adventurer.maxHp}</span>
              <span>🪙 {adventurer.gold}</span>
              <span>🎖️ {adventurer.merit}</span>
            </div>
            <p className="guild-hint">和櫃台人員一起挑選委託吧</p>
          </div>
        )}

        {displayState === 'ACCEPTED' && accepted && (
          <div className="guild-moment">
            <div className="guild-moment-banner">📜 委託接取！</div>
            <div className="guild-moment-title">{accepted.questTitle ?? '公會委託'}</div>
            <div className="guild-moment-sub">{accepted.playerName ?? adventurer?.name}，出發吧！</div>
          </div>
        )}

        {displayState === 'REWARD' && reward && (
          <div className="guild-moment guild-moment-reward">
            <div className="guild-moment-banner">✨ QUEST CLEAR! ✨</div>
            <div className="guild-moment-rewards">
              <span>🪙 +{reward.rewardGold}</span>
              <span>🎖️ +{reward.rewardMerit}</span>
            </div>
            <div className="guild-moment-sub">{adventurer?.name} 完成了公會委託！</div>
          </div>
        )}

        {displayState === 'LEVEL_UP' && levelUp && (
          <div className="guild-moment guild-moment-levelup">
            <div className="guild-moment-banner">LEVEL UP!</div>
            <div className="guild-moment-level">Lv{levelUp.toLevel}</div>
            <div className="guild-moment-sub">{levelUp.playerName}</div>
            {levelUp.unlockedSkills.map((skill) => (
              <div key={skill.id} className="guild-moment-skill">
                學會了 {skill.name}！
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
