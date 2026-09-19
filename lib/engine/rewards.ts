/**
 * MoneyBack+ CashPoints reward engine.
 * Deterministic math only — no LLM involvement.
 * All amounts in paise.
 */

export interface RewardCalcInput {
  amountPaise: number;
  paymentMethodId: number;
  moneybackCardId: number;      // The specific MoneyBack+ card ID
  merchantNormalizedName: string;
  categoryName: string;
  is10xPartner: boolean;
  isGroceryMerchant: boolean;   // Reliance Smart or BigBasket
  alreadyEarnedOverall: number; // CashPoints earned this card+month (excl this txn)
  alreadyEarnedGrocery: number; // Grocery CashPoints earned this card+month
}

export interface RewardCalcResult {
  cashpointsEarned: number;
  ruleId: string;
  isExcluded: boolean;
  excludedReason?: string;
  capApplied: boolean;
  capType?: 'overall' | 'grocery';
  unverifiedFlags: string[];
}

// Verified caps (post-May 2026)
export const MONTHLY_CAP_OVERALL = 2500;
export const MONTHLY_CAP_GROCERY = 1000;
export const POINTS_PER_BLOCK_10X = 20;     // 20 pts per ₹200
export const POINTS_PER_BLOCK_BASE = 2;     // 2 pts per ₹200
export const BLOCK_SIZE_PAISE = 20000;      // ₹200 in paise

/** Categories excluded from earning any CashPoints */
const EXCLUDED_CATEGORIES = new Set([
  'fuel',
  'rent',
  'government',
  'govt',
  'wallet load',
  'wallet',
  'gift card',
  'voucher',
  'prepaid card',
]);

/**
 * Calculate CashPoints for a single transaction.
 * This function is pure (no DB calls) — caller provides all state.
 */
export function calculateCashPoints(input: RewardCalcInput): RewardCalcResult {
  const unverifiedFlags: string[] = [];

  // 1. Only MoneyBack+ card earns points
  if (input.paymentMethodId !== input.moneybackCardId) {
    return {
      cashpointsEarned: 0,
      ruleId: 'NONE',
      isExcluded: true,
      excludedReason: 'Payment method is not the MoneyBack+ card',
      capApplied: false,
      unverifiedFlags,
    };
  }

  // 2. Check exclusions
  const catLower = input.categoryName.toLowerCase();
  const merchantLower = input.merchantNormalizedName.toLowerCase();

  if (EXCLUDED_CATEGORIES.has(catLower)) {
    return {
      cashpointsEarned: 0,
      ruleId: catLower.includes('rent') ? 'MB_EXCL_RENT'
            : catLower.includes('fuel') ? 'MB_EXCL_FUEL'
            : 'MB_EXCL_GOVT',
      isExcluded: true,
      excludedReason: `Category '${input.categoryName}' is excluded from CashPoints`,
      capApplied: false,
      unverifiedFlags,
    };
  }

  // 3. IRCTC — UNVERIFIED (could be govt exclusion or base rate)
  if (merchantLower.includes('irctc')) {
    unverifiedFlags.push('MB_IRCTC: IRCTC govt-exclusion vs base-rate is UNVERIFIED — treating as excluded pending verification');
    return {
      cashpointsEarned: 0,
      ruleId: 'MB_IRCTC_GOVT_EXCL',
      isExcluded: true,
      excludedReason: 'IRCTC classification UNVERIFIED — excluded pending HDFC T&C verification',
      capApplied: false,
      unverifiedFlags,
    };
  }

  // 4. Calculate blocks (floor division — UNVERIFIED for edge cases but floor is standard)
  const blocks = Math.floor(input.amountPaise / BLOCK_SIZE_PAISE);
  if (blocks === 0) {
    return {
      cashpointsEarned: 0,
      ruleId: 'MB_BASE',
      isExcluded: false,
      capApplied: false,
      unverifiedFlags,
    };
  }

  // 5. Determine earn rate
  if (input.is10xPartner) {
    const rawPoints = blocks * POINTS_PER_BLOCK_10X;
    let ruleId = 'MB_10X';
    let earned = rawPoints;
    let capApplied = false;
    let capType: 'overall' | 'grocery' | undefined;

    // Apply grocery sub-cap first if applicable
    if (input.isGroceryMerchant) {
      const groceryHeadroom = Math.max(0, MONTHLY_CAP_GROCERY - input.alreadyEarnedGrocery);
      if (earned > groceryHeadroom) {
        earned = groceryHeadroom;
        capApplied = true;
        capType = 'grocery';
      }
      ruleId = 'MB_10X_GROCERY';
    }

    // Apply overall cap
    const overallHeadroom = Math.max(0, MONTHLY_CAP_OVERALL - input.alreadyEarnedOverall);
    if (earned > overallHeadroom) {
      earned = overallHeadroom;
      capApplied = true;
      if (!capType) capType = 'overall';
    }

    return {
      cashpointsEarned: Math.max(0, earned),
      ruleId,
      isExcluded: false,
      capApplied,
      capType,
      unverifiedFlags,
    };
  } else {
    // Base rate — no explicit monthly cap per spec
    const earned = blocks * POINTS_PER_BLOCK_BASE;
    return {
      cashpointsEarned: earned,
      ruleId: 'MB_BASE',
      isExcluded: false,
      capApplied: false,
      unverifiedFlags,
    };
  }
}

/**
 * Calculate proportional CashPoints reversal for a partial refund.
 */
export function calculatePartialRefundReversal(
  originalCashpoints: number,
  originalAmountPaise: number,
  refundAmountPaise: number
): number {
  if (originalAmountPaise === 0) return 0;
  const proportion = refundAmountPaise / originalAmountPaise;
  return Math.floor(originalCashpoints * proportion);
}

/**
 * Estimated rupee value of CashPoints.
 * 1 CashPoint approximately ₹0.25 (statement credit / travel via SmartBuy)
 */
export function estimateRewardValue(cashpoints: number): number {
  return cashpoints * 25; // in paise (₹0.25 = 25 paise)
}
