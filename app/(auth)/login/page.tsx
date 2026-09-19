'use client';

import { useState, useTransition } from 'react';
import { useActionState } from 'react';
import { loginAction } from './actions';
import { TrendingUp, ArrowRight } from 'lucide-react';

const initialState = { error: '' };

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-dvh bg-transparent flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden text-white">
      <div className="w-full max-w-sm relative z-10 flex flex-col items-center minimal-card p-10 rounded-[2.5rem]">
        {/* Abstract Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center rounded-[2rem] bg-[#18181B]/10 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_20px_40px_rgba(0,0,0,0.5)] border border-white/20">
             <TrendingUp size={32} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-white mb-2 font-serif" style={{ fontFamily: 'Georgia, serif' }}>
            finance_os
          </h1>
          <p className="text-white/60 text-sm tracking-widest uppercase font-medium">Members Only</p>
        </div>

        {/* Auth form */}
        <form
          action={formAction}
          className="w-full space-y-8"
        >
          <div className="relative group">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              className="w-full bg-[#18181B]/5 border-b-2 border-white/10 px-2 py-4 text-center text-3xl tracking-[0.5em] text-white placeholder-white/20 transition-all focus:outline-none focus:border-white focus:bg-[#18181B]/10 font-mono rounded-xl"
              placeholder="••••"
            />
          </div>

          {state?.error && (
            <div className="text-[#FF4757] text-sm text-center font-medium animate-in fade-in slide-in-from-bottom-2">
              {state.error}
            </div>
          )}

          <div className="pt-4">
             <button
                type="submit"
                disabled={isPending}
                className="group relative w-full h-16 flex items-center justify-center gap-3 rounded-full bg-[#18181B] text-white font-bold text-lg transition-all hover:bg-[#27272A] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                {isPending ? 'Verifying...' : 'Access'}
                {!isPending && <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />}
              </button>
          </div>
        </form>

        <p className="mt-12 text-center text-white/40 text-xs uppercase tracking-widest">
          End-to-End Encrypted
        </p>
      </div>
    </div>
  );
}