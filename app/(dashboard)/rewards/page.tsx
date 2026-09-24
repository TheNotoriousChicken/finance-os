export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { formatPaise } from '@/lib/money';
import { Star, Calculator } from 'lucide-react';
import Link from 'next/link';
import { MONTHLY_CAP_OVERALL, MONTHLY_CAP_GROCERY } from '@/lib/engine/rewards';
import { UPI_MONTHLY_CAP } from '@/lib/engine/neuplus';

export default async function RewardsPage() {
  const now = new Date();
  const cardMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const rewards = await prisma.reward.findMany({
    where: { cardMonth, isReversed: false },
    include: {
      transaction: { include: { merchant: true, category: true } },
      paymentMethod: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // MoneyBack+ calculations
  const mbRewards = rewards.filter(r => r.paymentMethod.rewardCurrency === 'CASHPOINTS');
  const mbTotalPoints = mbRewards.reduce((sum, r) => sum + r.cashpointsEarned, 0);
  const mbGroceryPoints = mbRewards
    .filter(r => r.transaction.category?.name.toLowerCase().includes('grocer'))
    .reduce((sum, r) => sum + r.cashpointsEarned, 0);
  const mbValue = mbTotalPoints * 25; // 1 pt = 0.25 INR
  const mbOverallPct = Math.min(100, Math.round((mbTotalPoints / MONTHLY_CAP_OVERALL) * 100));
  const mbGroceryPct = Math.min(100, Math.round((mbGroceryPoints / MONTHLY_CAP_GROCERY) * 100));

  // Neu Plus calculations
  const neuRewards = rewards.filter(r => r.paymentMethod.rewardCurrency === 'NEUCOINS');
  const neuTotalCoins = neuRewards.reduce((sum, r) => sum + r.neuCoinsEarned, 0);
  const neuValue = neuTotalCoins * 100; // 1 NeuCoin = 1 INR
  const neuUpiCoins = neuRewards
    .filter(r => r.transaction.paymentChannel === 'UPI')
    .reduce((sum, r) => sum + r.neuCoinsEarned, 0);
  const neuUpiPct = Math.min(100, Math.round((neuUpiCoins / UPI_MONTHLY_CAP) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className=" max-w-3xl mx-auto pb-10 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Rewards</h1>
          <p className="leading-relaxed text-sm text-[#52525B] mt-1">This Month ({cardMonth})</p>
        </div>
        <Link href="/rewards/calculator" className="leading-relaxed flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-bold text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.1)' }}>
          <Calculator size={15} />
          MB+ Calculator
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MoneyBack+ Card */}
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg, rgba(18,18,20,0.98) 0%, rgba(10,10,12,1) 100%)', border: '1px solid rgba(255,215,0,0.12)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <p className="leading-relaxed text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-1">MoneyBack+ CashPoints</p>
          <p className="text-4xl font-bold tracking-tight" style={{ color: '#FFD700' }}>{mbTotalPoints.toLocaleString('en-IN')}</p>
          <p className="leading-relaxed tabular-nums text-sm text-[#52525B] mt-2">Worth <span className="text-slate-200 font-bold">{formatPaise(mbValue)}</span></p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px", borderTop: '1px solid rgba(255,255,255,0.05)' }} className="mt-6 pt-5">
            <div>
              <p className="leading-relaxed text-[11px] text-[#52525B] uppercase tracking-widest mb-1">Overall Cap</p>
              <p className="leading-relaxed text-sm font-bold text-slate-200">{mbTotalPoints} / {MONTHLY_CAP_OVERALL}</p>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full" style={{ width: `${mbOverallPct}%`, background: mbOverallPct >= 90 ? '#FF4757' : '#FFD700' }} />
              </div>
            </div>
            <div>
              <p className="leading-relaxed text-[11px] text-[#52525B] uppercase tracking-widest mb-1">Grocery Cap</p>
              <p className="leading-relaxed text-sm font-bold text-slate-200">{mbGroceryPoints} / {MONTHLY_CAP_GROCERY}</p>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full" style={{ width: `${mbGroceryPct}%`, background: mbGroceryPct >= 90 ? '#FF4757' : '#FFD700' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tata Neu Plus Card */}
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg, rgba(18,18,20,0.98) 0%, rgba(10,10,12,1) 100%)', border: '1px solid rgba(0,214,143,0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <p className="leading-relaxed text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-1">Tata NeuCoins</p>
          <p className="text-4xl font-bold tracking-tight" style={{ color: '#00D68F' }}>{neuTotalCoins.toLocaleString('en-IN')}</p>
          <p className="leading-relaxed tabular-nums text-sm text-[#52525B] mt-2">Worth <span className="text-slate-200 font-bold">{formatPaise(neuValue)}</span></p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", borderTop: '1px solid rgba(255,255,255,0.05)' }} className="mt-6 pt-5">
            <div>
              <p className="leading-relaxed text-[11px] text-[#52525B] uppercase tracking-widest mb-1">UPI Cap (Max 500/mo)</p>
              <p className="leading-relaxed text-sm font-bold text-slate-200">{neuUpiCoins} / {UPI_MONTHLY_CAP}</p>
              <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full" style={{ width: `${neuUpiPct}%`, background: neuUpiPct >= 90 ? '#FF4757' : '#00D68F' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="leading-relaxed text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-3 px-1">Recent Activity</p>
        <div className="minimal-card rounded-2xl overflow-hidden divide-y divide-[#27272A]/50">
          {rewards.length === 0 ? (
            <div className="p-10 text-center text-[#71717A] text-[13px] leading-relaxed">
              No rewards earned this month yet.<br/>Spend using your credit cards to earn points.
            </div>
          ) : (
            rewards.map(r => {
              const isNeu = r.paymentMethod.rewardCurrency === 'NEUCOINS';
              const pts = isNeu ? r.neuCoinsEarned : r.cashpointsEarned;
              return (
                <div key={r.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <Star size={16} style={{ color: isNeu ? '#00D68F' : '#FFD700' }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-200">{r.transaction.merchant?.displayName || r.transaction.merchantRaw}</p>
                      <p className="leading-relaxed text-[12px] text-[#52525B] mt-0.5">{new Date(r.transaction.date).toLocaleDateString()} • {r.paymentMethod.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold tabular-nums" style={{ color: isNeu ? '#00D68F' : '#FFD700' }}>+{pts}</p>
                    <p className="leading-relaxed text-[11px] text-[#52525B]">Rule: {r.ruleId}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
