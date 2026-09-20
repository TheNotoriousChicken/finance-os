import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  variant?: 'accent' | 'success' | 'warning' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

const variantColors: Record<string, string> = {
  accent: 'bg-white',
  success: 'bg-[#00D68F]',
  warning: 'bg-[#FFB547]',
  danger: 'bg-[#FF4757]',
  gold: 'bg-[#FFD700]',
};

const variantGlow: Record<string, string> = {
  accent: 'none',
  success: 'none',
  warning: 'none',
  danger: 'none',
  gold: 'none',
};

const sizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function Progress({
  value,
  max = 100,
  label,
  sublabel,
  variant = 'accent',
  size = 'md',
  showValue = false,
  animated = true,
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const displayVariant = pct >= 100 ? 'success' : variant;

  return (
    <div className={cn('space-y-2', className)}>
      {(label || showValue) && (
        <div className="leading-relaxed flex items-center justify-between text-sm">
          {label && <span className="text-[#A1A1AA] font-normal">{label}</span>}
          {showValue && (
            <span className="font-bold text-slate-200 font-mono">{pct.toFixed(pct % 1 === 0 ? 0 : 1)}%</span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-[#27272A] rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn(variantColors[displayVariant], 'h-full rounded-full', animated && 'transition-all duration-700 ease-out')}
          style={{ width: `${pct}%`, boxShadow: pct > 0 ? variantGlow[displayVariant] : 'none' }}
        />
      </div>
      {sublabel && <p className="leading-relaxed text-xs text-[#71717A]">{sublabel}</p>}
    </div>
  );
}
