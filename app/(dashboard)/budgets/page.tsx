export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { formatPaise } from '@/lib/money';
import { saveBudgetAction } from '@/app/actions/budgets';

export default async function BudgetsPage() {
  const now = new Date();
  const cardMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [budget, spentData] = await Promise.all([
    prisma.budget.findFirst(),
    prisma.transaction.aggregate({
      where: { type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amountPaise: true }
    })
  ]);

  const limit = budget?.totalLimitPaise || 5000000; // 50k default
  const spent = spentData._sum.amountPaise || 0;
  const pct = Math.min(100, Math.round((spent / limit) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className=" max-w-2xl mx-auto pb-10 page-enter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Budget</h1>
        <p className="text-sm text-[#52525B] mt-1">{cardMonth} · Monthly spending limit</p>
      </div>

      {/* Big spend vs budget card */}
      <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg, rgba(18,18,20,0.98) 0%, rgba(10,10,12,1) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-1">Spent</p>
            <p className="text-5xl font-bold tracking-tight text-white">{formatPaise(spent)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-1">Budget</p>
            <p className="text-2xl font-semibold text-[#A1A1AA]">{formatPaise(limit)}</p>
          </div>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, pct)}%`, background: pct > 90 ? '#FF4757' : pct > 75 ? '#FFB547' : '#00D68F' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[12px]" style={{ color: pct > 90 ? '#FF4757' : '#52525B' }}>{pct.toFixed(1)}% used</span>
          <span className="text-[12px] text-[#52525B]">{formatPaise(Math.max(0, limit - spent))} remaining</span>
        </div>
        {pct >= 90 && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', color: '#FF4757' }}>
            You are nearing your budget limit.
          </div>
        )}
      </div>

      {/* Edit budget */}
      <div className="minimal-card rounded-2xl p-6">
        <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-4">Update Budget</p>
        <form action={saveBudgetAction} className="flex gap-3">
          <input type="hidden" name="month" value={cardMonth} />
          <input
            name="totalLimit"
            type="number"
            defaultValue={limit / 100}
            placeholder="Monthly limit (Rs.)"
            required
            className="flex-1 h-11 px-4 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          />
          <button
            type="submit"
            className="h-11 px-6 rounded-xl text-sm font-semibold text-black bg-white hover:bg-[#E4E4E7] transition-colors active:scale-95"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
