export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { formatPaise } from '@/lib/money';
import { TrendingUp } from 'lucide-react';
import { addEmiAction } from '@/app/actions/emi';

export default async function EmiPage() {
  const plans = await prisma.emiPlan.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }
  });

  const totalMonthlyEmi = plans.reduce((sum, p) => sum + p.emiAmountPaise, 0);

  const totalDebt = plans.reduce((sum, p) => sum + (p.emiAmountPaise * p.tenureMonths), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className=" max-w-3xl mx-auto pb-10 page-enter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">EMIs</h1>
        <p className="text-sm text-[#52525B] mt-1">Active installment plans</p>
      </div>

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
        <div className="minimal-card rounded-2xl p-5">
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-1">Monthly Obligation</p>
          <p className="text-3xl font-bold text-[#FF4757] tracking-tight">{formatPaise(totalMonthlyEmi)}</p>
        </div>
        <div className="minimal-card rounded-2xl p-5">
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-1">Total Remaining</p>
          <p className="text-3xl font-bold text-white tracking-tight">{formatPaise(totalDebt)}</p>
        </div>
      </div>

      {/* Plans */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest px-1">Active Plans</p>
        {plans.length === 0 ? (
          <div className="minimal-card rounded-2xl py-12 text-center text-sm text-[#52525B]">No active EMI plans</div>
        ) : (
          plans.map(p => (
            <div key={p.id} className="minimal-card rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,71,87,0.1)' }}>
                  <TrendingUp size={18} className="text-[#FF4757]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white">{p.description}</p>
                  <p className="text-[12px] text-[#52525B] mt-0.5">{p.tenureMonths} months · {p.interestRatePct}% p.a.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[16px] font-bold text-[#FF4757]">{formatPaise(p.emiAmountPaise)}<span className="text-[11px] font-normal text-[#52525B]">/mo</span></p>
                <p className="text-[12px] text-[#52525B] mt-0.5">{formatPaise(p.financedAmountPaise)} financed</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add new */}
      <div className="minimal-card rounded-2xl p-6">
        <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-4">Add EMI Plan</p>
        <form action={addEmiAction} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input name="description" placeholder="Item (e.g. iPhone 16)" required
            className="w-full h-11 px-4 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
            <input name="originalAmount" type="number" placeholder="Total cost (Rs.)" required
              className="w-full h-11 px-4 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            />
            <input name="months" type="number" placeholder="Months" required
              className="w-full h-11 px-4 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            />
          </div>
          <button type="submit"
            className="w-full h-11 rounded-xl text-sm font-semibold text-black bg-white hover:bg-[#E4E4E7] transition-colors active:scale-95"
          >
            Add Plan
          </button>
        </form>
      </div>
    </div>
  );
}
