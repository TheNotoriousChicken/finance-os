/**
 * Reward engine for Tata Neu Plus HDFC Credit Card.
 * 1 NeuCoin = ₹1
 * Amounts in paise (divide by 100 for INR).
 */

export interface NeuPlusCalcInput {
  amountPaise: number;
  paymentMethodId: number;
  neuPlusCardId: number;
  merchantNormalizedName: string;
  categoryName: string;
  paymentChannel: 'SWIPE' | 'ONLINE' | 'UPI';
  isTataBrand: boolean;
  isTataNeuApp: boolean;
  isEmi: boolean;
  alreadyEarnedUpi: number; // Cap of 500 NeuCoins per month for UPI
}

export interface NeuPlusCalcResult {
  neuCoinsEarned: number;
  neuPassAcceleratedEarned: number;
  ruleId: string;
  isExcluded: boolean;
  excludedReason?: string;
  capApplied: boolean;
  unverifiedFlags: string[];
}

export const UPI_MONTHLY_CAP = 500;

const EXCLUDED_CATEGORIES = new Set([
  'rent', 'fuel', 'wallet', 'wallet load', 'government', 'govt', 'cash', 'fees', 'emi'
]);

export function calculateNeuCoins(input: NeuPlusCalcInput): NeuPlusCalcResult {
  const unverifiedFlags: string[] = [];

  if (input.paymentMethodId !== input.neuPlusCardId) {
    return {
      neuCoinsEarned: 0,
      neuPassAcceleratedEarned: 0,
      ruleId: 'NONE',
      isExcluded: true,
      excludedReason: 'Not Tata Neu Plus card',
      capApplied: false,
      unverifiedFlags
    };
  }

  const catLower = input.categoryName.toLowerCase();
  
  if (EXCLUDED_CATEGORIES.has(catLower) || (input.isEmi && !input.isTataBrand)) {
    return {
      neuCoinsEarned: 0,
      neuPassAcceleratedEarned: 0,
      ruleId: 'NEU_EXCLUDED',
      isExcluded: true,
      excludedReason: `Category excluded: ${input.categoryName}`,
      capApplied: false,
      unverifiedFlags
    };
  }

  const amountINR = Math.floor(input.amountPaise / 100);
  let baseRate = 0.01; // 1%
  let ruleId = 'NEU_BASE_1';
  let isUpi = input.paymentChannel === 'UPI';
  
  if (input.isTataBrand) {
    baseRate = 0.02; // 2% on Tata brands
    ruleId = 'NEU_TATA_2';
  } else if (isUpi) {
    baseRate = 0.01; // 1% on Tata Neu UPI, others might be 0.25% or 1%
    // Assuming we don't know the exact UPI app, we'll assume 1% if verified, but let's flag if unverified
    unverifiedFlags.push('Assuming 1% for UPI, but verify if Non-TataNeu UPI earns lower.');
    ruleId = 'NEU_UPI_1';
  }

  let earned = parseFloat((amountINR * baseRate).toFixed(2));
  let capApplied = false;

  if (isUpi) {
    const upiHeadroom = Math.max(0, UPI_MONTHLY_CAP - input.alreadyEarnedUpi);
    if (earned > upiHeadroom) {
      earned = upiHeadroom;
      capApplied = true;
    }
  }

  let neuPassAcceleratedEarned = 0;
  if (input.isTataNeuApp) {
    // 5% additional for NeuPass on Tata Neu App
    neuPassAcceleratedEarned = parseFloat((amountINR * 0.05).toFixed(2));
  }

  return {
    neuCoinsEarned: earned,
    neuPassAcceleratedEarned,
    ruleId,
    isExcluded: false,
    capApplied,
    unverifiedFlags
  };
}
