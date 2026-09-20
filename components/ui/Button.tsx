
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-normal transition-all focus:outline-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
    
    const variants = {
      primary: 'bg-white text-black hover:bg-[#E4E4E7]',
      secondary: 'bg-[#27272A] text-slate-200 hover:bg-[#3F3F46]',
      outline: 'border border-[#27272A] bg-transparent text-slate-200 hover:bg-[#18181B]',
      ghost: 'bg-transparent text-[#A1A1AA] hover:text-slate-200 hover:bg-[#18181B]',
      danger: 'bg-[#FF4757] text-slate-200 hover:bg-[#FF6B78]',
    };

    const sizes = {
      sm: 'h-9 px-4 text-xs',
      md: 'h-11 px-6 text-sm',
      lg: 'h-12 px-8 text-base',
      xl: 'h-14 px-10 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
