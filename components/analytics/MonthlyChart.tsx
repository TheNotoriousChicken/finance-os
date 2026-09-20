'use client';

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MonthlyChartProps {
  data: { month: string; amount: number; amountFormatted: string }[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  if (!data || data.length === 0) {
    return <div className="leading-relaxed h-44 flex items-center justify-center text-[#52525B] text-sm">No expense data yet</div>;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#121214] border border-[#27272A] p-3 rounded-lg shadow-xl">
          <p className="leading-relaxed text-[11px] text-[#A1A1AA] uppercase tracking-wider mb-1">{payload[0].payload.month}</p>
          <p className="leading-relaxed text-sm font-bold text-slate-200">{payload[0].payload.amountFormatted}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-56 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barSize={32}>
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#52525B', fontSize: 11 }}
            dy={10}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          <Bar dataKey="amount" radius={[4, 4, 4, 4]}>
            {data.map((entry, index) => {
              const isLatest = index === data.length - 1;
              return <Cell key={`cell-${index}`} fill={isLatest ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.12)'} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
