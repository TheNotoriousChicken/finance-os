'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveBudgetAction(formData: FormData) {
  const month = formData.get('month') as string || '2026-09';
  const totalLimit = parseFloat(formData.get('totalLimit') as string) * 100;
  
  if (isNaN(totalLimit)) throw new Error('Invalid limit');

  await prisma.budget.upsert({
    where: { id: 1 }, // simplified for single user
    update: { month, totalLimitPaise: totalLimit },
    create: { id: 1, month, totalLimitPaise: totalLimit }
  });

  revalidatePath('/budgets');
}