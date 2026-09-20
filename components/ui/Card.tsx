import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'premium' | 'ghost' }>((
  { className, variant = 'default', ...props }, ref
) => {
  const base = 'rounded-2xl overflow-hidden';
  const variants = {
    default: 'minimal-card',
    premium: 'premium-card rounded-2xl overflow-hidden',
    ghost: 'border border-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden',
  };
  return <div ref={ref} className={cn(base, variants[variant], className)} {...props} />;
});
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between px-5 pt-5 pb-4', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-[11px] font-bold text-[#52525B] uppercase tracking-widest', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center px-5 pb-5 pt-0 gap-3', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';
