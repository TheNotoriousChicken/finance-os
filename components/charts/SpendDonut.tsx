'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatPaise } from '@/lib/money';

export default function SpendDonut({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => formatPaise(Number(value))}
            contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', borderRadius: '12px' }}
            itemStyle={{ color: '#FAFAFA' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
