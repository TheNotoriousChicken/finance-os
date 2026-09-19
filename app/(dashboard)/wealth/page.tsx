import { prisma } from '@/lib/prisma';
import { getNetWorthSummary } from '@/lib/engine/wealth';
import { formatPaise } from '@/lib/money';
import { LineChart, Briefcase, Plus } from 'lucide-react';
import { RefreshPricesClient } from './RefreshPricesClient';
import { AddAssetClient } from './AddAssetClient';

export const dynamic = 'force-dynamic';

export default async function WealthPage() {
  const summary = await getNetWorthSummary();
  
  const assets = await prisma.asset.findMany({
    orderBy: { currentPricePaise: 'desc' }
  });

  const isPositive = summary.netWorthPaise >= 0;
  const pnlPositive = summary.unrealizedPnLPaise >= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className=" max-w-4xl mx-auto pb-10 page-enter">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Wealth</h1>
          <p className="text-sm text-[#52525B] mt-1">Net worth and investment tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshPricesClient />
          <AddAssetClient />
        </div>
      </div>

      {/* Net Worth Hero */}
      <div className="premium-card rounded-3xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <p className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-widest mb-2">Total Net Worth</p>
        <div className="flex items-baseline gap-4">
          <h2 className={`text-5xl font-bold tracking-tight ${isPositive ? 'text-white' : 'text-[#FF4757]'}`}>
            {formatPaise(summary.netWorthPaise)}
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px", marginTop: "32px" }}>
          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05]">
            <p className="text-[11px] text-[#A1A1AA] uppercase tracking-wider mb-1">Total Assets</p>
            <p className="text-lg font-bold text-white">{formatPaise(summary.totalAssetsPaise)}</p>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05]">
            <p className="text-[11px] text-[#A1A1AA] uppercase tracking-wider mb-1">Total Liabilities</p>
            <p className="text-lg font-bold text-[#FF4757]">{formatPaise(summary.totalLiabilitiesPaise)}</p>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05]">
            <p className="text-[11px] text-[#A1A1AA] uppercase tracking-wider mb-1">Unrealized P&L</p>
            <p className={`text-lg font-bold ${pnlPositive ? 'text-[#00D68F]' : 'text-[#FF4757]'}`}>
              {pnlPositive ? '+' : ''}{formatPaise(summary.unrealizedPnLPaise)}
              <span className="text-xs ml-2 opacity-70">({pnlPositive ? '+' : ''}{summary.pnlPercentage.toFixed(2)}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Holdings List */}
      <div className="space-y-4 mt-4">
        <h3 className="text-[13px] font-semibold text-[#A1A1AA] uppercase tracking-widest px-1">Your Portfolio</h3>
        
        {assets.length === 0 ? (
          <div className="minimal-card rounded-2xl p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mb-4 text-[#52525B]">
              <Briefcase size={24} />
            </div>
            <p className="text-white font-medium mb-1">No assets tracked yet</p>
            <p className="text-sm text-[#A1A1AA] max-w-xs">Add your first stock, mutual fund, or crypto to start tracking your net worth.</p>
          </div>
        ) : (
          <div className="minimal-card rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#121214] border-b border-[#27272A] text-[11px] uppercase tracking-wider text-[#A1A1AA]">
                <tr>
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-5 py-3 font-medium">Quantity</th>
                  <th className="px-5 py-3 font-medium">Avg Price</th>
                  <th className="px-5 py-3 font-medium">Current Price</th>
                  <th className="px-5 py-3 font-medium text-right">Total Value</th>
                  <th className="px-5 py-3 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {assets.map(asset => {
                  const invested = (asset.averageBuyPricePaise ?? 0) * asset.quantity;
                  const current = asset.currentPricePaise * asset.quantity;
                  const pnl = current - invested;
                  const isGain = pnl >= 0;
                  
                  return (
                    <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{asset.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-[#A1A1AA]">{asset.type}</span>
                          {asset.ticker && <span className="text-[11px] text-[#52525B]">{asset.ticker}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#A1A1AA]">{asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                      <td className="px-5 py-4 text-[#A1A1AA]">{formatPaise(asset.averageBuyPricePaise ?? 0)}</td>
                      <td className="px-5 py-4 text-white font-medium">{formatPaise(asset.currentPricePaise)}</td>
                      <td className="px-5 py-4 text-right font-bold text-white">{formatPaise(current)}</td>
                      <td className="px-5 py-4 text-right">
                        <p className={`font-medium ${isGain ? 'text-[#00D68F]' : 'text-[#FF4757]'}`}>
                          {isGain ? '+' : ''}{formatPaise(pnl)}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
