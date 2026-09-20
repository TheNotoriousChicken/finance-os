import { describe, it, expect } from 'vitest';
import { calcEmiSchedule } from '../emi';

describe('EMI Engine', () => {
  it('generates correct number of installments', () => {
    const schedule = calcEmiSchedule({
      financedAmountPaise: 1200000, // ₹12,000
      tenureMonths: 12,
      interestRatePct: 15,
      rateType: 'REDUCING',
      startDate: new Date('2026-01-01')
    });
    expect(schedule.installments.length).toBe(12);
  });

  it('total paid is greater than principal for non-zero interest', () => {
    const schedule = calcEmiSchedule({
      financedAmountPaise: 1000000,
      tenureMonths: 6,
      interestRatePct: 12,
      rateType: 'REDUCING',
      startDate: new Date('2026-01-01')
    });
    const totalPaid = schedule.installments.reduce((s, i) => s + i.amountPaise, 0);
    expect(totalPaid).toBeGreaterThan(1000000);
  });

  it('zero interest means total paid equals principal', () => {
    const schedule = calcEmiSchedule({
      financedAmountPaise: 600000,
      tenureMonths: 6,
      interestRatePct: 0,
      rateType: 'FLAT',
      startDate: new Date('2026-01-01')
    });
    const totalPaid = schedule.installments.reduce((s, i) => s + i.amountPaise, 0);
    expect(Math.abs(totalPaid - 600000)).toBeLessThan(10); // within rounding
  });
});
