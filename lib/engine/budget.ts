/**
 * Budget calculations.
 * All amounts in paise.
 */

export interface BudgetStatus {
  categoryId: number;
  categoryName: string;
  limitPaise: number;
  spentPaise: number;
  remainingPaise: number;
  pctUsed: number;
  projectedMonthEndPaise: number;
  projectedPctUsed: number;
  status: 'on-track' | 'warning' | 'over-budget';
}

/**
 * Calculate budget status with projected month-end spend.
 * Uses linear extrapolation based on days elapsed.
 */
export function calcBudgetStatus({
  categoryId,
  categoryName,
  limitPaise,
  spentPaise,
  daysElapsed,
  daysInMonth,
}: {
  categoryId: number;
  categoryName: string;
  limitPaise: number;
  spentPaise: number;
  daysElapsed: number;
  daysInMonth: number;
}): BudgetStatus {
  const remainingPaise = limitPaise - spentPaise;
  const pctUsed = limitPaise === 0 ? 0 : Math.round((spentPaise / limitPaise) * 1000) / 10;

  // Linear extrapolation: projected = spent / daysElapsed * daysInMonth
  const projectedMonthEndPaise =
    daysElapsed === 0
      ? 0
      : Math.round((spentPaise / daysElapsed) * daysInMonth);
  const projectedPctUsed =
    limitPaise === 0 ? 0 : Math.round((projectedMonthEndPaise / limitPaise) * 1000) / 10;

  let status: BudgetStatus['status'] = 'on-track';
  if (pctUsed >= 100 || projectedPctUsed >= 100) status = 'over-budget';
  else if (pctUsed >= 80 || projectedPctUsed >= 90) status = 'warning';

  return {
    categoryId,
    categoryName,
    limitPaise,
    spentPaise,
    remainingPaise,
    pctUsed,
    projectedMonthEndPaise,
    projectedPctUsed,
    status,
  };
}
