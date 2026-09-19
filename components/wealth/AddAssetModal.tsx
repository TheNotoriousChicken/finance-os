'use client';

import { useState, useTransition } from 'react';
import { addAssetAction } from '@/app/actions/investments';
import { Button } from '@/components/ui/Button';
import { X, TrendingUp, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AddAssetModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [form, setForm] = useState({
    type: 'STOCK',
    name: '',
    ticker: '',
    quantity: '',
    averageBuyPrice: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await addAssetAction({
        type: form.type,
        name: form.name,
        ticker: form.ticker,
        quantity: parseFloat(form.quantity),
        averageBuyPricePaise: Math.round(parseFloat(form.averageBuyPrice) * 100),
      });
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-[#27272A] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#27272A]">
          <h2 className="text-lg font-semibold text-white">Add Investment</h2>
          <button onClick={onClose} className="text-[#A1A1AA] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5 uppercase tracking-wider">Asset Type</label>
            <select
              value={form.type}
              onChange={e => setForm({...form, type: e.target.value})}
              className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#3F3F46] [color-scheme:dark]"
            >
              <option value="STOCK">Stock</option>
              <option value="MUTUAL_FUND">Mutual Fund</option>
              <option value="CRYPTO">Cryptocurrency</option>
              <option value="FD">Fixed Deposit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5 uppercase tracking-wider">Asset Name</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              placeholder="e.g. HDFC Bank, Axis Bluechip"
              className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#3F3F46] [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5 uppercase tracking-wider">Ticker Symbol (Optional)</label>
            <input
              type="text"
              value={form.ticker}
              onChange={e => setForm({...form, ticker: e.target.value})}
              placeholder="e.g. HDFCBANK.NS or BTC-USD"
              className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#3F3F46] [color-scheme:dark]"
            />
            <p className="text-[11px] text-[#52525B] mt-1.5">For live prices, use Yahoo Finance tickers (.NS for NSE, .BO for BSE).</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5 uppercase tracking-wider">Quantity</label>
              <input
                required
                type="number"
                step="any"
                value={form.quantity}
                onChange={e => setForm({...form, quantity: e.target.value})}
                placeholder="e.g. 10.5"
                className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#3F3F46] [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5 uppercase tracking-wider">Avg Buy Price (₹)</label>
              <input
                required
                type="number"
                step="any"
                value={form.averageBuyPrice}
                onChange={e => setForm({...form, averageBuyPrice: e.target.value})}
                placeholder="e.g. 1500.50"
                className="w-full bg-[#0A0A0B] border border-[#27272A] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#3F3F46] [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" loading={isPending} className="w-full">
              Add Asset
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
