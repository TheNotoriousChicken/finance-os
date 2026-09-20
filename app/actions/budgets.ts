'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function saveBudgetAction(formData: FormData) {
  const month = formData.get('month') as string || '2026-09';
  const totalLimit = parseFloat(formData.get('totalLimit') as string) * 100;
  
  if (isNaN(totalLimit)) throw new Error('Invalid limit');
  const schema = z.object({ totalLimit: z.number().positive() });
  schema.parse({ totalLimit: parseFloat(formData.get('totalLimit') as string) });

  await prisma.budget.upsert({
    where: { id: 1 }, // simplified for single user
    update: { month, totalLimitPaise: totalLimit },
    create: { id: 1, month, totalLimitPaise: totalLimit }
  });

  revalidatePath('/budgets');
}
export async function saveCategoryBudgetAction(formData: FormData) {
  const month = formData.get('month') as string;
  const categoryId = parseInt(formData.get('categoryId') as string);
  const limit = parseFloat(formData.get('limit') as string);
  z.object({ categoryId: z.number().int().positive(), limit: z.number().positive(), month: z.string().min(6) }).parse({ categoryId, limit, month });

  const budget = await prisma.budget.findFirst();
  if (!budget) {
    // create a default budget if none exists
    const newBudget = await prisma.budget.create({ data: { id: 1, month, totalLimitPaise: 5000000 } });
    await prisma.budgetCategory.create({ data: { budgetId: newBudget.id, categoryId, limitPaise: Math.round(limit * 100) } });
  } else {
    await prisma.budgetCategory.upsert({
      where: { budgetId_categoryId: { budgetId: budget.id, categoryId } },
      update: { limitPaise: Math.round(limit * 100) },
      create: { budgetId: budget.id, categoryId, limitPaise: Math.round(limit * 100) }
    });
  }
  revalidatePath('/budgets');
}
