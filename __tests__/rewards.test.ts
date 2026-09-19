import { describe, it, expect } from 'vitest';
import { calculateCashPoints } from '@/lib/engine/rewards';

describe('Reward Engine: calculateCashPoints', () => {
  it('should calculate base rewards (2 pts per 200 spent)', () => {
    const res = calculateCashPoints({
      amountPaise: 40000, // 400 INR
      paymentMethodId: 1,
      moneybackCardId: 1,
      merchantNormalizedName: 'Generic Store',
      categoryName: 'Shopping',
      is10xPartner: false,
      isGroceryMerchant: false,
      alreadyEarnedOverall: 0,
      alreadyEarnedGrocery: 0,
    });
    expect(res.cashpointsEarned).toBe(4);
    expect(res.ruleId).toBe('MB_BASE');
  });

  it('should exclude rent and fuel', () => {
    const res = calculateCashPoints({
      amountPaise: 100000, 
      paymentMethodId: 1,
      moneybackCardId: 1,
      merchantNormalizedName: 'HPCL',
      categoryName: 'Fuel',
      is10xPartner: false,
      isGroceryMerchant: false,
      alreadyEarnedOverall: 0,
      alreadyEarnedGrocery: 0,
    });
    expect(res.cashpointsEarned).toBe(0);
    expect(res.isExcluded).toBe(true);
  });

  it('should calculate 10X partner rewards (20 pts per 200)', () => {
    const res = calculateCashPoints({
      amountPaise: 60000, // 600 INR
      paymentMethodId: 1,
      moneybackCardId: 1,
      merchantNormalizedName: 'Swiggy',
      categoryName: 'Food',
      is10xPartner: true, // Assuming Swiggy is flagged 10X
      isGroceryMerchant: false,
      alreadyEarnedOverall: 0,
      alreadyEarnedGrocery: 0,
    });
    expect(res.cashpointsEarned).toBe(60);
    expect(res.ruleId).toBe('MB_10X');
  });

  it('should enforce the overall monthly cap (2500 pts max)', () => {
    const res = calculateCashPoints({
      amountPaise: 2000000, // 20000 INR
      paymentMethodId: 1,
      moneybackCardId: 1,
      merchantNormalizedName: 'Swiggy',
      categoryName: 'Food',
      is10xPartner: true,
      isGroceryMerchant: false,
      alreadyEarnedOverall: 2400, // Only 100 points left in cap
      alreadyEarnedGrocery: 0,
    });
    // 20000 / 200 * 20 = 2000 pts. But only 100 left.
    expect(res.cashpointsEarned).toBe(100);
    expect(res.capApplied).toBe(true);
  });
});