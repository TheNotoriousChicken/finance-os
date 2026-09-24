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
  const [category, setCategory] = useState('Shopping');
  const [paymentChannel, setPaymentChannel] = useState<'SWIPE' | 'UPI'>('SWIPE');
  const [aiLoading, setAiLoading] = useState(false);

  const amountPaise = Math.round((parseFloat(amountStr) || 0) * 100);

  const handleAskGemini = async () => {
    if (!merchantStr.trim()) return;
    setAiLoading(true);
    try {
      const res = await classifySpendGemini(merchantStr);
      // AI action categorizes as normal, 10x, grocery, excluded.
      // We will map this for both cards.
      setMerchantStr(res.merchant);
      
      if (res.type === 'excluded') setCategory('Rent');
      else if (res.type === 'grocery') setCategory('Groceries');
      else setCategory('Shopping');
      
    } catch (e) {
      alert(`Failed to analyze with Gemini: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Determine Flags heuristically (similar to what server would do)
  const mLower = merchantStr.toLowerCase();
  const cLower = category.toLowerCase();
  const is10x = mLower.includes('amazon') || mLower.includes('flipkart') || mLower.includes('swiggy') || mLower.includes('reliance smart') || mLower.includes('bigbasket');
  const isGrocery = mLower.includes('reliance smart') || mLower.includes('bigbasket') || cLower.includes('grocer');
  const isTata = mLower.includes('tata') || mLower.includes('croma') || mLower.includes('bigbasket') || mLower.includes('1mg') || mLower.includes('air india') || mLower.includes('taj');

  // HDFC MoneyBack+
  const mbResult = calculateCashPoints({
    amountPaise,
    paymentMethodId: 1, 
    moneybackCardId: 1, 
    merchantNormalizedName: merchantStr,
    categoryName: category,
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
    merchantNormalizedName: merchantStr,
    categoryName: category,
    paymentChannel,
    isTataBrand: isTata,
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
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-200/50 font-normal">₹</span>
              <input 
                type="number" 
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                className="w-full h-12 pl-8 pr-4 rounded-xl text-lg font-bold text-slate-200 outline-none focus:ring-1 focus:ring-[#00D68F]/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          </div>
          
          <div className="flex-[1.5]">
            <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Merchant</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={merchantStr}
                onChange={(e) => setMerchantStr(e.target.value)}
                placeholder="e.g. Amazon, Croma"
                className="leading-relaxed flex-1 h-12 px-4 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-[#00D68F]/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button 
                onClick={handleAskGemini}
                disabled={aiLoading}
                className="h-12 px-4 rounded-xl flex items-center justify-center bg-[#9333EA]/10 text-[#c084fc] hover:bg-[#9333EA]/20 transition-all border border-[#9333EA]/20 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
             <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Category</label>
             <select 
               value={category} 
               onChange={(e) => setCategory(e.target.value)}
               className="w-full h-12 px-4 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-[#00D68F]/50 transition-all appearance-none"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
             >
               <option className="bg-[#121214]" value="Shopping">Shopping</option>
               <option className="bg-[#121214]" value="Groceries">Groceries</option>
               <option className="bg-[#121214]" value="Food">Food & Dining</option>
               <option className="bg-[#121214]" value="Fuel">Fuel</option>
               <option className="bg-[#121214]" value="Rent">Rent</option>
               <option className="bg-[#121214]" value="Government">Government / Tax</option>
               <option className="bg-[#121214]" value="Wallet">Wallet Load</option>
               <option className="bg-[#121214]" value="Utility">Utility Bills</option>
             </select>
          </div>
          <div className="flex-1">
             <label className="leading-relaxed block text-[11px] font-bold text-[#52525B] uppercase tracking-widest mb-2">Method</label>
             <select 
               value={paymentChannel} 
               onChange={(e: any) => setPaymentChannel(e.target.value)}
               className="w-full h-12 px-4 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-[#00D68F]/50 transition-all appearance-none"
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
           <div className={`p-5 rounded-2xl border ${mbValuePaise > neuValuePaise && !mbResult.isExcluded ? 'border-[#FFD700] bg-[#FFD700]/5' : 'border-[#27272A] bg-black/40'} transition-all`}>
              <div className="flex justify-between items-start mb-4">
                 <div>
                   <p className="text-[14px] font-bold text-slate-200">HDFC MoneyBack+</p>
                   {paymentChannel === 'UPI' && <p className="text-[11px] text-[#FF4757] mt-1">Cannot be used for UPI</p>}
                 </div>
                 {mbValuePaise > neuValuePaise && paymentChannel !== 'UPI' && !mbResult.isExcluded && (
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
                 {neuValuePaise >= mbValuePaise && !neuResult.isExcluded && (
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
                {isTata && !neuResult.isExcluded && (
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
