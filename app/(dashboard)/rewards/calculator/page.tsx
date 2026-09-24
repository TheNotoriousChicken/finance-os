'use client';

import { useState } from 'react';
import { ChevronLeft, Info, Sparkles, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { formatPaise } from '@/lib/money';
import { classifySpendGemini } from '@/app/actions/aiRewards';
import { calculateCashPoints } from '@/lib/engine/rewards';
import { calculateNeuCoins } from '@/lib/engine/neuplus';

export default function RewardsCalculatorPage() {
  const [amountStr, setAmountStr] = useState('');
  const [merchantStr, setMerchantStr] = useState('');
  
  // AI Outputs
  const [spendType, setSpendType] = useState<'normal' | '10x' | 'grocery' | 'excluded'>('normal');
  const [isTataBrand, setIsTataBrand] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const amountPaise = Math.round((parseFloat(amountStr) || 0) * 100);

  const handleAskGemini = async () => {
    if (!merchantStr.trim()) return;
    setAiLoading(true);
    setAiReason(null);
    try {
      const res = await classifySpendGemini(merchantStr);
      setMerchantStr(res.merchant);
      setSpendType(res.type);
      setIsTataBrand(res.isTataBrand || false);
      setAiReason(res.reason);
    } catch (e) {
      alert(`Failed to analyze with Gemini: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Convert AI spendType to an explicit category for the deterministic engine
  const categoryName = spendType === 'excluded' ? 'Rent' : spendType === 'grocery' ? 'Groceries' : 'Shopping';
  const is10x = spendType === '10x' || spendType === 'grocery';
  const isGrocery = spendType === 'grocery';

  // 1. HDFC MoneyBack+ (Swipe/Online)
  const mbResult = calculateCashPoints({
    amountPaise,
    paymentMethodId: 1, 
    moneybackCardId: 1, 
    merchantNormalizedName: merchantStr || (is10x ? 'amazon' : 'some store'),
    categoryName,
    is10xPartner: is10x,
    isGroceryMerchant: isGrocery,
    alreadyEarnedOverall: 0,
    alreadyEarnedGrocery: 0,
  });
  const mbValuePaise = mbResult.isExcluded ? 0 : mbResult.cashpointsEarned * 25;
  const mbRate = amountPaise > 0 ? (mbValuePaise / amountPaise) * 100 : 0;

  // 2. Tata Neu Plus (Swipe/Online)
  const neuSwipeResult = calculateNeuCoins({
    amountPaise,
    paymentMethodId: 2,
    neuPlusCardId: 2,
    merchantNormalizedName: merchantStr || (isTataBrand ? 'croma' : 'some store'),
    categoryName,
    paymentChannel: 'SWIPE',
    isTataBrand,
    isTataNeuApp: false,
    isEmi: false,
    alreadyEarnedUpi: 0
  });
  const neuSwipeCoins = neuSwipeResult.neuCoinsEarned + neuSwipeResult.neuPassAcceleratedEarned;
  const neuSwipeValue = neuSwipeResult.isExcluded ? 0 : neuSwipeCoins * 100;
  const neuSwipeRate = amountPaise > 0 ? (neuSwipeValue / amountPaise) * 100 : 0;

  // 3. Tata Neu Plus (UPI)
  const neuUpiResult = calculateNeuCoins({
    amountPaise,
    paymentMethodId: 2,
    neuPlusCardId: 2,
    merchantNormalizedName: merchantStr || 'store',
    categoryName,
    paymentChannel: 'UPI',
    isTataBrand,
    isTataNeuApp: false,
    isEmi: false,
    alreadyEarnedUpi: 0
  });
  const neuUpiCoins = neuUpiResult.neuCoinsEarned + neuUpiResult.neuPassAcceleratedEarned;
  const neuUpiValue = neuUpiResult.isExcluded ? 0 : neuUpiCoins * 100;
  const neuUpiRate = amountPaise > 0 ? (neuUpiValue / amountPaise) * 100 : 0;

  // Determine the best yield
  const maxYield = Math.max(mbValuePaise, neuSwipeValue, neuUpiValue);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="max-w-2xl mx-auto pb-10 page-enter">
      <div className="flex items-center gap-3">
        <Link href="/rewards" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <ChevronLeft size={18} className="text-[#A1A1AA]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reward Optimizer</h1>
          <p className="leading-relaxed text-[13px] text-[#52525B] mt-0.5">Find the best payment method for any spend</p>
        </div>
      </div>

      <div className="minimal-card rounded-2xl p-6 mt-4">
        
        {/* Input Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-[0.8]">
            <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-200/50 font-normal">₹</span>
              <input 
                type="number" 
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                className="w-full h-14 pl-8 pr-4 rounded-xl text-lg font-bold text-slate-200 outline-none focus:ring-1 focus:ring-[#9333EA]/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
          
          <div className="flex-[1.2]">
            <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Merchant Name</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={merchantStr}
                onChange={(e) => setMerchantStr(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskGemini()}
                placeholder="e.g. Amazon, Croma, Cred Rent"
                className="leading-relaxed flex-1 h-14 px-4 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-[#9333EA]/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button 
                onClick={handleAskGemini}
                disabled={aiLoading || !merchantStr.trim()}
                className="h-14 px-5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #9333EA 0%, #4F46E5 100%)', color: 'white', border: 'none', boxShadow: '0 4px 15px rgba(147, 51, 234, 0.3)' }}
              >
                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span className="hidden sm:inline">Analyze</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Explanation Box */}
        {aiReason && (
          <div className="mb-6 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2" style={{ background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
            <Sparkles size={18} className="text-[#A855F7] shrink-0 mt-0.5" />
            <div>
              <p className="leading-relaxed text-[13px] text-slate-200 font-bold mb-1">Gemini Analysis</p>
              <p className="text-[12px] text-[#D8B4FE] leading-relaxed">{aiReason}</p>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex flex-col gap-4">
           {/* Option 1: MB+ Swipe */}
           <div className={`p-4 rounded-xl flex items-center justify-between border ${maxYield > 0 && mbValuePaise === maxYield && !mbResult.isExcluded ? 'border-[#FFD700] bg-[#FFD700]/5' : 'border-[#27272A] bg-black/40'} transition-all relative`}>
              <div className="flex-1">
                 <div className="flex items-center gap-3 mb-1">
                   <p className="text-[14px] font-bold text-slate-200">HDFC MoneyBack+</p>
                   <span className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1AA] px-2 py-0.5 rounded-md bg-[#27272A]">Swipe / Online</span>
                 </div>
                 <div className="flex items-center gap-2 text-[12px]">
                   {mbResult.isExcluded ? (
                     <span className="text-[#FF4757] font-bold">Excluded Category</span>
                   ) : (
                     <>
                       <span className="text-[#A1A1AA]">Yield: <span className="text-slate-200 font-bold">{mbRate.toFixed(2)}%</span></span>
                       {is10x && <span className="text-[#00D68F] font-bold bg-[#00D68F]/10 px-1.5 rounded">10X Partner</span>}
                     </>
                   )}
                 </div>
              </div>
              <div className="text-right">
                 {mbResult.isExcluded ? (
                   <p className="text-lg font-bold text-[#71717A] tabular-nums">₹0</p>
                 ) : (
                   <>
                     <p className="text-lg font-bold text-[#FFD700] tabular-nums">
                        {mbResult.cashpointsEarned} <span className="text-[12px] text-[#A1A1AA]">pts</span>
                     </p>
                     <p className="text-[11px] font-bold text-white mt-0.5">Value: {formatPaise(mbValuePaise)}</p>
                   </>
                 )}
              </div>
              {maxYield > 0 && mbValuePaise === maxYield && !mbResult.isExcluded && (
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 -mr-14 hidden sm:flex">
                   <div className="px-2 py-1 bg-[#FFD700]/20 text-[#FFD700] text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1">
                     <Sparkles size={10} /> Best
                   </div>
                 </div>
              )}
           </div>

           {/* Option 2: Neu Swipe */}
           <div className={`p-4 rounded-xl flex items-center justify-between border ${maxYield > 0 && neuSwipeValue === maxYield && !neuSwipeResult.isExcluded ? 'border-[#00D68F] bg-[#00D68F]/5' : 'border-[#27272A] bg-black/40'} transition-all relative`}>
              <div className="flex-1">
                 <div className="flex items-center gap-3 mb-1">
                   <p className="text-[14px] font-bold text-slate-200">Tata Neu Plus</p>
                   <span className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1AA] px-2 py-0.5 rounded-md bg-[#27272A]">Swipe / Online</span>
                 </div>
                 <div className="flex items-center gap-2 text-[12px]">
                   {neuSwipeResult.isExcluded ? (
                     <span className="text-[#FF4757] font-bold">Excluded Category</span>
                   ) : (
                     <>
                       <span className="text-[#A1A1AA]">Yield: <span className="text-slate-200 font-bold">{neuSwipeRate.toFixed(2)}%</span></span>
                       {isTataBrand && <span className="text-[#00D68F] font-bold bg-[#00D68F]/10 px-1.5 rounded">2% Tata Brand</span>}
                     </>
                   )}
                 </div>
              </div>
              <div className="text-right">
                 {neuSwipeResult.isExcluded ? (
                   <p className="text-lg font-bold text-[#71717A] tabular-nums">₹0</p>
                 ) : (
                   <>
                     <p className="text-lg font-bold text-[#00D68F] tabular-nums">
                        {neuSwipeCoins} <span className="text-[12px] text-[#A1A1AA]">coins</span>
                     </p>
                     <p className="text-[11px] font-bold text-white mt-0.5">Value: {formatPaise(neuSwipeValue)}</p>
                   </>
                 )}
              </div>
              {maxYield > 0 && neuSwipeValue === maxYield && !neuSwipeResult.isExcluded && (
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 -mr-14 hidden sm:flex">
                   <div className="px-2 py-1 bg-[#00D68F]/20 text-[#00D68F] text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1">
                     <Sparkles size={10} /> Best
                   </div>
                 </div>
              )}
           </div>

           {/* Option 3: Neu UPI */}
           <div className={`p-4 rounded-xl flex items-center justify-between border ${maxYield > 0 && neuUpiValue === maxYield && !neuUpiResult.isExcluded ? 'border-[#3B82F6] bg-[#3B82F6]/5' : 'border-[#27272A] bg-black/40'} transition-all relative`}>
              <div className="flex-1">
                 <div className="flex items-center gap-3 mb-1">
                   <p className="text-[14px] font-bold text-slate-200">Tata Neu Plus</p>
                   <span className="text-[10px] uppercase font-bold tracking-wider text-[#3B82F6] px-2 py-0.5 rounded-md bg-[#3B82F6]/20">UPI</span>
                 </div>
                 <div className="flex items-center gap-2 text-[12px]">
                   {neuUpiResult.isExcluded ? (
                     <span className="text-[#FF4757] font-bold">Not eligible for UPI rewards</span>
                   ) : (
                     <>
                       <span className="text-[#A1A1AA]">Yield: <span className="text-slate-200 font-bold">{neuUpiRate.toFixed(2)}%</span></span>
                     </>
                   )}
                 </div>
              </div>
              <div className="text-right">
                 {neuUpiResult.isExcluded ? (
                   <p className="text-lg font-bold text-[#71717A] tabular-nums">₹0</p>
                 ) : (
                   <>
                     <p className="text-lg font-bold text-[#3B82F6] tabular-nums">
                        {neuUpiCoins} <span className="text-[12px] text-[#A1A1AA]">coins</span>
                     </p>
                     <p className="text-[11px] font-bold text-white mt-0.5">Value: {formatPaise(neuUpiValue)}</p>
                   </>
                 )}
              </div>
              {maxYield > 0 && neuUpiValue === maxYield && !neuUpiResult.isExcluded && (
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 -mr-14 hidden sm:flex">
                   <div className="px-2 py-1 bg-[#3B82F6]/20 text-[#3B82F6] text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1">
                     <Sparkles size={10} /> Best
                   </div>
                 </div>
              )}
           </div>

        </div>
      </div>
    </div>
  );
}
