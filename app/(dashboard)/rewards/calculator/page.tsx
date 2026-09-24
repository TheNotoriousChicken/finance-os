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
  
  // Manual overrides
  const [paymentChannel, setPaymentChannel] = useState<'SWIPE' | 'UPI'>('SWIPE');
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

  // HDFC MoneyBack+
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
  const mbValuePaise = mbResult.cashpointsEarned * 25;
  const mbRate = amountPaise > 0 ? (mbValuePaise / amountPaise) * 100 : 0;

  // Tata Neu Plus
  const neuResult = calculateNeuCoins({
    amountPaise,
    paymentMethodId: 2,
    neuPlusCardId: 2,
    merchantNormalizedName: merchantStr || (isTataBrand ? 'croma' : 'some store'),
    categoryName,
    paymentChannel,
    isTataBrand,
    isTataNeuApp: false,
    isEmi: false,
    alreadyEarnedUpi: 0
  });
  const neuTotalCoins = neuResult.neuCoinsEarned + neuResult.neuPassAcceleratedEarned;
  const neuValuePaise = neuTotalCoins * 100;
  const neuRate = amountPaise > 0 ? (neuValuePaise / amountPaise) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="max-w-2xl mx-auto pb-10 page-enter">
      <div className="flex items-center gap-3">
        <Link href="/rewards" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <ChevronLeft size={18} className="text-[#A1A1AA]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Compare Cards</h1>
          <p className="leading-relaxed text-[13px] text-[#52525B] mt-0.5">Determine the best card for a specific spend</p>
        </div>
      </div>

      <div className="minimal-card rounded-2xl p-6 mt-4">
        
        {/* Input Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-200/50 font-normal">₹</span>
              <input 
                type="number" 
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                className="w-full h-14 pl-8 pr-4 rounded-xl text-lg font-bold text-slate-200 outline-none focus:ring-1 focus:ring-[#FFD700]/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
          
          <div className="flex-[1.5]">
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
              <p className="leading-relaxed text-[13px] text-slate-200 font-bold mb-1">Gemini Analysis</p>
              <p className="text-[12px] text-[#D8B4FE] leading-relaxed">{aiReason}</p>
            </div>
          </div>
        )}

        {/* Manual Toggles Row (optional overrides) */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 pt-4 border-t border-[#27272A]/50">
          <div className="flex-1">
             <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Reward Tier</label>
             <select 
               value={spendType} 
               onChange={(e) => setSpendType(e.target.value as any)}
               className="w-full h-12 px-4 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-[#9333EA]/50 transition-all appearance-none"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
             >
               <option className="bg-[#121214]" value="normal">Normal Spend</option>
               <option className="bg-[#121214]" value="10x">10X Partners</option>
               <option className="bg-[#121214]" value="grocery">Grocery (10X)</option>
               <option className="bg-[#121214]" value="excluded">Excluded</option>
             </select>
          </div>
          <div className="flex-1">
             <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Brand Tag</label>
             <div 
               onClick={() => setIsTataBrand(!isTataBrand)}
               className="w-full h-12 px-4 rounded-xl text-sm text-slate-200 flex items-center justify-between cursor-pointer transition-all"
               style={{ 
                 background: isTataBrand ? 'rgba(0, 214, 143, 0.1)' : 'rgba(255,255,255,0.04)', 
                 border: `1px solid ${isTataBrand ? 'rgba(0, 214, 143, 0.4)' : 'rgba(255,255,255,0.08)'}` 
               }}
             >
               <span>Tata Ecosystem (2%)</span>
               <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${isTataBrand ? 'bg-[#00D68F]' : 'border border-[#52525B]'}`}>
                 {isTataBrand && <div className="w-2 h-2 bg-[#0C0C0E] rounded-[1px]"></div>}
               </div>
             </div>
          </div>
          <div className="flex-1">
             <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Method</label>
             <select 
               value={paymentChannel} 
               onChange={(e: any) => setPaymentChannel(e.target.value)}
               className="w-full h-12 px-4 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-[#9333EA]/50 transition-all appearance-none"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
             >
               <option className="bg-[#121214]" value="SWIPE">Swipe / Online</option>
               <option className="bg-[#121214]" value="UPI">UPI</option>
             </select>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* MB+ Result */}
           <div className={`p-5 rounded-2xl border ${mbValuePaise >= neuValuePaise && !mbResult.isExcluded ? 'border-[#FFD700] bg-[#FFD700]/5' : 'border-[#27272A] bg-black/40'} transition-all`}>
              <div className="flex justify-between items-start mb-4">
                 <div>
                   <p className="text-[14px] font-bold text-slate-200">HDFC MoneyBack+</p>
                   {paymentChannel === 'UPI' && <p className="text-[11px] text-[#FF4757] mt-1">Cannot be used for UPI</p>}
                 </div>
                 {mbValuePaise >= neuValuePaise && paymentChannel !== 'UPI' && !mbResult.isExcluded && (
                    <div className="px-2 py-1 bg-[#FFD700]/20 text-[#FFD700] text-[10px] font-bold rounded-lg uppercase tracking-wider">Best Yield</div>
                 )}
              </div>
              
              {paymentChannel === 'UPI' ? (
                 <div className="text-center py-4 text-[#A1A1AA] text-sm">Not applicable</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                     <div>
                       <p className="text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-1">CashPoints</p>
                       <p className="text-3xl font-bold tabular-nums" style={{ color: mbResult.isExcluded ? '#71717A' : '#FFD700' }}>{mbResult.cashpointsEarned}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-1">Value</p>
                       <p className="text-lg font-bold text-white tabular-nums">{formatPaise(mbValuePaise)}</p>
                     </div>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#A1A1AA]">Return Rate:</span>
                    <span className="font-bold text-slate-200">{mbRate.toFixed(2)}%</span>
                  </div>
                  {mbResult.isExcluded && (
                    <div className="p-2 rounded bg-[#FF4757]/10 text-[#FF4757] text-[11px] font-bold">
                      EXCLUDED: {mbResult.excludedReason || 'Category not eligible.'}
                    </div>
                  )}
                  {is10x && !mbResult.isExcluded && (
                    <div className="p-2 rounded bg-[#00D68F]/10 text-[#00D68F] text-[11px] font-bold">
                      10X PARTNER DETECTED
                    </div>
                  )}
                </div>
              )}
           </div>

           {/* Neu Result */}
           <div className={`p-5 rounded-2xl border ${neuValuePaise > mbValuePaise && !neuResult.isExcluded ? 'border-[#00D68F] bg-[#00D68F]/5' : 'border-[#27272A] bg-black/40'} transition-all`}>
              <div className="flex justify-between items-start mb-4">
                 <div>
                   <p className="text-[14px] font-bold text-slate-200">Tata Neu Plus</p>
                   {paymentChannel === 'UPI' && <p className="text-[11px] text-[#00D68F] mt-1">UPI Supported</p>}
                 </div>
                 {neuValuePaise > mbValuePaise && !neuResult.isExcluded && (
                    <div className="px-2 py-1 bg-[#00D68F]/20 text-[#00D68F] text-[10px] font-bold rounded-lg uppercase tracking-wider">Best Yield</div>
                 )}
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <div>
                     <p className="text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-1">NeuCoins</p>
                     <p className="text-3xl font-bold tabular-nums" style={{ color: neuResult.isExcluded ? '#71717A' : '#00D68F' }}>{neuTotalCoins}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-1">Value</p>
                     <p className="text-lg font-bold text-white tabular-nums">{formatPaise(neuValuePaise)}</p>
                   </div>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#A1A1AA]">Return Rate:</span>
                  <span className="font-bold text-slate-200">{neuRate.toFixed(2)}%</span>
                </div>
                {neuResult.isExcluded && (
                  <div className="p-2 rounded bg-[#FF4757]/10 text-[#FF4757] text-[11px] font-bold">
                    EXCLUDED: {neuResult.excludedReason || 'Category not eligible.'}
                  </div>
                )}
                {isTataBrand && !neuResult.isExcluded && (
                  <div className="p-2 rounded bg-[#00D68F]/10 text-[#00D68F] text-[11px] font-bold">
                    TATA ECOSYSTEM YIELD (2%)
                  </div>
                )}
                {paymentChannel === 'UPI' && !neuResult.isExcluded && (
                  <div className="p-2 rounded bg-[#3B82F6]/10 text-[#3B82F6] text-[11px] font-bold">
                    UPI YIELD (1%)
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
