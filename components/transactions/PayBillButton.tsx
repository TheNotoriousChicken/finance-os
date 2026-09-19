'use client';
import { CheckCircle2 } from 'lucide-react';
import { payCreditCardBillAction } from '@/app/actions/accounts';

export function PayBillButton({ cardId }: { cardId: number }) {
  return (
    <button 
      onClick={async () => {
        if (window.confirm("Are you sure you paid this bill? This will reset your outstanding balance to zero.")) {
          await payCreditCardBillAction(cardId);
        }
      }}
      className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg" 
      style={{ 
        background: 'linear-gradient(135deg, rgba(0, 214, 143, 0.15) 0%, rgba(0, 214, 143, 0.05) 100%)', 
        color: '#00D68F',
        border: '1px solid rgba(0, 214, 143, 0.3)'
      }}
    >
      <CheckCircle2 size={10} /> Pay Bill
    </button>
  );
}
