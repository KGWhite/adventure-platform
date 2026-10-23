import { useState } from 'react';
import type { EquipmentSlot, Inventory, PlayerItem } from '../../types/shop.js';
import { SLOT_LABELS, itemIcon, itemStatLabel } from '../../utils/itemIcons.js';

interface GuildEquipmentPanelProps {
  inventory: Inventory | null;
  onChange: (inventory: Inventory) => void;
  onError: (message: string) => void;
}

const SLOTS: EquipmentSlot[] = ['WEAPON', 'ARMOR'];

export function GuildEquipmentPanel({ inventory, onChange, onError }: GuildEquipmentPanelProps) {
  const [busy, setBusy] = useState(false);

  if (!inventory) {
    return <div className="equipment-panel equipment-empty">裝備資料暫時無法載入。</div>;
  }

  const request = async (url: string, init: RequestInit) => {
    setBusy(true);
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `裝備操作失敗 (${res.status})`);
      onChange(data as Inventory);
    } catch (err: any) {
      onError(err.message || '裝備操作失敗。');
    } finally {
      setBusy(false);
    }
  };

  const equip = (entry: PlayerItem) =>
    request(`/api/v1/players/${inventory.playerId}/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerItemId: entry.playerItemId, displayId: 'guild-01' }),
    });

  const unequip = (slot: EquipmentSlot) =>
    request(`/api/v1/players/${inventory.playerId}/equipment/${slot}?displayId=guild-01`, {
      method: 'DELETE',
    });

  const backpack = inventory.items.filter((entry) => !entry.equipped);

  return (
    <div className="equipment-panel">
      <div className="equipment-header">
        <span className="card-section-title">🎒 裝備與背包</span>
        <span className="equipment-stats">
          ATK {inventory.attack} · DEF {inventory.defense}
        </span>
      </div>

      <div className="equipment-slots">
        {SLOTS.map((slot) => {
          const entry = inventory.equipment[slot];
          return (
            <div key={slot} className={`equipment-slot ${entry ? 'filled' : ''}`}>
              <span className="equipment-slot-label">{SLOT_LABELS[slot]}</span>
              {entry ? (
                <>
                  <span className="equipment-item-icon">{itemIcon(entry.item.iconKey, slot)}</span>
                  <span className="equipment-item-name">{entry.item.name}</span>
                  <span className="equipment-item-stats">{itemStatLabel(entry.item)}</span>
                  <button
                    type="button"
                    className="action-btn outline-btn equipment-btn"
                    disabled={busy}
                    onClick={() => unequip(slot)}
                  >
                    卸下
                  </button>
                </>
              ) : (
                <span className="equipment-item-empty">— 空 —</span>
              )}
            </div>
          );
        })}
      </div>

      {backpack.length === 0 ? (
        <p className="equipment-backpack-empty">
          {inventory.items.length === 0 ? '背包空空的，去商店逛逛吧！' : '所有裝備都已穿上。'}
        </p>
      ) : (
        <ul className="equipment-backpack">
          {backpack.map((entry) => (
            <li key={entry.playerItemId} className="equipment-backpack-item">
              <span className="equipment-item-icon">{itemIcon(entry.item.iconKey, entry.item.type)}</span>
              <span className="equipment-backpack-main">
                <span className="equipment-item-name">{entry.item.name}</span>
                <span className="equipment-item-stats">{itemStatLabel(entry.item)}</span>
              </span>
              <button
                type="button"
                className="action-btn gold-btn equipment-btn"
                disabled={busy}
                onClick={() => equip(entry)}
              >
                裝備
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
