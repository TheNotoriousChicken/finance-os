'use client';
import { useState, useRef } from 'react';
import { Landmark, Check, X } from 'lucide-react';
import { updateBankBalanceAction } from '@/app/actions/accounts';
import { formatPaise } from '@/lib/money';

export function BankBalanceRow({ account }: { account: any }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const val = inputRef.current?.value;
    if (val !== undefined && !isNaN(Number(val))) {
      setSaving(true);
      await updateBankBalanceAction(account.id, Math.round(Number(val) * 100));
      setSaving(false);
    }
    setEditing(false);
  };

  return (
    <div className="minimal-card rounded-xl px-5 py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${account.color ?? '#ffffff'}12` }}>
          <Landmark size={15} style={{ color: account.color ?? '#A1A1AA' }} />
        </div>
        <div>
          <p className="text-[13.5px] font-normal text-slate-200">{account.name}</p>
          <p className="leading-relaxed text-[11.5px] text-[#52525B]">{account.type.replaceAll('_', ' ')}</p>
        </div>
      </div>

      <div className="text-right">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="number"
              defaultValue={((account.balancePaise || 0) / 100).toString()}
              className="leading-relaxed w-28 h-8 px-2 rounded-lg text-sm text-slate-200 text-right outline-none focus:ring-1 focus:ring-[#00D68F]/50"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button onClick={handleSave} disabled={saving} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#00D68F] hover:bg-[#00D68F]/10 transition-colors">
              <Check size={14} />
            </button>
            <button onClick={() => setEditing(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#52525B] hover:bg-white/5 transition-colors">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[15px] font-bold text-slate-200 hover:text-[#00D68F] transition-colors cursor-pointer"
            title="Click to edit balance"
          >
            {formatPaise(account.balancePaise || 0)}
          </button>
        )}
      </div>
    </div>
  );
}
