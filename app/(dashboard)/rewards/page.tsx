export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { formatPaise } from '@/lib/money';
import { Star, Calculator } from 'lucide-react';
import Link from 'next/link';
import { MONTHLY_CAP_OVERALL, MONTHLY_CAP_GROCERY } from '@/lib/engine/rewards';

export default async function RewardsPage() {
  const now = new Date();
  const cardMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [rewards, pm] = await Promise.all([
    prisma.reward.findMany({
      where: { cardMonth, isReversed: false },
      include: {
        transaction: { include: { merchant: true, category: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.paymentMethod.findFirst({
      where: { isRewardEligible: true }
    })
  ]);

  const totalPoints = rewards.reduce((sum, r) => sum + r.cashpointsEarned, 0);
  const groceryPoints = rewards
    .filter(r => r.transaction.category?.name.toLowerCase().includes('grocer'))
    .reduce((sum, r) => sum + r.cashpointsEarned, 0);

  const overallPct = Math.min(100, Math.round((totalPoints / MONTHLY_CAP_OVERALL) * 100));
  const groceryPct = Math.min(100, Math.round((groceryPoints / MONTHLY_CAP_GROCERY) * 100));

  const pointValue = totalPoints * 25; // 1 point = 0.25 INR = 25 paise

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className=" max-w-3xl mx-auto pb-10 page-enter">
            <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Rewards</h1>
          <p className="text-sm text-[#52525B] mt-1">{pm?.name ?? 'MoneyBack+'} - {cardMonth}</p>
        </div>
        <Link href="/rewards/calculator" className="flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.1)' }}>
          <Calculator size={15} />
          Calculator
        </Link>
      </div>

      {/* Hero points card */}
      <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg, rgba(18,18,20,0.98) 0%, rgba(10,10,12,1) 100%)', border: '1px solid rgba(255,215,0,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,215,0,0.04)' }}>
        <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-1">CashPoints Earned</p>
        <p className="text-5xl font-bold tracking-tight" style={{ color: '#FFD700' }}>{totalPoints.toLocaleString('en-IN')}</p>
        <p className="text-sm text-[#52525B] mt-2">Worth <span className="text-white font-semibold">{formatPaise(pointValue)}</span></p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px", borderTop: '1px solid rgba(255,255,255,0.05)' }} className=" mt-6 pt-5">
          <div>
            <p className="text-[11px] text-[#52525B] uppercase tracking-widest mb-1">Overall Cap</p>
            <p className="text-sm font-semibold text-white">{totalPoints} / {MONTHLY_CAP_OVERALL}</p>
            <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: `${overallPct}%`, background: overallPct >= 90 ? '#FF4757' : '#FFD700' }} />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-[#52525B] uppercase tracking-widest mb-1">Grocery 10X Cap</p>
            <p className="text-sm font-semibold text-white">{groceryPoints} / {MONTHLY_CAP_GROCERY}</p>
            <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: `${groceryPct}%`, background: groceryPct >= 90 ? '#FF4757' : '#FFD700' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent earnings */}
      <div className="minimal-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest">Recent Earnings</p>
        </div>
        {rewards.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#52525B]">No points earned this month yet.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {rewards.map(r => (
              <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.025] transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,215,0,0.1)' }}>
                  <Star size={14} className="text-[#FFD700]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-white truncate">
                    {r.transaction.merchant?.displayName || r.transaction.merchantRaw || 'Purchase'}
                  </p>
                  <p className="text-[11.5px] text-[#52525B] mt-0.5">
                    {r.ruleId === '10X_PARTNER' ? '10X Partner Bonus' : 'Standard 2X'} · {r.transaction.category?.name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13.5px] font-bold text-[#FFD700]">+{r.cashpointsEarned} pts</p>
                  <p className="text-[11px] text-[#52525B] mt-0.5">{formatPaise(r.transaction.amountPaise)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
