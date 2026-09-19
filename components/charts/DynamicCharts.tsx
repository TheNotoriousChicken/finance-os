'use client';
import dynamic from 'next/dynamic';
import { SkeletonCard } from '@/components/ui/Skeleton';

export const SpendDonut = dynamic(() => import('./SpendDonut'), {
  ssr: false,
  loading: () => <SkeletonCard className="h-72" />,
});

export const MonthlyTrend = dynamic(() => import('./MonthlyTrend'), {
  ssr: false,
  loading: () => <SkeletonCard className="h-64" />,
});