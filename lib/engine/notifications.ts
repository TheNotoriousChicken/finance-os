import { prisma } from '@/lib/prisma';

export interface AppNotification {
  id: string;
  type: 'BILL_DUE' | 'BUDGET_EXCEEDED' | 'EMI_DUE';
  title: string;
  body: string;
  urgent: boolean;
}

export async function getActiveNotifications(): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];
  const now = new Date();

  try {
    // 1. Credit card bills due soon
    const cards = await prisma.paymentMethod.findMany({ where: { type: 'CREDIT_CARD', isActive: true } });
    for (const card of cards) {
      if (card.outstandingPaise > 0 && card.dueDate) {
        const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), card.dueDate);
        const daysUntil = Math.ceil((thisMonthDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil <= 5) {
          notifications.push({ id: `bill-${card.id}`, type: 'BILL_DUE', title: `${card.name} Bill Due`, body: `₹${(card.outstandingPaise / 100).toFixed(0)} due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`, urgent: daysUntil <= 2 });
        }
      }
    }

    // 2. Budget > 90%
    const budget = await prisma.budget.findFirst();
    if (budget) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const spentResult = await prisma.transaction.aggregate({ where: { type: 'EXPENSE', isRefunded: false, date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amountPaise: true } });
      const spent = spentResult._sum.amountPaise || 0;
      const pct = (spent / budget.totalLimitPaise) * 100;
      if (pct >= 90) {
        notifications.push({ id: 'budget-warn', type: 'BUDGET_EXCEEDED', title: 'Budget Warning', body: `${pct.toFixed(0)}% of monthly budget used`, urgent: pct >= 100 });
      }
    }

    // 3. EMI due within 3 days
    const upcoming = await prisma.emiInstallment.findMany({
      where: { status: 'PENDING', dueDate: { lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) } },
      include: { emiPlan: true }, take: 5
    });
    for (const inst of upcoming) {
      const daysUntil = Math.ceil((new Date(inst.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      notifications.push({ id: `emi-${inst.id}`, type: 'EMI_DUE', title: `EMI Due: ${inst.emiPlan.description}`, body: `₹${(inst.amountPaise / 100).toFixed(0)} due in ${Math.max(0, daysUntil)} days`, urgent: daysUntil <= 1 });
    }
  } catch { /* non-critical */ }

  return notifications;
}
