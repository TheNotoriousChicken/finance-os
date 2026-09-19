/**
 * MoneyBack+ milestone tracking.
 * Annual fee waiver + quarterly milestone voucher.
 * These are TWO SEPARATE targets — never combined.
 */

export interface MilestoneStatus {
  spentPaise: number;
  targetPaise: number;
  remainingPaise: number;
  pctComplete: number;
  periodLabel: string;
  daysRemaining: number;
  isAchieved: boolean;
}

const FEE_WAIVER_TARGET_PAISE = 5_000_000; // ₹50,000 in paise
const QUARTERLY_TARGET_PAISE = 5_000_000;  // ₹50,000 in paise

/**
 * Calculate annual fee waiver progress.
 * Card year starts on cardYearStartDate (configurable in Settings).
 */
export function calcFeeWaiverStatus({
  spentInCardYearPaise,
  cardYearStartDate,
  feeWaiverTargetPaise = FEE_WAIVER_TARGET_PAISE,
}: {
  spentInCardYearPaise: number;
  cardYearStartDate: Date;
  feeWaiverTargetPaise?: number;
}): MilestoneStatus {
  // Calculate card year end (1 year from start, exclusive)
  const cardYearEnd = new Date(cardYearStartDate);
  cardYearEnd.setFullYear(cardYearEnd.getFullYear() + 1);
  cardYearEnd.setDate(cardYearEnd.getDate() - 1);

  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((cardYearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const remaining = Math.max(0, feeWaiverTargetPaise - spentInCardYearPaise);
  const pct = Math.min(100, Math.round((spentInCardYearPaise / feeWaiverTargetPaise) * 1000) / 10);

  const startLabel = cardYearStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const endLabel = cardYearEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return {
    spentPaise: spentInCardYearPaise,
    targetPaise: feeWaiverTargetPaise,
    remainingPaise: remaining,
    pctComplete: pct,
    periodLabel: `${startLabel} - ${endLabel}`,
    daysRemaining,
    isAchieved: spentInCardYearPaise >= feeWaiverTargetPaise,
  };
}

/**
 * Calculate quarterly milestone progress.
 * Resets every calendar quarter (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec).
 */
export function calcQuarterlyMilestoneStatus({
  spentInQuarterPaise,
  quarterStart,
  quarterEnd,
  targetPaise = QUARTERLY_TARGET_PAISE,
}: {
  spentInQuarterPaise: number;
  quarterStart: Date;
  quarterEnd: Date;
  targetPaise?: number;
}): MilestoneStatus {
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((quarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const remaining = Math.max(0, targetPaise - spentInQuarterPaise);
  const pct = Math.min(100, Math.round((spentInQuarterPaise / targetPaise) * 1000) / 10);

  const startLabel = quarterStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const endLabel = quarterEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Which quarter?
  const month = quarterStart.getMonth();
  const q = Math.floor(month / 3) + 1;
  const year = quarterStart.getFullYear();

  return {
    spentPaise: spentInQuarterPaise,
    targetPaise,
    remainingPaise: remaining,
    pctComplete: pct,
    periodLabel: `Q${q} ${year} (${startLabel} - ${endLabel})`,
    daysRemaining,
    isAchieved: spentInQuarterPaise >= targetPaise,
  };
}
