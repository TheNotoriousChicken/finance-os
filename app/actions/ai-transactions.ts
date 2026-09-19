
'use server';

import { parseTransactionFromText } from '@/lib/ai';

export async function parseTransactionFromAiAction(text: string) {
  if (!text || text.trim().length < 5) {
    throw new Error('Please paste a valid SMS or receipt text.');
  }

  const currentDateStr = new Date().toISOString();
  const parsed = await parseTransactionFromText(text, currentDateStr);
  return parsed;
}
