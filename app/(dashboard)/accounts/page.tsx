export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { formatPaise } from '@/lib/money';
import { calculateCombinedUtilization } from '@/lib/engine/utilization';
import { CreditCard, Landmark, CheckCircle2 } from 'lucide-react';
import { payCreditCardBillAction } from '@/app/actions/accounts';

export default async function AccountsPage() {
  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { type: 'asc' },
  });

  const creditCards = paymentMethods.filter(pm => pm.type === 'CREDIT_CARD');
  const otherMethods = paymentMethods.filter(pm => pm.type !== 'CREDIT_CARD');
  const utilization = calculateCombinedUtilization(paymentMethods);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className=" max-w-3xl mx-auto pb-10 page-enter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Accounts</h1>
        <p className="text-sm text-[#52525B] mt-1">Cards and payment methods</p>
      </div>

      {/* Combined utilization */}
      {creditCards.length > 0 && (
        <div
          className="rounded-2xl p-6"
          style={{ background: 'linear-gradient(145deg, rgba(18,18,20,0.98) 0%, rgba(10,10,12,1) 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-1">Combined Utilization</p>
              <p className="text-4xl font-bold tracking-tight" style={{ color: utilization.utilizationPct > 50 ? '#FFB547' : '#00D68F' }}>
                {utilization.utilizationPct.toFixed(1)}%
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
              style={{
                background: utilization.tier === 'low' || utilization.tier === 'moderate' ? 'rgba(0,214,143,0.1)' : 'rgba(255,71,87,0.1)',
                color: utilization.tier === 'low' || utilization.tier === 'moderate' ? '#00D68F' : '#FF4757',
              }}>
              {utilization.tier.replace('-', ' ')}
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(100, utilization.utilizationPct)}%`,
                background: utilization.utilizationPct > 75 ? '#FF4757' : utilization.utilizationPct > 50 ? '#FFB547' : '#00D68F',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#52525B]">
            <span>{formatPaise(utilization.totalOutstandingPaise)} outstanding</span>
            <span>{formatPaise(utilization.totalLimitPaise)} limit</span>
          </div>
        </div>
      )}

      {/* Credit Cards */}
      {creditCards.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest px-1">Credit Cards</p>
          {creditCards.map(card => {
            const utilPct = card.limitPaise ? Math.round((card.outstandingPaise / card.limitPaise) * 100) : 0;
            const available = (card.limitPaise ?? 0) - card.outstandingPaise;
            return (
              <div key={card.id} className="minimal-card rounded-2xl p-5">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${card.color ?? '#ffffff'}15` }}
                    >
                      <CreditCard size={18} style={{ color: card.color ?? '#A1A1AA' }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-white">{card.name}</p>
                      <p className="text-[12px] text-[#52525B] mt-0.5">Credit Card</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: utilPct > 75 ? 'rgba(255,71,87,0.1)' : 'rgba(0,214,143,0.1)', color: utilPct > 75 ? '#FF4757' : '#00D68F' }}>
                    {utilPct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, utilPct)}%`, background: utilPct > 75 ? '#FF4757' : utilPct > 50 ? '#FFB547' : '#00D68F' }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                  <div>
                    <p className="text-[11px] text-[#52525B] uppercase tracking-wider">Outstanding</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[15px] font-bold text-white">{formatPaise(card.outstandingPaise)}</p>
                      {card.outstandingPaise > 0 && (
                        <form action={payCreditCardBillAction.bind(null, card.id)}>
                          <button type="submit" className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider transition-colors" style={{ background: 'rgba(0, 214, 143, 0.1)', color: '#00D68F' }}>
                            <CheckCircle2 size={10} /> Pay Bill
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#52525B] uppercase tracking-wider">Available</p>
                    <p className="text-[15px] font-bold text-[#00D68F] mt-0.5">{formatPaise(available)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Other methods */}
      {otherMethods.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest px-1">Other</p>
          {otherMethods.map(pm => (
            <div key={pm.id} className="minimal-card rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${pm.color ?? '#ffffff'}12` }}>
                <Landmark size={15} style={{ color: pm.color ?? '#A1A1AA' }} />
              </div>
              <div className="flex-1">
                <p className="text-[13.5px] font-medium text-white">{pm.name}</p>
                <p className="text-[11.5px] text-[#52525B]">{pm.type.replaceAll('_', ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {paymentMethods.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <CreditCard size={22} className="text-[#52525B]" />
          </div>
          <h3 className="text-white font-semibold mb-1">No accounts yet</h3>
          <p className="text-[#52525B] text-sm">Add a payment method to start tracking</p>
        </div>
      )}
    </div>
  );
}
