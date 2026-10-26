import type { LevelGuide, StatusScanResponse, StatusSkill } from '../../types/progression.js';
import { itemIcon } from '../../utils/itemIcons.js';
import { SKILL_CARD_ICONS } from '../../utils/skillCards.js';
import type { StatusPhase } from './statusPresenter.js';

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
          <span key={i}>{SKILL_CARD_ICONS[card]}</span>
        ))}
      </div>
      <div className="status-skill-name">{skill.name}</div>
    </div>
  );
}

interface StatusScreenProps {
  phase: StatusPhase;
  status: StatusScanResponse | null;
  // Level ladder shown while idle, so adventurers see what each level unlocks
  guide?: LevelGuide | null;
}

export function StatusScreen({ phase, status, guide = null }: StatusScreenProps) {
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
    <>
      {phase === 'idle' && (
        <main className={`status-idle ${guide ? 'has-guide' : ''}`}>
          <div className="status-idle-crest">🛡️</div>
          <h1 className="status-idle-title">刷你的冒險者卡！</h1>
          <p className="status-idle-sub">看看你現在幾級、學會了哪些技能</p>
          {guide && (
            <div className="status-ladder">
              {guide.levels.map((step) => (
                <div key={step.level} className="status-ladder-step">
                  <div className="status-ladder-level">Lv{step.level}</div>
                  <div className="status-ladder-merit">🎖️ {step.merit}</div>
                  <div className="status-ladder-skills">
                    {guide.skills
                      .filter((skill) => skill.requiredLevel === step.level)
                      .map((skill) => (
                        <span key={skill.id} className={`status-ladder-skill ${SKILL_THEME[skill.id] ?? ''}`}>
                          {skill.cards.map((card) => SKILL_CARD_ICONS[card]).join('')} {skill.name}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
    </>
  );
}
