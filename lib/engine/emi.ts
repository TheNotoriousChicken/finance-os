/**
 * EMI calculations — both flat rate and reducing-balance.
 * All amounts in paise.
 */

export type RateType = 'FLAT' | 'REDUCING';

export interface EmiInput {
  financedAmountPaise: number;
  tenureMonths: number;
  annualInterestRatePct: number;
  rateType: RateType;
  processingFeePaise?: number;
  gstPct?: number; // default 18%
}

export interface EmiResult {
  monthlyEmiPaise: number;
  totalInterestPaise: number;
  totalProcessingFeePaise: number;
  totalGstPaise: number;
  totalPayablePaise: number;
  effectiveAnnualRatePct: number; // approximate APR
  schedule: EmiScheduleRow[];
}

export interface EmiScheduleRow {
  installmentNo: number;
  principalPaise: number;
  interestPaise: number;
  emiAmountPaise: number;
  remainingPrincipalPaise: number;
}

/**
 * Calculate EMI for flat rate.
 * EMI = (P + P × r_monthly × n) / n
 * where r_monthly = annual_rate / 12 / 100
 */
export function calcFlatEmi(input: EmiInput): EmiResult {
  const P = input.financedAmountPaise;
  const n = input.tenureMonths;
  const rMonthly = input.annualInterestRatePct / 12 / 100;
  const processingFee = input.processingFeePaise ?? 0;
  const gstPct = input.gstPct ?? 18;

  const totalInterest = Math.round(P * rMonthly * n);
  const monthlyEmi = Math.round((P + totalInterest) / n);
  const gst = Math.round((processingFee * gstPct) / 100);
  const totalPayable = P + totalInterest + processingFee + gst;

  const monthlyInterest = Math.round(totalInterest / n);
  const monthlyPrincipal = monthlyEmi - monthlyInterest;

  const schedule: EmiScheduleRow[] = [];
  let remaining = P;
  for (let i = 1; i <= n; i++) {
    remaining = Math.max(0, remaining - monthlyPrincipal);
    schedule.push({
      installmentNo: i,
      principalPaise: monthlyPrincipal,
      interestPaise: monthlyInterest,
      emiAmountPaise: monthlyEmi,
      remainingPrincipalPaise: remaining,
    });
  }

  // Effective APR approximation for flat rate using reducing-balance equivalent
  const effectiveMonthlyRate = rMonthly * 1.846; // approximation
  const effectiveAnnualRatePct = Math.round(effectiveMonthlyRate * 12 * 100 * 10) / 10;

  return {
    monthlyEmiPaise: monthlyEmi,
    totalInterestPaise: totalInterest,
    totalProcessingFeePaise: processingFee,
    totalGstPaise: gst,
    totalPayablePaise: totalPayable,
    effectiveAnnualRatePct,
    schedule,
  };
}

/**
 * Calculate EMI for reducing-balance (standard amortization).
 * EMI = P × r(1+r)^n / ((1+r)^n - 1)
 */
export function calcReducingEmi(input: EmiInput): EmiResult {
  const P = input.financedAmountPaise;
  const n = input.tenureMonths;
  const r = input.annualInterestRatePct / 12 / 100;
  const processingFee = input.processingFeePaise ?? 0;
  const gstPct = input.gstPct ?? 18;

  let monthlyEmi: number;
  if (r === 0) {
    monthlyEmi = Math.round(P / n);
  } else {
    const factor = Math.pow(1 + r, n);
    monthlyEmi = Math.round((P * r * factor) / (factor - 1));
  }

  const gst = Math.round((processingFee * gstPct) / 100);

  const schedule: EmiScheduleRow[] = [];
  let remaining = P;
  let totalInterest = 0;

  for (let i = 1; i <= n; i++) {
    const interestPaise = Math.round(remaining * r);
    const principalPaise = Math.min(monthlyEmi - interestPaise, remaining);
    remaining = Math.max(0, remaining - principalPaise);
    totalInterest += interestPaise;
    schedule.push({
      installmentNo: i,
      principalPaise,
      interestPaise,
      emiAmountPaise: principalPaise + interestPaise,
      remainingPrincipalPaise: remaining,
    });
  }

  const totalPayable = P + totalInterest + processingFee + gst;

  return {
    monthlyEmiPaise: monthlyEmi,
    totalInterestPaise: totalInterest,
    totalProcessingFeePaise: processingFee,
    totalGstPaise: gst,
    totalPayablePaise: totalPayable,
    effectiveAnnualRatePct: Math.round(input.annualInterestRatePct * 10) / 10,
    schedule,
  };
}

export function calcEmi(input: EmiInput): EmiResult {
  return input.rateType === 'FLAT' ? calcFlatEmi(input) : calcReducingEmi(input);
}
