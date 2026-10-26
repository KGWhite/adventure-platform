import { GuildCounter } from './GuildCounter.js';
import './GuildTerminalView.css';

// /guild tablet kiosk: the guild counter with links to the other world nodes
export function GuildTerminalView() {
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
          <a href="/actor/shop/shop-01" className="guild-nav-link" target="_blank" rel="noreferrer">
            前往商店終端 ➔
          </a>
        </div>
      </header>

      <GuildCounter />
    </div>
  );
}
