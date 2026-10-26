import { useEffect, useRef, useState } from 'react';
import { useGameEvents } from '../../hooks/useGameEvents.js';
import type { GameEvent } from '../../types/battle.js';
import type { AdventurerLevelUpData } from '../../types/progression.js';
import type {
  GuildScanResponse,
  PlayerQuest,
  Quest,
  QuestAcceptedData,
  QuestRewardClaimedData,
} from '../../types/quest.js';
import type { EquipmentChangedData, EquipmentSlot } from '../../types/shop.js';
import { sfx } from '../../utils/audioEffects.js';
import { SLOT_LABELS, itemIcon, itemStatLabel } from '../../utils/itemIcons.js';
import './GuildDisplayView.css';

type DisplayState = 'IDLE' | 'COUNTER' | 'ACCEPTED' | 'REWARD' | 'LEVEL_UP';

const IDLE_AFTER_MS = 60_000;
const SHOWCASE_MS = 6_000;
const SLOTS: EquipmentSlot[] = ['WEAPON', 'ARMOR'];

interface QuestProgressData {
  playerQuestId: string;
  playerId: string;
  progress: number;
  targetCount: number;
}

function questTarget(quest: Quest) {
  return `擊敗 ${quest.targetId === 'boss-01' ? '黑騎士' : quest.targetId} × ${quest.targetCount}`;
}

// Guild hall big screen: the quest board while idle; once the counter scans
// a card it mirrors the counter view (status, equipment, quests) and plays
// quest acceptance, reward and level-up moments.
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
  // The counter view as the guild phone shows it
  const [view, setViewValue] = useState<GuildScanResponse | null>(null);
  const viewRef = useRef<GuildScanResponse | null>(null);
  const setView = (next: GuildScanResponse | null) => {
    viewRef.current = next;
    setViewValue(next);
  };
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

  const backToIdle = () => {
    [idleTimerRef, showcaseTimerRef].forEach((ref) => {
      if (ref.current) clearTimeout(ref.current);
    });
    pendingLevelUpRef.current = null;
    setDisplayState('IDLE');
    setView(null);
  };

  const scheduleIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(backToIdle, IDLE_AFTER_MS);
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
        setDisplayState(viewRef.current ? 'COUNTER' : 'IDLE');
      }
    }, SHOWCASE_MS);
    scheduleIdle();
  };

  // Applies a change to the mirrored counter view of the given adventurer
  const updateView = (playerId: string, change: (current: GuildScanResponse) => GuildScanResponse) => {
    const current = viewRef.current;
    if (current && current.player.id === playerId) setView(change(current));
  };

  const updateActiveQuest = (data: QuestProgressData, status: PlayerQuest['status']) =>
    updateView(data.playerId, (current) =>
      current.activeQuest && current.activeQuest.id === data.playerQuestId
        ? { ...current, activeQuest: { ...current.activeQuest, progress: data.progress, status } }
        : current,
    );

  const handleGameEvent = (event: GameEvent) => {
    switch (event.type) {
      case 'guild.scanned': {
        const data = event.data as GuildScanResponse;
        // The counter rescans to refresh; only greet a new adventurer
        if (data.player.id !== viewRef.current?.player.id || displayStateRef.current === 'IDLE') {
          if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
          pendingLevelUpRef.current = null;
          setDisplayState('COUNTER');
          sfx.playScan();
        }
        setView(data);
        scheduleIdle();
        break;
      }

      case 'quest.accepted': {
        const data = event.data as QuestAcceptedData;
        updateView(data.playerId, (current) => ({
          ...current,
          activeQuest: {
            id: data.playerQuestId,
            playerId: data.playerId,
            questId: data.questId,
            quest: current.availableQuests.find((quest) => quest.id === data.questId),
            progress: 0,
            targetCount: data.targetCount,
            status: 'accepted',
            acceptedAt: event.timestamp,
            completedAt: null,
            claimedAt: null,
          },
        }));
        setAccepted(data);
        sfx.playScan();
        showcase('ACCEPTED');
        break;
      }

      case 'quest.progress_updated': {
        updateActiveQuest(event.data as QuestProgressData, 'accepted');
        break;
      }

      case 'quest.completed': {
        updateActiveQuest(event.data as QuestProgressData, 'completed');
        break;
      }

      case 'quest.reward_claimed': {
        const data = event.data as QuestRewardClaimedData;
        updateView(data.playerId, (current) => ({
          ...current,
          player: {
            ...current.player,
            gold: current.player.gold + data.rewardGold,
            merit: current.player.merit + data.rewardMerit,
          },
          activeQuest: current.activeQuest ? { ...current.activeQuest, status: 'claimed' } : null,
        }));
        setReward(data);
        sfx.playVictory();
        showcase('REWARD');
        break;
      }

      case 'adventurer.level_up': {
        const data = event.data as AdventurerLevelUpData;
        updateView(data.playerId, (current) => ({
          ...current,
          player: { ...current.player, level: data.toLevel },
        }));
        if (displayStateRef.current === 'REWARD') {
          pendingLevelUpRef.current = data;
        } else {
          setLevelUp(data);
          sfx.playVictory();
          showcase('LEVEL_UP');
        }
        break;
      }

      case 'equipment.changed': {
        const data = event.data as EquipmentChangedData;
        updateView(data.playerId, (current) => {
          if (!current.inventory) return current;
          const entry = data.equippedItem
            ? (current.inventory.items.find((owned) => owned.item.id === data.equippedItem?.id) ?? null)
            : null;
          return {
            ...current,
            inventory: {
              ...current.inventory,
              equipment: { ...current.inventory.equipment, [data.slot]: entry },
              attack: data.attack,
              defense: data.defense,
            },
          };
        });
        scheduleIdle();
        break;
      }

      case 'station.cleared': {
        backToIdle();
        break;
      }
    }
  };

  const { connected, transport } = useGameEvents(displayId, handleGameEvent);

  const adventurer = view?.player;
  const activeQuest = view?.activeQuest ?? null;

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

        {displayState === 'COUNTER' && view && adventurer && (
          <div className="guild-counter">
            <section className="guild-panel guild-status">
              <div className="guild-status-head">
                <div className="guild-status-level">
                  <span>Lv</span>
                  {adventurer.level}
                </div>
                <div>
                  <div className="guild-status-name">{adventurer.name}</div>
                  <div className="guild-status-rank">{adventurer.rank}</div>
                </div>
              </div>
              <div className="guild-status-hp">
                <span>❤️ HP</span>
                <span>
                  {adventurer.hp} / {adventurer.maxHp}
                </span>
              </div>
              <div className="guild-meter">
                <div
                  className="guild-meter-fill hp"
                  style={{ width: `${Math.min(100, Math.max(0, (adventurer.hp / adventurer.maxHp) * 100))}%` }}
                />
              </div>
              <div className="guild-status-resources">
                <span>🪙 {adventurer.gold}</span>
                <span>🎖️ {adventurer.merit}</span>
              </div>

              {view.inventory && (
                <div className="guild-equipment">
                  <div className="guild-panel-title">
                    🎒 裝備
                    <span className="guild-equipment-stats">
                      ATK {view.inventory.attack} · DEF {view.inventory.defense}
                    </span>
                  </div>
                  <div className="guild-equipment-slots">
                    {SLOTS.map((slot) => {
                      const entry = view.inventory?.equipment[slot] ?? null;
                      return (
                        <div key={slot} className={`guild-equipment-slot ${entry ? 'filled' : ''}`}>
                          <span className="guild-equipment-label">{SLOT_LABELS[slot]}</span>
                          <span className="guild-equipment-icon">
                            {entry ? itemIcon(entry.item.iconKey, slot) : '—'}
                          </span>
                          <span className="guild-equipment-name">{entry ? entry.item.name : '空'}</span>
                          {entry && <span className="guild-equipment-item-stats">{itemStatLabel(entry.item)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="guild-panel guild-quests">
              {activeQuest && activeQuest.status === 'completed' && (
                <div className="guild-quest-active completed">
                  <div className="guild-quest-badge">✨ QUEST COMPLETE ✨</div>
                  <div className="guild-quest-title">{activeQuest.quest?.title ?? '公會委託'}</div>
                  <div className="guild-meter">
                    <div className="guild-meter-fill complete" style={{ width: '100%' }} />
                  </div>
                  <div className="guild-quest-rewards">
                    <span>🪙 +{activeQuest.quest?.rewardGold ?? 0}</span>
                    <span>🎖️ +{activeQuest.quest?.rewardMerit ?? 0}</span>
                  </div>
                  <p className="guild-hint">報酬領取中，請稍候</p>
                </div>
              )}

              {activeQuest && activeQuest.status === 'accepted' && (
                <div className="guild-quest-active">
                  <div className="guild-quest-badge">⚔️ 進行中委託</div>
                  <div className="guild-quest-title">{activeQuest.quest?.title ?? '公會委託'}</div>
                  {activeQuest.quest && <div className="guild-quest-target">目標：{questTarget(activeQuest.quest)}</div>}
                  <div className="guild-quest-progress">
                    <span>討伐進度</span>
                    <span>
                      {activeQuest.progress} / {activeQuest.targetCount}
                    </span>
                  </div>
                  <div className="guild-meter">
                    <div
                      className="guild-meter-fill"
                      style={{ width: `${Math.min(100, (activeQuest.progress / activeQuest.targetCount) * 100)}%` }}
                    />
                  </div>
                  <div className="guild-quest-rewards">
                    <span>🪙 {activeQuest.quest?.rewardGold ?? 0}</span>
                    <span>🎖️ {activeQuest.quest?.rewardMerit ?? 0}</span>
                  </div>
                </div>
              )}

              {activeQuest && activeQuest.status === 'claimed' && (
                <div className="guild-quest-active claimed">
                  <div className="guild-quest-badge">✅ 委託已完成並領獎</div>
                  <div className="guild-quest-title">{activeQuest.quest?.title ?? '公會委託'}</div>
                </div>
              )}

              {!activeQuest && (
                <>
                  <div className="guild-panel-title">📜 可接取委託</div>
                  <div className="guild-quest-list">
                    {view.availableQuests.length === 0 && (
                      <div className="guild-board-empty">目前沒有招募中的委託</div>
                    )}
                    {view.availableQuests.map((quest) => (
                      <div key={quest.id} className="guild-quest-entry">
                        <div className="guild-quest-entry-title">{quest.title}</div>
                        <div className="guild-quest-target">目標：{questTarget(quest)}</div>
                        <div className="guild-quest-rewards">
                          <span>🪙 {quest.rewardGold}</span>
                          <span>🎖️ {quest.rewardMerit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
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
