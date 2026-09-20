'use client';

import { useState } from 'react';
import { ChevronLeft, Info, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatPaise } from '@/lib/money';
import { classifySpendGemini } from '@/app/actions/aiRewards';
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
  const [merchantStr, setMerchantStr] = useState('');
  const [spendType, setSpendType] = useState<'normal' | '10x' | 'grocery' | 'excluded'>('normal');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);

  const amountPaise = Math.round((parseFloat(amountStr) || 0) * 100);

  const handleAskGemini = async () => {
    if (!merchantStr.trim()) return;
    setAiLoading(true);
    setAiReason(null);
    try {
      const res = await classifySpendGemini(merchantStr);
      setSpendType(res.type);
      setAiReason(res.reason);
      setMerchantStr(res.merchant); // Auto-correct to cleaned name
    } catch (e) {
      alert("Failed to analyze with Gemini");
    } finally {
      setAiLoading(false);
    }
  };

  const calcResult = calculateCashPoints({
    amountPaise,
    paymentMethodId: 1, 
    moneybackCardId: 1, 
    merchantNormalizedName: merchantStr || (spendType === '10x' || spendType === 'grocery' ? 'amazon' : 'some store'),
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
        
        {/* Input Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
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
          
          <div className="flex-[1.5]">
            <label className="block text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-2">Where are you spending?</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={merchantStr}
                onChange={(e) => setMerchantStr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskGemini()}
                placeholder="e.g. Amazon, Rent on Cred, Zepto"
                className="flex-1 h-14 px-4 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-[#9333EA]/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button 
                onClick={handleAskGemini}
                disabled={aiLoading || !merchantStr.trim()}
                className="h-14 px-5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #9333EA 0%, #4F46E5 100%)', color: 'white', border: 'none', boxShadow: '0 4px 15px rgba(147, 51, 234, 0.3)' }}
              >
                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Explanation Box */}
        {aiReason && (
          <div className="mb-6 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2" style={{ background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
            <Sparkles size={18} className="text-[#A855F7] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] text-white font-medium mb-1">Gemini Analysis</p>
              <p className="text-[12px] text-[#D8B4FE] leading-relaxed">{aiReason}</p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <label className="block text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-3">Manual Override</label>
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
    </div>
  );
}
