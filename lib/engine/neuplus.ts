/**
 * Reward engine for Tata Neu Plus HDFC Credit Card (RuPay).
 *
 * VERIFIED RULES (HDFC T&C, 2026):
 * - 1 NeuCoin = ₹1 when redeemed on Tata Neu app / Tata brand ecosystem
 * - 2% NeuCoins on Tata brand partner spends (card swipe / online)
 * - 1% NeuCoins on all other eligible card spends
 * - RuPay UPI: Up to 1% NeuCoins on eligible UPI merchant payments (capped ₹500/mo)
 *   → Only via Tata Neu UPI (linked to Tata Neu Plus card). Non-TataNeu UPI = 0 coins.
 * - ALL EMI transactions: 0 NeuCoins (regardless of brand)
 * - Excluded: Fuel, Rent, Government/Tax, Wallet loads, Utility bills (electricity/water/gas),
 *   Insurance premiums, Cash withdrawals, Quasi-cash, Gift cards, Education fees (some), Jewellery EMI
 *
 * TATA BRAND PARTNERS (2% rate):
 *   Tata Neu app, Croma, BigBasket, 1mg, Air India, Taj Hotels, Tata Cliq,
 *   Titan, Tanishq, Tata Play (formerly Tata Sky), Westside, Zudio,
 *   Tata Motors showrooms, Starbucks (Tata-operated in India), iHCL Hotels
 *
 * Amounts in paise (divide by 100 for INR).
 */

export interface NeuPlusCalcInput {
  amountPaise: number;
  paymentMethodId: number;
  neuPlusCardId: number;
  merchantNormalizedName: string;
  categoryName: string;
  /** SWIPE = physical POS / online card; UPI = via Tata Neu app RuPay UPI */
  paymentChannel: 'SWIPE' | 'ONLINE' | 'UPI';
  isTataBrand: boolean;
  /** True only when paying via Tata Neu app UPI (not generic UPI apps) */
  isTataNeuApp: boolean;
  isEmi: boolean;
  /** NeuCoins already earned via UPI this calendar month (for 500/mo cap) */
  alreadyEarnedUpi: number;
}

export interface NeuPlusCalcResult {
  neuCoinsEarned: number;
  /** Additional coins from NeuPass membership (optional accelerated tier) */
  neuPassAcceleratedEarned: number;
  ruleId: string;
  isExcluded: boolean;
  excludedReason?: string;
  capApplied: boolean;
  capType?: 'upi_monthly';
  unverifiedFlags: string[];
}

export const UPI_MONTHLY_CAP = 500; // Max NeuCoins earned via UPI per calendar month

/**
 * Tata brand partner merchant keywords.
 * If the normalized merchant name includes any of these → isTataBrand should be true.
 * Kept here as reference — the actual detection is done by Gemini AI upstream.
 */
export const TATA_BRAND_KEYWORDS = [
  'croma', 'bigbasket', '1mg', 'air india', 'taj ', 'tata cliq', 'titan',
  'tanishq', 'tata play', 'tata sky', 'westside', 'zudio', 'tata motors',
  'starbucks', 'tata neu', 'ihcl', 'taj hotel', 'taj resort',
] as const;

/** Categories that earn ZERO NeuCoins — verified per HDFC T&C 2026 */
const EXCLUDED_CATEGORIES = new Set([
  // Payment type exclusions
  'fuel', 'petrol', 'diesel', 'cng',
  // Housing / quasi-cash
  'rent', 'housing',
  // Government
  'government', 'govt', 'tax',
  // Financial / cash
  'wallet', 'wallet load', 'cash', 'quasi-cash',
  // Fees / vouchers
  'fees', 'gift card', 'voucher', 'prepaid card',
  // Utilities — HDFC excludes utility bills on Neu Plus
  'bills', 'utilities', 'electricity', 'water bill', 'gas bill', 'piped gas',
  // Insurance — excluded on Neu Plus
  'insurance',
  // EMI as a category (e.g. credit card EMI payment)
  'emi',
]);

/** Merchant-level exclusion patterns (checked against normalized merchant name) */
const EXCLUDED_MERCHANT_PATTERNS = [
  'irctc',     // Government rail — HDFC excludes
  'lic ',      // LIC insurance
  'starhealth', 'icici lombard', 'bajaj allianz', 'hdfc ergo', // Insurance
  'paytm wallet', 'phonepe wallet', 'amazon pay wallet', // Wallet loads
];

export function calculateNeuCoins(input: NeuPlusCalcInput): NeuPlusCalcResult {
  const unverifiedFlags: string[] = [];

  // 1. Must be the Neu Plus card
  if (input.paymentMethodId !== input.neuPlusCardId) {
    return {
      neuCoinsEarned: 0,
      neuPassAcceleratedEarned: 0,
      ruleId: 'NONE',
      isExcluded: true,
      excludedReason: 'Payment method is not the Tata Neu Plus card',
      capApplied: false,
      unverifiedFlags,
    };
  }

  const catLower = input.categoryName.toLowerCase().trim();
  const merchantLower = input.merchantNormalizedName.toLowerCase();

  // 2. ALL EMI transactions earn zero NeuCoins (regardless of brand)
  if (input.isEmi) {
    return {
      neuCoinsEarned: 0,
      neuPassAcceleratedEarned: 0,
      ruleId: 'NEU_EXCL_EMI',
      isExcluded: true,
      excludedReason: 'EMI transactions do not earn NeuCoins',
      capApplied: false,
      unverifiedFlags,
    };
  }

  // 3. Category-level exclusions
  if (EXCLUDED_CATEGORIES.has(catLower)) {
    const ruleId = catLower.includes('fuel') || catLower.includes('petrol') ? 'NEU_EXCL_FUEL'
                 : catLower.includes('rent') ? 'NEU_EXCL_RENT'
                 : catLower.includes('gov') || catLower.includes('tax') ? 'NEU_EXCL_GOVT'
                 : catLower.includes('insurance') ? 'NEU_EXCL_INSURANCE'
                 : catLower.includes('bill') || catLower.includes('util') || catLower.includes('electric') ? 'NEU_EXCL_UTILITY'
                 : 'NEU_EXCL_OTHER';
    return {
      neuCoinsEarned: 0,
      neuPassAcceleratedEarned: 0,
      ruleId,
      isExcluded: true,
      excludedReason: `Category "${input.categoryName}" is excluded from NeuCoins`,
      capApplied: false,
      unverifiedFlags,
    };
  }

  // 4. Merchant-level exclusions
  const excludedMerchant = EXCLUDED_MERCHANT_PATTERNS.find(p => merchantLower.includes(p));
  if (excludedMerchant) {
    return {
      neuCoinsEarned: 0,
      neuPassAcceleratedEarned: 0,
      ruleId: 'NEU_EXCL_MERCHANT',
      isExcluded: true,
      excludedReason: `Merchant "${input.merchantNormalizedName}" is excluded from NeuCoins`,
      capApplied: false,
      unverifiedFlags,
    };
  }

  // 5. UPI channel — only Tata Neu app UPI earns coins
  const isUpi = input.paymentChannel === 'UPI';
  if (isUpi && !input.isTataNeuApp) {
    // Non-Tata-Neu UPI apps (GPay, PhonePe, Paytm) do NOT earn NeuCoins
    // The RuPay UPI reward is ONLY via the Tata Neu app's UPI flow
    return {
      neuCoinsEarned: 0,
      neuPassAcceleratedEarned: 0,
      ruleId: 'NEU_UPI_NOT_TATANEU',
      isExcluded: true,
      excludedReason: 'NeuCoins via UPI only earned when paying through Tata Neu app — other UPI apps earn 0',
      capApplied: false,
      unverifiedFlags,
    };
  }

  // 6. Determine earn rate
  const amountINR = Math.floor(input.amountPaise / 100);
  let baseRate: number;
  let ruleId: string;

  if (input.isTataBrand) {
    baseRate = 0.02; // 2% on Tata brand partners
    ruleId = isUpi ? 'NEU_TATA_UPI_2' : 'NEU_TATA_2';
  } else if (isUpi) {
    // Tata Neu UPI at non-Tata merchant = 1% (capped 500/mo)
    baseRate = 0.01;
    ruleId = 'NEU_UPI_1';
    unverifiedFlags.push('Assumes paying via Tata Neu app UPI. Verify merchant is UPI-eligible.');
  } else {
    // All other eligible card spend
    baseRate = 0.01; // 1%
    ruleId = 'NEU_BASE_1';
  }

  let earned = Math.floor(amountINR * baseRate); // Floor to whole NeuCoins
  let capApplied = false;
  let capType: 'upi_monthly' | undefined;

  // 7. Apply UPI monthly cap
  if (isUpi) {
    const upiHeadroom = Math.max(0, UPI_MONTHLY_CAP - input.alreadyEarnedUpi);
    if (earned > upiHeadroom) {
      earned = upiHeadroom;
      capApplied = true;
      capType = 'upi_monthly';
    }
    if (input.alreadyEarnedUpi >= UPI_MONTHLY_CAP) {
      return {
        neuCoinsEarned: 0,
        neuPassAcceleratedEarned: 0,
        ruleId: 'NEU_UPI_CAP_HIT',
        isExcluded: false,
        excludedReason: undefined,
        capApplied: true,
        capType: 'upi_monthly',
        unverifiedFlags,
      };
    }
  }

  // 8. NeuPass accelerated bonus (only on Tata Neu app purchases, requires NeuPass membership)
  let neuPassAcceleratedEarned = 0;
  if (input.isTataNeuApp && input.isTataBrand) {
    // NeuPass gives additional ~5% on top for Tata Neu app purchases (membership required)
    neuPassAcceleratedEarned = Math.floor(amountINR * 0.05);
    unverifiedFlags.push('NeuPass 5% acceleration requires active NeuPass membership. Verify before counting.');
  }

  return {
    neuCoinsEarned: earned,
    neuPassAcceleratedEarned,
    ruleId,
    isExcluded: false,
    capApplied,
    capType,
    unverifiedFlags,
  };
}

/**
 * Estimated rupee value of NeuCoins.
 * 1 NeuCoin = ₹1 when redeemed on Tata Neu app / partner brands.
 * Value drops significantly if redeemed elsewhere — always note this.
 */
export function estimateNeuCoinValue(coins: number): number {
  return coins * 100; // in paise — 1 coin = ₹1 = 100 paise
}

/**
 * Check if a merchant name is a known Tata brand partner.
 * Use as a quick fallback if AI classification is unavailable.
 */
export function isTataBrandMerchant(normalizedMerchantName: string): boolean {
  const lower = normalizedMerchantName.toLowerCase();
  return TATA_BRAND_KEYWORDS.some(k => lower.includes(k));
}
