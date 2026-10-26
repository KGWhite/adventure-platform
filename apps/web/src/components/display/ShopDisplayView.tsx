import { useEffect, useRef, useState } from 'react';
import { useGameEvents } from '../../hooks/useGameEvents.js';
import type { GameEvent } from '../../types/battle.js';
import type {
  EquipmentChangedData,
  ShopCatalog,
  ShopItemPreviewedData,
  ShopOffer,
  ShopPurchaseCompletedData,
  ShopScanResponse,
} from '../../types/shop.js';
import { sfx } from '../../utils/audioEffects.js';
import { itemIcon, itemStatLabel } from '../../utils/itemIcons.js';
import { SHOP_LOCK_LABELS, relockOffers } from '../../utils/shopOffers.js';
import './ShopDisplayView.css';

type DisplayState = 'IDLE' | 'WELCOME' | 'BROWSING' | 'PURCHASED';

const IDLE_AFTER_MS = 60_000;
const PURCHASE_SHOWCASE_MS = 8_000;
const EQUIP_TOAST_MS = 4_000;
const SHOWCASE_ROTATE_MS = 3_500;

interface Customer {
  id: string;
  name: string;
  gold: number;
}

// nodeId is set when the follow-mode /display shows this screen; otherwise
// the node comes from the URL (/display/shop-01)
export function ShopDisplayView({ nodeId }: { nodeId?: string } = {}) {
  const displayIdMatch = window.location.pathname.match(/^\/display\/([^/]+)/);
  const displayId = nodeId ?? (displayIdMatch ? displayIdMatch[1] : 'shop-01');

  const [catalog, setCatalog] = useState<ShopCatalog | null>(null);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [displayState, setDisplayState] = useState<DisplayState>('IDLE');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [purchase, setPurchase] = useState<ShopPurchaseCompletedData | null>(null);
  const [goldFrom, setGoldFrom] = useState<number | null>(null);
  const [equipToast, setEquipToast] = useState<EquipmentChangedData | null>(null);
  // The adventurer's offers as the shopkeeper's phone shows them
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const offersRef = useRef<ShopOffer[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showcaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/v1/shops/${displayId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ShopCatalog | null) => data && setCatalog(data))
      .catch(() => {});
  }, [displayId]);

  useEffect(() => {
    if (displayState !== 'IDLE' || !catalog?.items.length) return;
    const timer = setInterval(() => {
      setShowcaseIndex((i) => (i + 1) % catalog.items.length);
    }, SHOWCASE_ROTATE_MS);
    return () => clearInterval(timer);
  }, [displayState, catalog]);

  useEffect(() => {
    sfx.enabled = audioEnabled;
  }, [audioEnabled]);

  useEffect(
    () => () => {
      [idleTimerRef, showcaseTimerRef, toastTimerRef].forEach((ref) => {
        if (ref.current) clearTimeout(ref.current);
      });
    },
    [],
  );

  const showOffers = (next: ShopOffer[]) => {
    offersRef.current = next;
    setOffers(next);
  };

  const backToIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
    setDisplayState('IDLE');
    setCustomer(null);
    setPurchase(null);
    setEquipToast(null);
    setPreviewId(null);
    showOffers([]);
  };

  const scheduleIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(backToIdle, IDLE_AFTER_MS);
  };

  const handleGameEvent = (event: GameEvent) => {
    switch (event.type) {
      case 'player.scanned': {
        const p = event.data.player;
        if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
        setCustomer({ id: p.id, name: p.name, gold: p.gold });
        setPurchase(null);
        setDisplayState('WELCOME');
        sfx.playScan();
        scheduleIdle();
        break;
      }

      case 'shop.scanned': {
        const data = event.data as ShopScanResponse;
        if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
        setCustomer({ id: data.player.id, name: data.player.name, gold: data.player.gold });
        showOffers(data.items);
        setPreviewId(null);
        setPurchase(null);
        setDisplayState('BROWSING');
        scheduleIdle();
        break;
      }

      case 'shop.item_previewed': {
        setPreviewId((event.data as ShopItemPreviewedData).itemId);
        scheduleIdle();
        break;
      }

      case 'shop.purchase_completed': {
        const data = event.data as ShopPurchaseCompletedData;
        setGoldFrom(data.goldAfter + data.price);
        setCustomer({ id: data.playerId, name: data.playerName, gold: data.goldAfter });
        showOffers(relockOffers(offersRef.current, data.goldAfter, data.item.id));
        setPreviewId(null);
        setPurchase(data);
        setDisplayState('PURCHASED');
        sfx.playVictory();
        if (showcaseTimerRef.current) clearTimeout(showcaseTimerRef.current);
        showcaseTimerRef.current = setTimeout(
          () => setDisplayState(offersRef.current.length > 0 ? 'BROWSING' : 'WELCOME'),
          PURCHASE_SHOWCASE_MS,
        );
        scheduleIdle();
        break;
      }

      case 'station.cleared': {
        backToIdle();
        break;
      }

      case 'equipment.changed': {
        setEquipToast(event.data as EquipmentChangedData);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setEquipToast(null), EQUIP_TOAST_MS);
        scheduleIdle();
        break;
      }
    }
  };

  const { connected, transport } = useGameEvents(displayId, handleGameEvent);
  const preview = offers.find((offer) => offer.itemId === previewId) ?? null;
  const showcaseItem = catalog?.items[showcaseIndex % (catalog?.items.length || 1)];

  return (
    <div className="shop-display-root">
      <header className="shop-hud-header">
        <div className="shop-hud-title">
          <span>🏪</span>
          <span>{catalog?.name ?? 'ADVENTURER SHOP'}</span>
        </div>
        <div className="shop-hud-meta">
          <button type="button" className="shop-hud-btn" onClick={() => setAudioEnabled(!audioEnabled)}>
            {audioEnabled ? '🔊 SFX ON' : '🔇 SFX MUTED'}
          </button>
          <span className={`shop-hud-pill ${connected ? 'online' : 'offline'}`}>
            {connected ? `● LIVE (${transport.toUpperCase()})` : '○ OFFLINE'}
          </span>
        </div>
      </header>

      <main className="shop-stage">
        {displayState === 'IDLE' && (
          <div className="shop-idle">
            {showcaseItem ? (
              <div key={showcaseItem.itemId} className="shop-showcase-card">
                <div className="shop-showcase-icon">{itemIcon(showcaseItem.iconKey, showcaseItem.type)}</div>
                <div className="shop-showcase-name">{showcaseItem.name}</div>
                <div className="shop-showcase-stats">{itemStatLabel(showcaseItem)}</div>
                <div className="shop-showcase-price">🪙 {showcaseItem.price} Gold</div>
                {showcaseItem.requiredRank && (
                  <div className="shop-showcase-rank">需要 {showcaseItem.requiredRank.name}</div>
                )}
              </div>
            ) : (
              <div className="shop-showcase-card">
                <div className="shop-showcase-icon">🏪</div>
              </div>
            )}
            <p className="shop-idle-hint">請向店主出示你的冒險者卡</p>
          </div>
        )}

        {displayState === 'WELCOME' && customer && (
          <div className="shop-welcome">
            <div className="shop-welcome-title">歡迎光臨，{customer.name}！</div>
            <div className="shop-welcome-gold">🪙 {customer.gold} Gold</div>
            <p className="shop-idle-hint">挑選你喜歡的裝備吧</p>
          </div>
        )}

        {displayState === 'BROWSING' && customer && (
          <div className="shop-browse">
            <div className="shop-browse-head">
              <span className="shop-browse-name">歡迎光臨，{customer.name}！</span>
              <span className="shop-browse-gold">🪙 {customer.gold} Gold</span>
            </div>
            <div className={`shop-browse-body ${preview ? 'has-preview' : ''}`}>
              <div className="shop-browse-grid">
                {offers.map((offer) => (
                  <div
                    key={offer.itemId}
                    className={`shop-browse-offer ${offer.purchasable ? '' : 'locked'} ${
                      offer.itemId === previewId ? 'selected' : ''
                    }`}
                  >
                    <span className="shop-browse-icon">{itemIcon(offer.iconKey, offer.type)}</span>
                    <span className="shop-browse-offer-name">{offer.name}</span>
                    <span className="shop-browse-stats">{itemStatLabel(offer)}</span>
                    <span className="shop-browse-price">🪙 {offer.price}</span>
                    {offer.lockedReason && (
                      <span className={`shop-browse-lock lock-${offer.lockedReason.toLowerCase()}`}>
                        {offer.lockedReason === 'RANK_REQUIRED' && offer.requiredRank
                          ? `需要 ${offer.requiredRank.name}`
                          : SHOP_LOCK_LABELS[offer.lockedReason]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {preview && (
                <aside key={preview.itemId} className="shop-browse-preview">
                  <div className="shop-browse-preview-title">確認購買中⋯</div>
                  <div className="shop-browse-preview-icon">{itemIcon(preview.iconKey, preview.type)}</div>
                  <div className="shop-browse-preview-name">{preview.name}</div>
                  <div className="shop-browse-stats">{itemStatLabel(preview)}</div>
                  <div className="shop-browse-preview-math">
                    🪙 {customer.gold} − {preview.price} = <strong>{customer.gold - preview.price}</strong>
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {displayState === 'PURCHASED' && purchase && (
          <div className="shop-purchased">
            <div className="shop-purchased-banner">✨ GET! ✨</div>
            <div className="shop-purchased-icon">{itemIcon(purchase.item.iconKey, purchase.item.type)}</div>
            <div className="shop-purchased-name">{purchase.item.name}</div>
            <div className="shop-purchased-stats">{itemStatLabel(purchase.item)}</div>
            <div className="shop-purchased-gold">
              <span className="gold-from">🪙 {goldFrom}</span>
              <span className="gold-arrow">➜</span>
              <span className="gold-to">{purchase.goldAfter}</span>
              <span className="gold-delta">−{purchase.price}</span>
            </div>
            <div className="shop-purchased-owner">{purchase.playerName} 獲得了新裝備！</div>
          </div>
        )}

        {equipToast && (
          <div className="shop-equip-toast">
            <span className="equip-toast-title">
              {equipToast.equippedItem ? `已裝備：${equipToast.equippedItem.name}` : '已卸下裝備'}
            </span>
            <span className="equip-toast-stats">
              ATK {equipToast.attack} · DEF {equipToast.defense}
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
