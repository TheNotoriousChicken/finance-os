'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  numericValue?: number;
  sublabel?: string;
  trend?: { value: number; label: string };
  icon?: React.ReactNode;
  accent?: string;
  badge?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatCard({
  label,
  value,
  sublabel,
  trend,
  icon,
  accent,
  badge,
  className,
  size = 'md',
}: StatCardProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { 
        if (entry.isIntersecting) {
          setVisible(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const valueSize = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-financial-large',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'minimal-card rounded-xl p-6 relative overflow-hidden flex flex-col justify-between',
        'hover:bg-[#18181B] transition-colors',
        className
      )}
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-200">{icon}</div>
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <p className="leading-relaxed text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">{label}</p>
        </div>
        {badge}
      </div>

      <div>
        <div
          className={cn(
            'font-bold tracking-tight relative z-10',
            valueSize[size],
            !accent && 'bg-gradient-to-br from-white via-[#E4E4E7] to-[#71717A] bg-clip-text text-transparent drop-shadow-sm',
            visible && 'animate-count-up'
          )}
          style={accent ? { color: accent, animationFillMode: 'forwards' } : { animationFillMode: 'forwards' }}
        >
          {value}
        </div>

        {sublabel && (
          <p className="leading-relaxed mt-2 text-xs text-[#888] font-normal relative z-10">{sublabel}</p>
        )}

        {trend && (
          <div className={cn(
            'mt-3 flex items-center gap-1.5 text-xs font-bold tracking-wide relative z-10',
            trend.value > 0 ? 'text-[#FF4757]' : 'text-[#00F0FF]'
          )}>
            <span>{trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
            <span className="text-[#666] font-normal tracking-normal">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
