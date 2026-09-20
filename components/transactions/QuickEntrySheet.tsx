
'use client';
import { useState, useTransition, useEffect, useRef } from 'react';
import { X, Sparkles, PenLine, Zap, ChevronDown } from 'lucide-react';
import { addTransactionAction } from '@/app/actions/transactions';
import { parseTransactionFromAiAction } from '@/app/actions/ai-transactions';
import { optimizePaymentAction } from '@/app/actions/optimizer';

interface QuickEntryProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  paymentMethods: any[];
}

const selectClass = "w-full h-11 px-4 rounded-xl text-sm text-slate-200 outline-none transition-colors appearance-none cursor-pointer [color-scheme:dark]";
const selectStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' };
const labelClass = "block text-[11px] font-bold text-[#52525B] uppercase tracking-widest";


function CustomSelect({ options, value, onChange, placeholder, name, required }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOpt = options.find((o: any) => o.value.toString() === value.toString());

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={value} required={required} />
      <div 
        className={`${selectClass} flex items-center justify-between`}
        style={selectStyle}
        onClick={() => setIsOpen(!isOpen)}
      >
         <span className={selectedOpt ? "text-slate-200" : "text-[#71717A]"}>
           {selectedOpt ? selectedOpt.label : placeholder}
         </span>
         <ChevronDown size={14} className="text-[#52525B]" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {isOpen && (
         <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-[#27272A] rounded-xl z-50 overflow-hidden shadow-2xl max-h-56 overflow-y-auto" style={{ backdropFilter: 'blur(16px)' }}>
            {options.map((opt: any) => (
               <div 
                 key={opt.value}
                 className="leading-relaxed px-4 py-3 text-[13px] text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
                 onClick={() => { onChange(opt.value); setIsOpen(false); }}
               >
                 {opt.label}
               </div>
            ))}
         </div>
      )}
    </div>
  );
}

export function QuickEntrySheet({ isOpen, onClose, categories, paymentMethods }: QuickEntryProps) {
  const [isPending, startTransition] = useTransition();
  const [isAiPending, startAiTransition] = useTransition();
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [pasteText, setPasteText] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [optSuggestion, setOptSuggestion] = useState<{suggestion: string, reason: string} | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && mode === 'manual') setTimeout(() => amountRef.current?.focus(), 120);
  }, [isOpen, mode]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setMode('manual'); setPasteText(''); setAmount(''); setMerchant('');
      setType('EXPENSE'); setPaymentMethodId(''); setCategoryId('');
      setNotes(''); setError(''); setOptSuggestion(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  
  function handleQuickSalary() {
    setType('INCOME');
    setMerchant('Salary Credited');
    const incCat = categories.find(c => c.name.toLowerCase() === 'income');
    if (incCat) setCategoryId(incCat.id.toString());
    setTimeout(() => amountRef.current?.focus(), 50);
  }

  async function handleAiParse() {
    setError('');
    startAiTransition(async () => {
      try {
        const parsed = await parseTransactionFromAiAction(pasteText);
        setAmount((parsed.amountPaise / 100).toString());
        setMerchant(parsed.merchantNormalized || parsed.merchantRaw);
        setType(parsed.type || 'EXPENSE');
        if (parsed.receiptItems?.length > 0) {
          setNotes(`Receipt: ${parsed.receiptItems.map((i: any) => `${i.name} (x${i.quantity})`).join(', ')}`);
        }
        if (parsed.suggestedCategory) {
          const matchedCat = categories.find(c =>
            c.name.toLowerCase().includes(parsed.suggestedCategory.toLowerCase()) ||
            parsed.suggestedCategory.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedCat) setCategoryId(matchedCat.id.toString());
        }
        setMode('manual');
      } catch (err: any) {
        setError(err.message || 'Failed to parse text.');
      }
    });
  }

  async function handleOptimize() {
    if (!merchant || !amount) { setError('Enter merchant and amount first.'); return; }
    setError('');
    const res = await optimizePaymentAction(merchant, parseFloat(amount) * 100);
    setOptSuggestion(res);
  }

  async function handleSubmit(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await addTransactionAction(formData);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-[60] sm:max-w-sm sm:mx-auto sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto flex flex-col"
        style={{
          background: 'rgba(10,10,12,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px 24px 24px 24px',
          boxShadow: '0 -20px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset',
          maxHeight: '92dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-[15px] font-bold text-slate-200 tracking-tight">Add Transaction</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#52525B] hover:text-slate-200 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1.5 px-4 py-3">
          {(['manual', 'ai'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="leading-relaxed flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all"
              style={mode === m
                ? { background: 'rgba(255,255,255,0.1)', color: '#FAFAFA', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }
                : { color: '#52525B' }
              }
            >
              {m === 'manual' ? <PenLine size={14} /> : <Sparkles size={14} />}
              {m === 'manual' ? 'Manual' : 'AI Parse'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {mode === 'ai' ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="p-5 ">
              <p className="text-[13px] text-[#52525B] leading-relaxed">
                Paste a bank SMS, UPI notification, or receipt. AI will extract amount, merchant, and category.
              </p>
              {error && (
                <div className="leading-relaxed p-3 rounded-xl text-[13px]" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', color: '#FF4757' }}>
                  {error}
                </div>
              )}
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="e.g. Spent Rs.450 on HDFC Credit Card at Starbucks..."
                className="leading-relaxed w-full h-40 p-4 rounded-xl text-[13px] text-slate-200 placeholder-[#52525B] outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                onClick={handleAiParse}
                disabled={!pasteText.trim() || isAiPending}
                className="w-full h-12 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: '#00D68F', color: '#000' }}
              >
                <Sparkles size={16} />
                {isAiPending ? 'Parsing...' : 'Parse with Gemini AI'}
              </button>
            </div>
          ) : (
            <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="p-5 ">

              <div className="flex justify-end mb-1">
                <button 
                  type="button" 
                  onClick={handleQuickSalary}
                  className="leading-relaxed text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  style={{ background: 'rgba(0, 214, 143, 0.15)', color: '#00D68F' }}
                >
                  <Sparkles size={12} /> Auto-fill Salary
                </button>
              </div>

              {error && (
                <div className="leading-relaxed p-3 rounded-xl text-[13px]" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', color: '#FF4757' }}>
                  {error}
                </div>
              )}

              {/* Amount — large centered */}
              <div className="relative flex flex-col gap-2">
                <label className={labelClass}>Amount (Rs.)</label>
                <div className="relative flex items-center justify-center border-b-2 border-white/10 pb-3 mt-1">
                  <input
                    ref={amountRef}
                    type="number"
                    name="amount"
                    step="0.01"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-center text-4xl font-bold text-white placeholder-[#3F3F46] outline-none bg-transparent h-12 leading-none"
                  />
                  <button
                    type="button"
                    onClick={handleOptimize}
                    className="absolute right-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors active:scale-95"
                    style={{ background: 'rgba(0,214,143,0.12)', color: '#00D68F' }}
                  >
                    <Zap size={11} /> Best Card
                  </button>
                </div>
              </div>

              {optSuggestion && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(0,214,143,0.07)', border: '1px solid rgba(0,214,143,0.2)' }}>
                  <p className="leading-relaxed text-[13px] font-bold text-[#00D68F]">Use: {optSuggestion.suggestion}</p>
                  <p className="leading-relaxed text-[11.5px] text-[#00D68F]/70 mt-0.5">{optSuggestion.reason}</p>
                </div>
              )}

              {/* Date */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full h-11 px-4 rounded-xl text-[13.5px] text-slate-200 outline-none [color-scheme:dark]"
                  style={selectStyle}
                />
              </div>

              {/* Merchant */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label className={labelClass}>Merchant</label>
                <input
                  name="merchant"
                  required
                  value={merchant}
                  onChange={e => setMerchant(e.target.value)}
                  placeholder="e.g. Swiggy, Amazon..."
                  className="w-full h-11 px-4 rounded-xl text-[13.5px] text-slate-200 placeholder-[#3F3F46] outline-none"
                  style={selectStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Type */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label className={labelClass}>Type</label>
                  <CustomSelect
                      name="type"
                      value={type}
                      onChange={setType}
                      options={[
                        { label: 'Expense', value: 'EXPENSE' },
                        { label: 'Income', value: 'INCOME' },
                        { label: 'Refund', value: 'REFUND' }
                      ]}
                      placeholder="Select type"
                    />
                </div>

                {/* Payment method */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label className={labelClass}>Card / UPI</label>
                  <CustomSelect
                      name="paymentMethodId"
                      value={paymentMethodId}
                      onChange={setPaymentMethodId}
                      options={paymentMethods.map((pm: any) => ({ label: pm.name, value: pm.id }))}
                      placeholder="Select..."
                      required
                    />
                </div>
              </div>

              {/* Category */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label className={labelClass}>Category</label>
                <CustomSelect
                    name="categoryId"
                    value={categoryId}
                    onChange={setCategoryId}
                    options={categories.map((cat: any) => ({ label: cat.name, value: cat.id }))}
                    placeholder="Select category..."
                    required
                  />
              </div>

              {/* Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label className={labelClass}>Notes (optional)</label>
                <input
                  name="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Private notes..."
                  className="w-full h-11 px-4 rounded-xl text-[13.5px] text-slate-200 placeholder-[#3F3F46] outline-none"
                  style={selectStyle}
                />
              </div>

              <div className="pt-1 pb-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-xl text-[14px] font-bold text-black transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: '#FAFAFA' }}
                >
                  {isPending ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
