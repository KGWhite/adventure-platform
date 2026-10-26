import type { ShopOffer } from '../types/shop.js';

export const SHOP_LOCK_LABELS: Record<NonNullable<ShopOffer['lockedReason']>, string> = {
  ALREADY_OWNED: '已擁有',
  RANK_REQUIRED: '階級不足',
  INSUFFICIENT_GOLD: '金幣不足',
};

// After a purchase: the bought item becomes owned and the rest are re-checked
// against the remaining gold (rank locks do not change). Used by the shop
// phone and the shop display so both show the same offers.
export function relockOffers(offers: ShopOffer[], gold: number, ownedItemId: string): ShopOffer[] {
  return offers.map((offer) => {
    if (offer.itemId === ownedItemId || offer.lockedReason === 'ALREADY_OWNED') {
      return { ...offer, purchasable: false, lockedReason: 'ALREADY_OWNED' };
    }
    if (offer.lockedReason === 'RANK_REQUIRED') return offer;
    const affordable = gold >= offer.price;
    return {
      ...offer,
      purchasable: affordable,
      lockedReason: affordable ? null : 'INSUFFICIENT_GOLD',
    };
  });
}
