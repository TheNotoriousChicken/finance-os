'use client';
import { useTransition } from 'react';
import { refreshPricesAction } from '@/app/actions/investments';
import { RefreshCw } from 'lucide-react';

export function RefreshPricesClient() {
  const [isPending, startTransition] = useTransition();

  return (
    <button 
      onClick={() => startTransition(async () => { await refreshPricesAction(); })}
      disabled={isPending}
      className="flex items-center gap-2 bg-white/5 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
    >
      <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
      Refresh
    </button>
  );
}
