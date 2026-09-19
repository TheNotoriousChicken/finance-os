'use server';

import { parseSearchIntent } from '@/lib/ai';
import { redirect } from 'next/navigation';

export async function submitNaturalLanguageSearch(query: string) {
  if (!query || query.trim() === '') {
    redirect('/transactions');
  }

  const currentDateStr = new Date().toISOString();
  const intent = await parseSearchIntent(query, currentDateStr);

  const params = new URLSearchParams();
  if (intent.merchantName) params.set('merchant', intent.merchantName);
  if (intent.categoryName) params.set('category', intent.categoryName);
  if (intent.startDate) params.set('start', intent.startDate);
  if (intent.endDate) params.set('end', intent.endDate);
  if (intent.minAmountPaise) params.set('min', intent.minAmountPaise.toString());
  if (intent.maxAmountPaise) params.set('max', intent.maxAmountPaise.toString());

  // We could also pass the raw query back just for UI purposes
  params.set('q', query);

  redirect(`/transactions?${params.toString()}`);
}