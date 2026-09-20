import { describe, it, expect } from 'vitest';
import { calcBudgetStatus } from '../budget';

describe('Budget Engine', () => {
  it('returns on-track when spending is low', () => {
    const result = calcBudgetStatus({
      categoryId: 1,
      categoryName: 'Food',
      limitPaise: 500000,
      spentPaise: 100000,
      daysElapsed: 10,
      daysInMonth: 30
    });
    expect(result.status).toBe('on-track');
    expect(result.pctUsed).toBeCloseTo(20, 0);
  });

  it('returns over-budget when spent exceeds limit', () => {
    const result = calcBudgetStatus({
      categoryId: 1,
      categoryName: 'Food',
      limitPaise: 500000,
      spentPaise: 600000,
      daysElapsed: 15,
      daysInMonth: 30
    });
    expect(result.status).toBe('over-budget');
    expect(result.remainingPaise).toBe(-100000);
  });

  it('returns warning when projected spend exceeds limit', () => {
    const result = calcBudgetStatus({
      categoryId: 1,
      categoryName: 'Food',
      limitPaise: 500000,
      spentPaise: 350000,
      daysElapsed: 15,
      daysInMonth: 30
    });
    expect(result.projectedMonthEndPaise).toBeGreaterThan(500000);
  });
});
