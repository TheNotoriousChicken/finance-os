/**
 * Credit utilization calculations.
 * All amounts in paise.
 */

export interface CardUtilization {
  cardId: number;
  cardName: string;
  outstandingPaise: number;
  limitPaise: number;
  utilizationPct: number;
  tier: 'low' | 'moderate' | 'high' | 'very-high' | 'maxed';
}

export interface CombinedUtilization {
  totalOutstandingPaise: number;
  totalLimitPaise: number;
  utilizationPct: number;
  tier: 'low' | 'moderate' | 'high' | 'very-high' | 'maxed';
  cards: CardUtilization[];
}

function getTier(pct: number): CardUtilization['tier'] {
  if (pct <= 10) return 'low';
  if (pct <= 30) return 'moderate';
  if (pct <= 50) return 'high';
  if (pct <= 75) return 'very-high';
  return 'maxed';
}

export function calculateCardUtilization(card: {
  id: number;
  name: string;
  outstandingPaise: number;
  limitPaise: number | null;
}): CardUtilization {
  const limit = card.limitPaise ?? 0;
  const pct = limit === 0 ? 0 : Math.round((card.outstandingPaise / limit) * 1000) / 10;
  return {
    cardId: card.id,
    cardName: card.name,
    outstandingPaise: card.outstandingPaise,
    limitPaise: limit,
    utilizationPct: Math.min(pct, 100),
    tier: getTier(pct),
  };
}

export function calculateCombinedUtilization(cards: Array<{
  id: number;
  name: string;
  outstandingPaise: number;
  limitPaise: number | null;
  type: string;
  sharedLimitGroupId?: string | null;
}>): CombinedUtilization {
  const creditCards = cards.filter(c => c.type === 'CREDIT_CARD' && c.limitPaise);
  const cardUtils = creditCards.map(calculateCardUtilization);
  
  let totalOutstanding = 0;
  let totalLimit = 0;
  let processedGroups = new Set<string>();

  creditCards.forEach(c => {
    totalOutstanding += c.outstandingPaise;
    if (c.sharedLimitGroupId) {
      if (!processedGroups.has(c.sharedLimitGroupId)) {
         totalLimit += (c.limitPaise ?? 0);
         processedGroups.add(c.sharedLimitGroupId);
      }
    } else {
      totalLimit += (c.limitPaise ?? 0);
    }
  });

  const pct = totalLimit === 0 ? 0 : Math.round((totalOutstanding / totalLimit) * 1000) / 10;
  return {
    totalOutstandingPaise: totalOutstanding,
    totalLimitPaise: totalLimit,
    utilizationPct: Math.min(pct, 100),
    tier: getTier(pct),
    cards: cardUtils,
  };
}
export const UTILIZATION_MARKERS = [10, 30, 50, 75, 100] as const;

export const UTILIZATION_EDUCATIONAL_NOTE =
  'Credit utilization is one factor in credit score calculation. ' +
  'Lower utilization (below 30%) is generally considered favorable, but ' +
  'these are guidelines — not guaranteed rules for your specific score.';
