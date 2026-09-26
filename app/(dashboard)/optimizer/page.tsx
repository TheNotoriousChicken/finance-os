'use client';
import { useState, useTransition, useRef, useEffect } from 'react';
import { smartOptimizeAction } from '@/app/actions/optimizer';
import { weeklyDigestAction, type WeeklyDigestResult } from '@/app/actions/digest';
import { formatPaise } from '@/lib/money';
import {
  Sparkles, AlertTriangle, Loader2, Send,
  TrendingUp, TrendingDown, RefreshCw,
} from 'lucide-react';

const ACCENT_STYLES = {
  green:   { border: 'border-[#00D68F]/25', bg: 'bg-[#00D68F]/5', dot: 'bg-[#00D68F]' },
  yellow:  { border: 'border-[#FFB547]/25', bg: 'bg-[#FFB547]/5', dot: 'bg-[#FFB547]' },
  red:     { border: 'border-[#FF4757]/25', bg: 'bg-[#FF4757]/5', dot: 'bg-[#FF4757]' },
  blue:    { border: 'border-[#3B82F6]/25', bg: 'bg-[#3B82F6]/5', dot: 'bg-[#3B82F6]' },
  neutral: { border: 'border-[#27272A]',    bg: 'bg-white/[0.02]', dot: 'bg-[#52525B]' },
};

export default function OptimizerPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Digest state
  const [digest, setDigest] = useState<WeeklyDigestResult | null>(null);
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestError, setDigestError] = useState<string | null>(null);

  // Auto-load digest on mount
  useEffect(() => {
    weeklyDigestAction()
      .then(setDigest)
      .catch(e => setDigestError(e.message ?? 'Failed to load digest'))
      .finally(() => setDigestLoading(false));
  }, []);

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

  const refreshDigest = () => {
    setDigestLoading(true);
    setDigestError(null);
    weeklyDigestAction()
      .then(setDigest)
      .catch(e => setDigestError(e.message ?? 'Failed to load digest'))
      .finally(() => setDigestLoading(false));
  };

  return (
    <div className="max-w-3xl mx-auto pb-10 page-enter flex flex-col gap-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="text-[#00D68F]" size={28} /> AI Assistant & Optimizer
        </h1>
        <p className="leading-relaxed text-sm text-[#52525B] mt-1">
          Ask me "Which card for ₹60k laptop at Croma?" or "How much HDFC limit is left?"
        </p>
      </div>

      {/* ── Weekly Digest Card ── */}
      <div className="minimal-card rounded-2xl border border-[#27272A]/60 overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#52525B] uppercase tracking-widest">Weekly Digest</span>
            {digest && (
              <span className="text-[10px] text-[#3B3B3B] tabular-nums">{digest.weekLabel}</span>
            )}
          </div>
          <button
            onClick={refreshDigest}
            disabled={digestLoading}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#52525B] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
            title="Refresh digest"
          >
            <RefreshCw size={13} className={digestLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Loading state */}
          {digestLoading && (
            <div className="flex items-center gap-3 text-[#52525B] text-sm py-4">
              <Loader2 size={16} className="animate-spin text-[#00D68F]" />
              Analyzing your week...
            </div>
          )}

          {/* Error state */}
          {!digestLoading && digestError && (
            <p className="text-[#FF4757] text-sm">{digestError}</p>
          )}

          {/* Stat tiles */}
          {!digestLoading && digest && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {digest.sections.map((s, i) => {
                  const style = ACCENT_STYLES[s.accent ?? 'neutral'];
                  return (
                    <div key={i} className={`rounded-xl border ${style.border} ${style.bg} p-3`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <p className="text-[10px] font-bold text-[#52525B] uppercase tracking-wider">{s.title}</p>
                      </div>
                      <p className="text-[12px] text-[#A1A1AA] leading-snug">
                        <span className="text-xl mr-1">{s.icon}</span>{s.body}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Gemini prose paragraph */}
              <div className="border-t border-[#1F1F1F] pt-4">
                <p className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles size={10} /> Gemini's Take
                </p>
                <p className="text-[13px] text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">
                  {digest.rawInsight}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Chat ── */}
      <div className="minimal-card rounded-2xl overflow-hidden flex flex-col border border-[#27272A]/50" style={{ minHeight: '420px' }}>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6" style={{ background: 'rgba(10,10,12,0.4)', maxHeight: '60vh' }}>
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12">
              <Sparkles size={36} className="text-[#27272A] mb-3" />
              <p className="text-slate-200 font-bold mb-1.5">Ask anything</p>
              <p className="text-[#A1A1AA] text-[13px] leading-relaxed max-w-sm">
                Which card for Croma? EMI vs full payment? How much credit left? I'll run the real numbers.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
              <div
                className={`p-4 rounded-2xl leading-relaxed text-[14px] ${msg.role === 'user' ? 'bg-[#27272A] text-slate-200 rounded-tr-sm' : 'text-slate-200 rounded-tl-sm border border-[#27272A]'}`}
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
                    {/* Best pick */}
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[#00D68F]" />
                      <span className="font-bold text-[#00D68F] text-[15px]">{msg.result.bestOption?.name}</span>
                    </div>

                    {/* Cost + Reward tiles */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-black/40 border border-[#27272A]">
                        <p className="text-[10px] font-bold text-[#52525B] uppercase tracking-wider mb-1">Net Cost</p>
                        <p className="text-[17px] font-bold text-white tabular-nums">{formatPaise(msg.result.bestOption.netCost)}</p>
                        {msg.result.parsed?.splitUpiPaise > 0 && (
                          <p className="text-[10px] text-[#A1A1AA] mt-0.5">+ {formatPaise(msg.result.parsed.splitUpiPaise)} UPI</p>
                        )}
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-[#27272A]">
                        <p className="text-[10px] font-bold text-[#52525B] uppercase tracking-wider mb-1">Reward</p>
                        <p className="text-[17px] font-bold text-[#FFD700] tabular-nums">
                          {msg.result.bestOption.baseEarned} <span className="text-[10px] text-[#A1A1AA]">pts</span>
                        </p>
                        <p className="text-[10px] text-[#A1A1AA] mt-0.5 font-semibold">≈ {formatPaise(msg.result.bestOption.valPaise)}</p>
                      </div>
                    </div>

                    {/* AI analysis box */}
                    {msg.result.geminiAnalysis && (
                      <div className="p-3 rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/5 text-[13px] text-[#A1A1AA] leading-relaxed">
                        <p className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Sparkles size={10} /> Analysis
                        </p>
                        {msg.result.geminiAnalysis}
                      </div>
                    )}

                    {/* Needs verification warning */}
                    {msg.result.needsVerification && (
                      <div className="flex gap-2 items-center text-[#FFB547] text-[12px] bg-[#FFB547]/10 p-2 rounded-lg border border-[#FFB547]/20">
                        <AlertTriangle size={13} />
                        <span>Treat as estimate — reward eligibility not verified. Confidence: {msg.result.confidence}</span>
                      </div>
                    )}

                    {/* All options comparison */}
                    <div className="border-t border-[#27272A] pt-3 mt-1">
                      <p className="text-[10px] font-bold text-[#52525B] uppercase tracking-wider mb-2">All Options</p>
                      <div className="flex flex-col gap-1.5">
                        {msg.result.options.map((opt: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-start text-[12px] p-2 rounded-lg ${idx === 0 ? 'bg-[#00D68F]/5 border border-[#00D68F]/15' : 'hover:bg-white/5'}`}>
                            <div>
                              <p className="font-semibold text-slate-200">{opt.name} {idx === 0 && <span className="text-[#00D68F] ml-1 text-[10px] font-bold">BEST</span>}</p>
                              {opt.valPaise > 0 && <p className="text-[11px] text-[#00D68F]">Earns {formatPaise(opt.valPaise)}</p>}
                              {opt.fees > 0 && <p className="text-[11px] text-[#FF4757]">Fees: {formatPaise(opt.fees)}</p>}
                              {opt.emiCost > 0 && <p className="text-[11px] text-[#FF4757]">Interest: {formatPaise(opt.emiCost)}</p>}
                            </div>
                            <div className="text-right ml-4 shrink-0">
                              <p className="text-[#A1A1AA] text-[10px]">Net Cost</p>
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
            <div className="self-start p-4 rounded-2xl text-[#A1A1AA] flex gap-2 items-center text-sm">
              <Loader2 size={15} className="animate-spin" /> Thinking...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-3 bg-[#0A0A0C] border-t border-[#27272A] flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={isPending}
            placeholder="e.g. ₹60k laptop at Croma, ₹25k on UPI"
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 px-3 placeholder:text-[#52525B]"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="w-10 h-10 rounded-xl bg-[#00D68F] flex items-center justify-center text-black disabled:opacity-40 transition-transform active:scale-95 shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
