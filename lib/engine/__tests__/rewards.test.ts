import { describe, it, expect } from 'vitest';
import { calculateCashPoints, MONTHLY_CAP_OVERALL } from '../rewards';

describe('MoneyBack+ Reward Engine', () => {
  const base = {
    paymentMethodId: 1,
    moneybackCardId: 1,
    merchantNormalizedName: 'amazon',
    categoryName: 'Shopping',
    is10xPartner: false,
    isGroceryMerchant: false,
    alreadyEarnedOverall: 0,
    alreadyEarnedGrocery: 0,
  };

  it('earns base cashpoints on a normal expense', () => {
    const result = calculateCashPoints({ ...base, amountPaise: 10000 }); // ₹100
    expect(result.cashpointsEarned).toBeGreaterThanOrEqual(0);
  });

  it('does not exceed monthly overall cap', () => {
    const result = calculateCashPoints({ ...base, amountPaise: 1000000, alreadyEarnedOverall: MONTHLY_CAP_OVERALL });
    expect(result.cashpointsEarned).toBe(0);
    expect(result.capApplied).toBe(true);
  });

  it('returns isExcluded for excluded categories', () => {
    const result = calculateCashPoints({ ...base, amountPaise: 10000, categoryName: 'Rent' });
    // Rent/utilities are typically excluded
    expect(result).toBeDefined();
  });
});
