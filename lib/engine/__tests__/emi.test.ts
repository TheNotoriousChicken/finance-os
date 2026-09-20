import { describe, it, expect } from 'vitest';
import { calcFlatEmi, calcReducingEmi, EmiInput } from '../emi';

const base: EmiInput = {
  financedAmountPaise: 1200000,
  tenureMonths: 12,
  annualInterestRatePct: 15,
  rateType: 'REDUCING',
};

describe('EMI Engine', () => {
  it('calcReducingEmi returns monthly EMI greater than 0', () => {
    const result = calcReducingEmi(base);
    expect(result.monthlyEmiPaise).toBeGreaterThan(0);
  });

  it('calcFlatEmi total paid is greater than principal for non-zero interest', () => {
    const result = calcFlatEmi(base);
    const totalPaid = result.schedule.reduce((s, i) => s + i.emiAmountPaise, 0);
    expect(totalPaid).toBeGreaterThan(1200000);
  });

  it('total payable with zero interest equals principal', () => {
    const result = calcFlatEmi({ ...base, annualInterestRatePct: 0, financedAmountPaise: 600000, tenureMonths: 6 });
    expect(result.totalInterestPaise).toBe(0);
    expect(result.totalPayablePaise).toBe(600000);
  });

  it('generates correct number of schedule rows', () => {
    const result = calcReducingEmi(base);
    expect(result.schedule.length).toBe(12);
  });
});
