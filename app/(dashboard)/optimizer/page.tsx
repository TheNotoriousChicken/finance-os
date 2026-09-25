'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { smartOptimizeAction } from '@/app/actions/optimizer';
import { formatPaise } from '@/lib/money';
import { Sparkles, ArrowRight, AlertTriangle, MessageSquare, Loader2, Send } from 'lucide-react';

export default function OptimizerPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');

    startTransition(async () => {
      try {
        const result = await smartOptimizeAction(userMsg.text);
        setMessages(prev => [...prev, { role: 'ai', result }]);
      } catch (err: any) {
        setMessages(prev => [...prev, { role: 'ai', error: err.message || 'Something went wrong.' }]);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 120px)" }} className="max-w-3xl mx-auto page-enter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="text-[#00D68F]" size={28} /> AI Assistant & Optimizer
        </h1>
        <p className="leading-relaxed text-sm text-[#52525B] mt-1">
          Ask me "How much is my HDFC limit?" or "Which card for ₹60k laptop at Croma, ₹25k on UPI?"
        </p>
      </div>

      <div className="flex-1 minimal-card rounded-2xl overflow-hidden flex flex-col border border-[#27272A]/50">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6" style={{ background: 'rgba(10,10,12,0.4)' }}>
          {messages.length === 0 && (
             <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <Sparkles size={40} className="text-[#27272A] mb-4" />
                <p className="text-slate-200 font-bold mb-2">I am Gemini, your Finance OS AI.</p>
                <p className="text-[#A1A1AA] text-[13px] leading-relaxed max-w-sm">
                  I can analyze your transactions deterministically, compare EMI costs, check your active limits, or tell you which card yields the highest net reward. Try asking me a question!
                </p>
             </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
              <div 
                className={`p-4 rounded-2xl leading-relaxed text-[14px] ${msg.role === 'user' ? 'bg-[#27272A] text-slate-200 rounded-tr-sm' : 'bg-transparent text-slate-200 rounded-tl-sm border border-[#27272A]'}`}
                style={msg.role === 'ai' ? { background: 'rgba(255,255,255,0.02)' } : {}}
              >
                {msg.role === 'user' ? (
                  msg.text
                ) : msg.error ? (
                  <span className="text-red-400">{msg.error}</span>
                ) : msg.result?.type === 'error' ? (
                  <span className="text-red-400">{msg.result.error}</span>
                ) : msg.result?.type === 'chat' ? (
                  <div className="whitespace-pre-wrap">{msg.result.answer}</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-[15px]">
                      🏆 <span className="font-bold text-[#00D68F]">{msg.result.bestOption.name}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="p-3 rounded-xl bg-black/40 border border-[#27272A]">
                        <p className="text-[11px] font-bold text-[#52525B] uppercase tracking-wider mb-1">Net Effective Cost</p>
                        <p className="text-[18px] font-bold text-white tabular-nums">{formatPaise(msg.result.bestOption.netCost)}</p>
                        {msg.result.parsed?.splitUpiPaise > 0 && <p className="text-[10px] text-[#A1A1AA] mt-1">+ {formatPaise(msg.result.parsed.splitUpiPaise)} UPI split</p>}
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-[#27272A]">
                        <p className="text-[11px] font-bold text-[#52525B] uppercase tracking-wider mb-1">Estimated Reward</p>
                        <p className="text-[18px] font-bold text-[#FFD700] tabular-nums">
                           {msg.result.bestOption.baseEarned} <span className="text-[11px] text-[#A1A1AA]">pts</span>
                        </p>
                        <p className="text-[11px] text-[#A1A1AA] mt-1 font-bold">Value: {formatPaise(msg.result.bestOption.valPaise)}</p>
                      </div>
                    </div>

                    {msg.result.geminiAnalysis && (
                      <div className="p-3 rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/5 text-[13px] text-[#A1A1AA] leading-relaxed">
                        <p className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Sparkles size={10} /> AI Analysis
                        </p>
                        {msg.result.geminiAnalysis}
                      </div>
                    )}

                    {msg.result.needsVerification && (
                      <div className="flex gap-2 items-center text-[#FFB547] text-[12px] bg-[#FFB547]/10 p-2 rounded-lg border border-[#FFB547]/20">
                        <AlertTriangle size={14} />
                        <span>Treat as estimate — reward eligibility not verified. Confidence: {msg.result.confidence}</span>
                      </div>
                    )}

                    <div className="border-t border-[#27272A] pt-4 mt-2">
                      <p className="text-[11px] font-bold text-[#52525B] uppercase tracking-wider mb-3">Comparison</p>
                      <div className="flex flex-col gap-2">
                        {msg.result.options.map((opt: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[12px] p-2 rounded-lg hover:bg-white/5">
                            <div>
                              <p className="font-bold text-slate-200">{opt.name}</p>
                              {opt.valPaise > 0 && <p className="text-[11px] text-[#00D68F]">Earns {formatPaise(opt.valPaise)}</p>}
                              {opt.fees > 0 && <p className="text-[11px] text-[#FF4757]">Fees: {formatPaise(opt.fees)}</p>}
                              {opt.emiCost > 0 && <p className="text-[11px] text-[#FF4757]">EMI Cost: {formatPaise(opt.emiCost)}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-[#A1A1AA]">Net Cost</p>
                              <p className="font-bold text-white tabular-nums">{formatPaise(opt.netCost)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isPending && (
             <div className="self-start p-4 rounded-2xl bg-transparent text-[#A1A1AA] flex gap-2 items-center">
                <Loader2 size={16} className="animate-spin" /> Thinking...
             </div>
          )}
          <div ref={bottomRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="p-3 bg-[#121214] border-t border-[#27272A] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isPending}
            placeholder="e.g. ₹60k laptop at Croma, ₹25k on UPI"
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 px-3 placeholder:text-[#52525B]"
            autoComplete="off"
          />
          <button 
            type="submit" 
            disabled={isPending || !query.trim()}
            className="w-10 h-10 rounded-xl bg-[#00D68F] flex items-center justify-center text-black disabled:opacity-50 transition-transform active:scale-95"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
