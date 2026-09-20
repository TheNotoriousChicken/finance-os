'use client';

import { useState } from 'react';
import { ChevronLeft, Calculator, Info } from 'lucide-react';
import Link from 'next/link';
import { formatPaise } from '@/lib/money';
import { 
  calculateCashPoints, 
  estimateRewardValue,
  MONTHLY_CAP_OVERALL,
  MONTHLY_CAP_GROCERY,
  POINTS_PER_BLOCK_BASE,
  POINTS_PER_BLOCK_10X
} from '@/lib/engine/rewards';

export default function RewardsCalculatorPage() {
  const [amountStr, setAmountStr] = useState('');
  const [spendType, setSpendType] = useState<'normal' | '10x' | 'grocery' | 'excluded'>('normal');

  const amountPaise = Math.round((parseFloat(amountStr) || 0) * 100);

  // Mock input for the engine
  const calcResult = calculateCashPoints({
    amountPaise,
    paymentMethodId: 1, // Mock
    moneybackCardId: 1, // Mock
    merchantNormalizedName: spendType === '10x' || spendType === 'grocery' ? 'amazon' : 'some store',
    categoryName: spendType === 'excluded' ? 'Rent' : 'Shopping',
    is10xPartner: spendType === '10x' || spendType === 'grocery',
    isGroceryMerchant: spendType === 'grocery',
    alreadyEarnedOverall: 0,
    alreadyEarnedGrocery: 0,
  });

  const valuePaise = estimateRewardValue(calcResult.cashpointsEarned);
  const effectiveRate = amountPaise > 0 ? (valuePaise / amountPaise) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="max-w-2xl mx-auto pb-10 page-enter">
      <div className="flex items-center gap-3">
        <Link href="/rewards" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <ChevronLeft size={18} className="text-[#A1A1AA]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reward Calculator</h1>
          <p className="text-[13px] text-[#52525B] mt-0.5">HDFC MoneyBack+ Points Estimator</p>
        </div>
      </div>

      <div className="minimal-card rounded-2xl p-6 mt-4">
        <div className="mb-6">
          <label className="block text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-2">Spend Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-medium">₹</span>
            <input 
              type="number" 
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full h-14 pl-8 pr-4 rounded-xl text-lg font-semibold text-white outline-none focus:ring-1 focus:ring-[#FFD700]/50 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-3">Spend Category</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'normal', label: 'Normal Spend', desc: 'Base 2X points' },
              { id: '10x', label: '10X Partners', desc: 'Amazon, Flipkart, Swiggy, etc.' },
              { id: 'grocery', label: 'Grocery (10X)', desc: 'Reliance Smart, BigBasket' },
              { id: 'excluded', label: 'Excluded', desc: 'Fuel, Rent, Govt, Wallets' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setSpendType(type.id as any)}
                className="text-left p-4 rounded-xl transition-all border"
                style={{ 
                  background: spendType === type.id ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.02)',
                  borderColor: spendType === type.id ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.05)'
                }}
              >
                <p className={`text-[14px] font-semibold ${spendType === type.id ? 'text-[#FFD700]' : 'text-white'}`}>{type.label}</p>
                <p className="text-[11px] text-[#A1A1AA] mt-1">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: 'linear-gradient(145deg, rgba(18,18,20,0.98) 0%, rgba(10,10,12,1) 100%)', border: '1px solid rgba(255,215,0,0.12)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-1">You Will Earn</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold tracking-tight" style={{ color: '#FFD700' }}>{calcResult.cashpointsEarned}</p>
                <p className="text-[13px] font-medium text-[#A1A1AA]">Points</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-1">Value</p>
              <p className="text-xl font-semibold text-white">{formatPaise(valuePaise)}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 flex items-center justify-between text-[12px]" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-[#A1A1AA]">Effective Return Rate</span>
            <span className="font-bold text-[#00D68F]">{effectiveRate.toFixed(2)}%</span>
          </div>
        </div>

        {calcResult.isExcluded && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.15)' }}>
            <Info size={16} className="text-[#FF4757] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#FF4757]/90 leading-relaxed">
              This category is excluded from earning CashPoints as per HDFC MoneyBack+ terms.
            </p>
          </div>
        )}
      </div>

      <div className="minimal-card rounded-2xl p-6">
        <p className="text-[12px] font-bold text-white mb-3">How it works</p>
        <ul className="text-[12px] text-[#A1A1AA] space-y-2 leading-relaxed">
          <li>• Points are calculated on blocks of ₹200 (Math.floor). Amounts under ₹200 earn 0 points.</li>
          <li>• Base rate: {POINTS_PER_BLOCK_BASE} points per ₹200 (1% value).</li>
          <li>• 10X Partners: {POINTS_PER_BLOCK_10X} points per ₹200 (10% value).</li>
          <li>• 1 CashPoint = ₹0.25 when redeemed against statement or SmartBuy.</li>
          <li>• Overall cap: {MONTHLY_CAP_OVERALL} points per calendar month for 10X points.</li>
          <li>• Grocery cap: {MONTHLY_CAP_GROCERY} points per calendar month (included in overall cap).</li>
        </ul>
      </div>
    </div>
  );
}
