/**
 * Money utilities — all amounts stored as integer paise.
 * ₹4,000 = 400000 paise. Divide by 100 only at display time.
 */

/** Convert rupees (number or string) to integer paise */
export function toPaise(rupees: number | string): number {
  const parsed = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(parsed)) throw new Error(`Invalid rupee amount: ${rupees}`);
  return Math.round(parsed * 100);
}

/** Convert integer paise to rupee float */
export function toRupees(paise: number): number {
  return paise / 100;
}

/** Format paise as Indian currency string */
export function formatPaise(paise: number, options?: { compact?: boolean }): string {
  const rupees = paise / 100;
  if (options?.compact) {
    if (Math.abs(rupees) >= 100000) {
      return `₹${(rupees / 100000).toFixed(1)}L`;
    }
    if (Math.abs(rupees) >= 1000) {
      return `₹${(rupees / 1000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** Format paise as plain number string without symbol */
export function formatPaiseRaw(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

/** Add paise amounts safely */
export function addPaise(...amounts: number[]): number {
  return amounts.reduce((a, b) => a + b, 0);
}

/** Calculate percentage */
export function percentOf(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100 * 10) / 10;
}
