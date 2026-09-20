export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { formatPaise } from '@/lib/money';
import { saveBudgetAction, saveCategoryBudgetAction } from '@/app/actions/budgets';
import { Target } from 'lucide-react';

export default async function BudgetsPage() {
  const now = new Date();
  const cardMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [budget, spentData, categories, categorySpend, categoryBudgets] = await Promise.all([
    prisma.budget.findFirst(),
    prisma.transaction.aggregate({
      where: { type: 'EXPENSE', isRefunded: false, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amountPaise: true }
    }),
    prisma.category.findMany({ orderBy: { displayOrder: 'asc' } }),
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { type: 'EXPENSE', isRefunded: false, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amountPaise: true }
    }),
    prisma.budgetCategory.findMany({ where: { budget: { is: {} } } })
  ]);

  const limit = budget?.totalLimitPaise || 5000000;
  const spent = spentData._sum.amountPaise || 0;
  const pct = Math.min(100, Math.round((spent / limit) * 100));

  const spendByCat: Record<number, number> = {};
  categorySpend.forEach(cs => { if (cs.categoryId) spendByCat[cs.categoryId] = cs._sum.amountPaise || 0; });

  const limitByCat: Record<number, number> = {};
  categoryBudgets.forEach(cb => { limitByCat[cb.categoryId] = cb.limitPaise; });

  const activeCats = categories.filter(c => spendByCat[c.id] || limitByCat[c.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="max-w-2xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Budgets</h1>
        <p className="leading-relaxed text-sm text-[#52525B] mt-1">{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Total budget bar */}
      <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg, rgba(18,18,20,0.98) 0%, rgba(10,10,12,1) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="leading-relaxed text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-1">Spent</p>
            <p className="tabular-nums text-5xl font-bold tracking-tight text-white">{formatPaise(spent)}</p>
          </div>
          <div className="text-right">
            <p className="leading-relaxed text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-1">Budget</p>
            <p className="tabular-nums text-2xl font-bold text-[#A1A1AA]">{formatPaise(limit)}</p>
          </div>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, pct)}%`, background: pct > 90 ? '#FF4757' : pct > 75 ? '#FFB547' : '#00D68F' }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="leading-relaxed text-[12px]" style={{ color: pct > 90 ? '#FF4757' : '#52525B' }}>{pct.toFixed(1)}% used</span>
          <span className="leading-relaxed tabular-nums text-[12px] text-[#52525B]">{formatPaise(Math.max(0, limit - spent))} remaining</span>
        </div>
        {pct >= 90 && (
          <div className="leading-relaxed mt-4 px-4 py-3 rounded-xl text-sm font-normal" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', color: '#FF4757' }}>You are nearing your budget limit.</div>
        )}
      </div>

      {/* Category budgets */}
      <div className="minimal-card rounded-2xl p-6">
        <p className="leading-relaxed text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-5">Category Budgets</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {categories.map(cat => {
            const catSpent = spendByCat[cat.id] || 0;
            const catLimit = limitByCat[cat.id] || 0;
            const catPct = catLimit > 0 ? Math.min(100, Math.round((catSpent / catLimit) * 100)) : 0;
            const barColor = catPct > 90 ? '#FF4757' : catPct > 75 ? '#FFB547' : '#00D68F';
            return (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color || '#52525B' }} />
                    <span className="leading-relaxed text-[13px] font-normal text-slate-200">{cat.name}</span>
                  </div>
                  <span className="leading-relaxed text-[12px] text-[#52525B]">
                    {formatPaise(catSpent)}{catLimit > 0 ? ` / ${formatPaise(catLimit)}` : ''}
                  </span>
                </div>
                {catLimit > 0 && (
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${catPct}%`, background: barColor }} />
                  </div>
                )}
                <form action={saveCategoryBudgetAction} className="flex gap-2 mt-1">
                  <input type="hidden" name="month" value={cardMonth} />
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <input
                    name="limit"
                    type="number"
                    defaultValue={catLimit > 0 ? catLimit / 100 : ''}
                    placeholder="Set limit (₹)"
                    className="leading-relaxed flex-1 h-8 px-3 rounded-lg text-xs text-slate-200 outline-none focus:ring-1 focus:ring-white/20"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  />
                  <button type="submit" className="leading-relaxed h-8 px-4 rounded-lg text-xs font-bold text-black bg-white hover:bg-[#E4E4E7] transition-colors">
                    Save
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit total budget */}
      <div className="minimal-card rounded-2xl p-6">
        <p className="leading-relaxed text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-4">Update Total Budget</p>
        <form action={saveBudgetAction} className="flex gap-3">
          <input type="hidden" name="month" value={cardMonth} />
          <input name="totalLimit" type="number" defaultValue={limit / 100} placeholder="Monthly limit (₹)" required className="leading-relaxed flex-1 h-11 px-4 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-white/20" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }} />
          <button type="submit" className="leading-relaxed h-11 px-6 rounded-xl text-sm font-bold text-black bg-white hover:bg-[#E4E4E7] transition-colors active:scale-95">Save</button>
        </form>
      </div>
    </div>
  );
}
