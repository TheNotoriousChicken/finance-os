import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'accent';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#27272A] text-[#A1A1AA]',
  success: 'bg-[#00D68F]/10 text-[#00D68F]',
  warning: 'bg-[#FFB547]/10 text-[#FFB547]',
  danger: 'bg-[#FF4757]/10 text-[#FF4757]',
  info: 'bg-[#4D9EF7]/10 text-[#4D9EF7]',
  gold: 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20',
  accent: 'bg-white text-black',
};

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
