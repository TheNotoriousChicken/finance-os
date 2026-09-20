'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function MonthPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const now = new Date();
  const currentMonth = searchParams.get('month') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [year, month] = currentMonth.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
  const isCurrentMonth = currentMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const navigate = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', key);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A1A1AA] hover:text-slate-200 hover:bg-white/8 transition-colors">
        <ChevronLeft size={16} />
      </button>
      <span className="text-[14px] font-bold text-slate-200 min-w-[140px] text-center">{label}</span>
      <button onClick={() => navigate(1)} disabled={isCurrentMonth} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A1A1AA] hover:text-slate-200 hover:bg-white/8 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
