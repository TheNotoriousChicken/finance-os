'use client';

import { useState } from 'react';
import { QuickEntrySheet } from '@/components/transactions/QuickEntrySheet';
import { FAB } from '@/components/layout/FAB';

export function DashboardClientWrapper({ 
  children, 
  categories, 
  paymentMethods 
}: { 
  children: React.ReactNode,
  categories: any[],
  paymentMethods: any[]
}) {
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);

  return (
    <>
      {children}
      <FAB onClick={() => setIsQuickEntryOpen(true)} />
      <QuickEntrySheet 
        isOpen={isQuickEntryOpen} 
        onClose={() => setIsQuickEntryOpen(false)} 
        categories={categories}
        paymentMethods={paymentMethods}
      />
    </>
  );
}
