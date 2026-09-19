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
      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider transition-colors" 
      style={{ background: 'rgba(0, 214, 143, 0.1)', color: '#00D68F' }}
    >
      <CheckCircle2 size={10} /> Pay Bill
    </button>
  );
}
