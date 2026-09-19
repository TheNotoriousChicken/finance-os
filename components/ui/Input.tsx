import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightElement, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#A1A1AA]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-[#18181B] border border-[#27272A] rounded-lg py-2.5 text-white text-sm placeholder-[#9CA3AF] transition-colors shadow-sm',
              'focus:outline-none focus:border-white focus:ring-1 focus:ring-white',
              error && 'border-[#FF4757] focus:border-[#FF4757] focus:ring-[#FF4757]',
              leftIcon ? 'pl-10' : 'pl-3',
              rightElement ? 'pr-10' : 'pr-3',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#FF4757]">{error}</p>}
        {hint && !error && <p className="text-xs text-[#6B6B6B]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
