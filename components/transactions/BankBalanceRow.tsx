'use client';
import { Landmark, Edit2 } from 'lucide-react';
import { updateBankBalanceAction } from '@/app/actions/accounts';
import { formatPaise } from '@/lib/money';

export function BankBalanceRow({ account }: { account: any }) {
  return (
    <div className="minimal-card rounded-xl px-5 py-4 flex items-center justify-between gap-3 group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${account.color ?? '#ffffff'}12` }}>
          <Landmark size={15} style={{ color: account.color ?? '#A1A1AA' }} />
        </div>
        <div>
          <p className="text-[13.5px] font-medium text-white">{account.name}</p>
          <p className="text-[11.5px] text-[#52525B]">{account.type.replaceAll('_', ' ')}</p>
        </div>
      </div>
      <div className="text-right cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors flex items-center gap-2"
           onClick={async () => {
             const bal = prompt(`Enter current balance for ${account.name} (₹):`, (account.balancePaise / 100).toString());
             if (bal !== null && !isNaN(Number(bal))) {
               await updateBankBalanceAction(account.id, Math.round(Number(bal) * 100));
             }
           }}>
        <p className="text-[15px] font-bold text-white">{formatPaise(account.balancePaise || 0)}</p>
        <Edit2 size={12} className="text-[#52525B] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}
