import { useEffect, useRef, useState } from 'react';
import { useNfcScanner } from '../../hooks/useNfcScanner.js';
import { useQrScanner } from '../../hooks/useQrScanner.js';
import type {
  Equipment,
  PurchaseResponse,
  ShopOffer,
  ShopPlayer,
  ShopScanResponse,
} from '../../types/shop.js';
import { SLOT_LABELS, itemIcon, itemStatLabel } from '../../utils/itemIcons.js';
import { apiFetch } from '../../utils/apiFetch.js';
import { SHOP_LOCK_LABELS, relockOffers } from '../../utils/shopOffers.js';
import { playScanFeedback } from '../../utils/scanFeedback.js';
import { WRONG_CARD_FOR_IDENTITY, parseScanPayload } from '../../utils/scanPayload.js';
import './BossActorView.css';
import './ShopActorView.css';

const IDLE_RESET_MS = 60_000;

const DEMO_CARDS = [
  { name: 'Aria', cred: 'cred-demo-001' },
  { name: 'Leon', cred: 'cred-demo-002' },
  { name: 'Rookie', cred: 'ADV-DEV-001-QR' },
];

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface ShopActorViewProps {
  // Shop to operate when embedded in the /staff console; defaults to the URL
  nodeId?: string;
  embedded?: boolean;
  // False while another /staff station is shown: the camera is released
  active?: boolean;
}

export function ShopActorView({ nodeId, embedded = false, active = true }: ShopActorViewProps = {}) {
  const shopIdMatch = window.location.pathname.match(/^\/actor\/shop\/([^/]+)/);
  const shopId = nodeId ?? (shopIdMatch ? shopIdMatch[1] : 'shop-01');

  const [shopName, setShopName] = useState<string>('Adventurer Shop');
  const [credentialInput, setCredentialInput] = useState<string>('cred-demo-001');
  const [scannerMode, setScannerMode] = useState<'manual' | 'camera' | 'nfc'>('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [credential, setCredential] = useState<string | null>(null);
  const [player, setPlayer] = useState<ShopPlayer | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [offers, setOffers] = useState<ShopOffer[]>([]);

  const [selected, setSelected] = useState<ShopOffer | null>(null);
  const [equipNow, setEquipNow] = useState(true);
  const requestIdRef = useRef<string>(newRequestId());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetch(`/api/v1/shops/${shopId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.name && setShopName(data.name))
      .catch(() => {});
  }, [shopId]);

  // Mirror the shopkeeper's confirmation step on the shop display
  const previewOnDisplay = (itemId: string | null) => {
    apiFetch(`/api/v1/shops/${shopId}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, displayId: shopId }),
    }).catch(() => {});
  };

  const resetForNext = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // Send the shop display back to its idle showcase
    apiFetch('/api/v1/stage/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: shopId }),
    }).catch(() => {});
    setCredential(null);
    setPlayer(null);
    setEquipment(null);
    setOffers([]);
    setSelected(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const touchIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(resetForNext, IDLE_RESET_MS);
  };

  useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (selected) confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selected]);

  const scanCard = async (value?: string) => {
    const credentialValue = (value ?? credentialInput).trim();
    if (!credentialValue) {
      setErrorMsg('請輸入或掃描冒險者憑證。');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch(`/api/v1/shops/${shopId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialValue, displayId: shopId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `掃描失敗 (${res.status})`);

      const scan = data as ShopScanResponse;
      setShopName(scan.shop.name);
      setCredential(credentialValue);
      setPlayer(scan.player);
      setEquipment(scan.equipment);
      setOffers(scan.items);
      touchIdleTimer();
    } catch (err: any) {
      setErrorMsg(err.message || '掃描時發生錯誤。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentityPayload = (raw: string) => {
    const payload = parseScanPayload(raw);
    if (payload.kind === 'card') {
      setErrorMsg(WRONG_CARD_FOR_IDENTITY);
      return;
    }
    setCredentialInput(payload.value);
    scanCard(payload.value);
  };

  const { videoRef, cameraActive, cameraError, startCamera, stopCamera } = useQrScanner(handleIdentityPayload);
  const { nfcSupported, nfcActive, nfcError, startNfc, stopNfc } = useNfcScanner(handleIdentityPayload, 3000);

  useEffect(() => {
    if (!active) {
      stopCamera();
      stopNfc();
    }
  }, [active, stopCamera, stopNfc]);

  // One identity card per customer: stop NFC once an adventurer is served
  useEffect(() => {
    if (player) stopNfc();
  }, [player, stopNfc]);

  const openConfirm = (offer: ShopOffer) => {
    if (!offer.purchasable) return;
    requestIdRef.current = newRequestId();
    setSelected(offer);
    previewOnDisplay(offer.itemId);
    setEquipNow(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    touchIdleTimer();
  };

  const confirmPurchase = async () => {
    if (!selected || !credential) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/v1/shops/${shopId}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialValue: credential,
          itemId: selected.itemId,
          equip: equipNow,
          requestId: requestIdRef.current,
          displayId: shopId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `購買失敗 (${res.status})`);

      const result = data as PurchaseResponse;
      setPlayer(result.player);
      setEquipment(result.equipment);
      setOffers((prev) => relockOffers(prev, result.player.gold, result.item.id));
      setSuccessMsg(
        `✅ ${result.item.name} 購買成功${result.equipped ? '並已裝備' : ''}！剩餘 ${result.player.gold} Gold`,
      );
      setSelected(null);
    } catch (err: any) {
      setErrorMsg(err.message || '購買時發生錯誤。');
    } finally {
      setIsLoading(false);
      touchIdleTimer();
    }
  };

  return (
    <div className="boss-actor-root">
      {!embedded && (
        <header className="actor-topbar">
          <div className="topbar-branding">
            <span className="branding-icon">🏪</span>
            <div>
              <h1 className="branding-title">SHOP KEEPER TERMINAL</h1>
              <span className="branding-subtitle">{shopName}</span>
            </div>
          </div>
          <a href={`/display/${shopId}`} target="_blank" rel="noreferrer" className="open-display-link">
            📺 Open Display
          </a>
        </header>
      )}

      <main className="actor-main-content">
        {errorMsg && (
          <div className="actor-alert actor-alert-error">
            <span>⚠️ {errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="alert-close-btn">
              ×
            </button>
          </div>
        )}
        {successMsg && <div className="actor-alert shop-alert-success">{successMsg}</div>}

        {!player && (
          <section className="actor-card section-scanner">
            <div className="section-header-row">
              <span className="section-title">等待冒險者 · SCAN ADVENTURE CARD</span>
              <div className="tab-pill-group">
                <button
                  type="button"
                  className={`tab-pill ${scannerMode === 'manual' ? 'active' : ''}`}
                  onClick={() => {
                    setScannerMode('manual');
                    stopCamera();
                    stopNfc();
                  }}
                >
                  ⌨️ Manual
                </button>
                <button
                  type="button"
                  className={`tab-pill ${scannerMode === 'camera' ? 'active' : ''}`}
                  onClick={() => {
                    setScannerMode('camera');
                    stopNfc();
                    startCamera();
                  }}
                >
                  📷 Camera
                </button>
                {nfcSupported && (
                  <button
                    type="button"
                    className={`tab-pill ${scannerMode === 'nfc' ? 'active' : ''}`}
                    onClick={() => {
                      setScannerMode('nfc');
                      stopCamera();
                      startNfc();
                    }}
                  >
                    📶 NFC
                  </button>
                )}
              </div>
            </div>

            {scannerMode === 'nfc' && (
              <div className="nfc-identity-box">
                {nfcActive ? (
                  <p className="nfc-identity-hint">📶 請將冒險者卡靠近手機背面⋯</p>
                ) : (
                  <button type="button" onClick={startNfc} className="actor-btn actor-btn-sm">
                    開始 NFC 感應
                  </button>
                )}
                {nfcError && <p className="card-reader-error">{nfcError}</p>}
              </div>
            )}

            {scannerMode === 'camera' && (
              <div className="camera-viewfinder-box">
                {cameraError ? (
                  <div className="camera-error-notice">
                    <p>{cameraError}</p>
                    <button type="button" onClick={startCamera} className="actor-btn actor-btn-sm">
                      Retry Camera
                    </button>
                  </div>
                ) : (
                  cameraActive && (
                    <div className="video-container">
                      <video ref={videoRef} playsInline muted autoPlay className="scanner-video" />
                      <div className="viewfinder-overlay">
                        <div className="viewfinder-reticle">
                          <div className="reticle-laser" />
                        </div>
                        <p className="reticle-hint">將鏡頭對準冒險者卡 QR Code</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {scannerMode === 'manual' && (
              <div className="manual-input-box">
                <div className="quick-presets-row">
                  <span className="presets-label">Demo Cards:</span>
                  {DEMO_CARDS.map((card) => (
                    <button
                      key={card.cred}
                      type="button"
                      className="preset-btn"
                      onClick={() => {
                        setCredentialInput(card.cred);
                        playScanFeedback();
                        scanCard(card.cred);
                      }}
                    >
                      {card.name} ({card.cred})
                    </button>
                  ))}
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
                      scanCard();
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? '辨識中...' : '🔍 辨識冒險者'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {player && equipment && (
          <>
            <section className="actor-card shop-customer-card">
              <div className="challenger-main-row">
                <div className="challenger-icon">🧒</div>
                <div className="challenger-details">
                  <div className="challenger-name">{player.name}</div>
                  <div className="challenger-meta">
                    {player.rank.name} · ATK {player.attack} · DEF {player.defense}
                  </div>
                  <div className="challenger-economy">
                    <span>🪙 {player.gold} Gold</span>
                  </div>
                </div>
              </div>
              <div className="shop-equipment-row">
                {(['WEAPON', 'ARMOR'] as const).map((slot) => {
                  const entry = equipment[slot];
                  return (
                    <div key={slot} className="shop-equipment-slot">
                      <span className="shop-slot-label">{SLOT_LABELS[slot]}</span>
                      <span className="shop-slot-value">
                        {entry ? `${itemIcon(entry.item.iconKey, slot)} ${entry.item.name}` : '— 空 —'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="actor-btn actor-btn-sm shop-next-btn" onClick={resetForNext}>
                🔄 下一位
              </button>
            </section>

            <section className="actor-card">
              <span className="section-title">商品清單 · ITEMS</span>
              <div className="shop-offer-list">
                {offers.map((offer) => (
                  <button
                    key={offer.itemId}
                    type="button"
                    className={`shop-offer ${offer.purchasable ? '' : 'locked'} ${
                      selected?.itemId === offer.itemId ? 'selected' : ''
                    }`}
                    onClick={() => openConfirm(offer)}
                    disabled={!offer.purchasable || isLoading}
                  >
                    <span className="shop-offer-icon">{itemIcon(offer.iconKey, offer.type)}</span>
                    <span className="shop-offer-main">
                      <span className="shop-offer-name">{offer.name}</span>
                      <span className="shop-offer-stats">{itemStatLabel(offer)}</span>
                    </span>
                    <span className="shop-offer-side">
                      <span className="shop-offer-price">🪙 {offer.price}</span>
                      {offer.lockedReason && (
                        <span className={`shop-lock-badge lock-${offer.lockedReason.toLowerCase()}`}>
                          {offer.lockedReason === 'RANK_REQUIRED' && offer.requiredRank
                            ? `需要 ${offer.requiredRank.name}`
                            : SHOP_LOCK_LABELS[offer.lockedReason]}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {selected && (
              <section ref={confirmRef} className="actor-card shop-confirm-card">
                <span className="section-title">確認購買 · CONFIRM</span>
                <div className="shop-confirm-item">
                  <span className="shop-offer-icon">{itemIcon(selected.iconKey, selected.type)}</span>
                  <div>
                    <div className="shop-offer-name">{selected.name}</div>
                    <div className="shop-offer-stats">{itemStatLabel(selected)}</div>
                  </div>
                </div>
                <div className="shop-confirm-math">
                  <span>🪙 {player.gold}</span>
                  <span>−</span>
                  <span>{selected.price}</span>
                  <span>=</span>
                  <strong>{player.gold - selected.price} Gold</strong>
                </div>
                <label className="shop-equip-toggle">
                  <input type="checkbox" checked={equipNow} onChange={(e) => setEquipNow(e.target.checked)} />
                  購買後立即裝備
                </label>
                <div className="shop-confirm-actions">
                  <button
                    type="button"
                    className="actor-btn actor-btn-sm"
                    onClick={() => {
                      setSelected(null);
                      previewOnDisplay(null);
                    }}
                    disabled={isLoading}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="actor-btn actor-btn-danger actor-btn-lg"
                    onClick={confirmPurchase}
                    disabled={isLoading}
                  >
                    {isLoading ? '交易中...' : '💰 確認購買'}
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
