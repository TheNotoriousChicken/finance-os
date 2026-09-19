export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { formatPaise } from '@/lib/money';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getMonthKey } from '@/lib/utils';
import { MonthlyChart } from '@/components/analytics/MonthlyChart';

export default async function AnalyticsPage() {
  const transactions = await prisma.transaction.findMany({
    where: { type: 'EXPENSE' },
    include: { category: true },
    orderBy: { date: 'asc' }
  });

  const monthlyTotals: Record<string, number> = {};
  transactions.forEach(tx => {
    const month = getMonthKey(new Date(tx.date));
    monthlyTotals[month] = (monthlyTotals[month] || 0) + tx.amountPaise;
  });

  const catTotals: Record<string, { amount: number; color: string }> = {};
  transactions.forEach(tx => {
    const catName = tx.category?.name || 'Uncategorized';
    if (!catTotals[catName]) catTotals[catName] = { amount: 0, color: tx.category?.color || '#A1A1AA' };
    catTotals[catName].amount += tx.amountPaise;
  });

  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1].amount - a[1].amount);
  const maxMonthly = Math.max(...Object.values(monthlyTotals), 1);
  const totalAllTime = transactions.reduce((sum, tx) => sum + tx.amountPaise, 0);
  const months = Object.entries(monthlyTotals);
  const latestTwo = months.slice(-2);
  const momChange = latestTwo.length === 2
    ? ((latestTwo[1][1] - latestTwo[0][1]) / latestTwo[0][1]) * 100
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className=" max-w-4xl mx-auto pb-10 page-enter">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Analytics</h1>
          <p className="text-sm text-[#52525B] mt-1">Your spending patterns at a glance</p>
        </div>
        {momChange !== 0 && (
          <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full`}
            style={{ background: momChange > 0 ? 'rgba(255,71,87,0.1)' : 'rgba(0,214,143,0.1)', color: momChange > 0 ? '#FF4757' : '#00D68F' }}>
            {momChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(momChange).toFixed(1)}% vs last month
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="minimal-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest">Monthly Spending</p>
        </div>
        <div className="p-2 pb-4">
          <MonthlyChart data={months.map(([month, amount]) => ({
            month: month,
            amount: amount / 100,
            amountFormatted: formatPaise(amount)
          }))} />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="minimal-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest">By Category</p>
        </div>
        <div className="p-4 space-y-1">
          {sortedCats.length === 0 ? (
            <div className="py-8 text-center text-[#52525B] text-sm">No data</div>
          ) : (
            sortedCats.map(([name, data]) => {
              const pct = totalAllTime > 0 ? (data.amount / totalAllTime) * 100 : 0;
              return (
                <div key={name} className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: data.color }} />
                  <span className="text-sm font-medium text-[#D4D4D8] flex-1 truncate">{name}</span>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: data.color }} />
                  </div>
                  <span className="text-[13px] font-semibold text-white w-20 text-right flex-shrink-0">{formatPaise(data.amount)}</span>
                  <span className="text-[11px] text-[#52525B] w-10 text-right flex-shrink-0">{pct.toFixed(0)}%</span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
