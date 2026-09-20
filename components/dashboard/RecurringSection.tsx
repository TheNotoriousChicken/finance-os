import { RefreshCw } from 'lucide-react';
import { formatPaise } from '@/lib/money';

export function RecurringSection({ subscriptions }: { subscriptions: any[] }) {
  if (!subscriptions.length) return null;
  return (
    <div className="minimal-card rounded-2xl p-5">
      <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-4">Recurring & Subscriptions</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {subscriptions.map(sub => {
          const nextDate = sub.nextExpectedDate ? new Date(sub.nextExpectedDate) : null;
          const daysUntil = nextDate ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
          return (
            <div key={sub.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,214,143,0.1)' }}>
                  <RefreshCw size={14} style={{ color: '#00D68F' }} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">{sub.merchantName}</p>
                  <p className="text-[11px] text-[#52525B]">{sub.occurrenceCount}x detected</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-white">{formatPaise(sub.avgAmountPaise)}</p>
                {daysUntil !== null && (
                  <p className="text-[11px]" style={{ color: daysUntil <= 3 ? '#FF4757' : '#52525B' }}>
                    {daysUntil <= 0 ? 'Due now' : `in ${daysUntil}d`}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
