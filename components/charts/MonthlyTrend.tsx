'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MonthlyTrend({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#A1A1AA', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            hide 
            domain={[0, 'dataMax']}
          />
          <Tooltip
            cursor={{ fill: '#27272A' }}
            contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', borderRadius: '12px' }}
            itemStyle={{ color: '#FAFAFA' }}
            formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`}
          />
          <Bar dataKey="expense" fill="#FF4757" radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="income" fill="#00D68F" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
