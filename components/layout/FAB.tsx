'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FABProps {
  onClick?: () => void;
}

export function FAB({ onClick }: FABProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={cn(
        'fixed right-4 sm:right-8 z-50 rounded-full w-14 h-14 flex items-center justify-center',
        'font-normal text-black shadow-lg bg-white',
        'transition-all duration-150',
        isPressed ? 'scale-90' : 'hover:scale-105 hover:bg-[#F4F4F5] hover:shadow-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2'
      )}
      style={{
        bottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 70px)',
      }}
      aria-label="Add transaction"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}
