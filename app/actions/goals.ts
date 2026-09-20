'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function createGoalAction(formData: FormData) {
  const name = formData.get('name') as string;
  const target = parseFloat(formData.get('target') as string);
  const dateStr = formData.get('targetDate') as string;
  z.object({ name: z.string().min(1), target: z.number().positive() }).parse({ name, target });
  await prisma.goal.create({ data: { name, targetPaise: Math.round(target * 100), targetDate: dateStr ? new Date(dateStr) : null } });
  revalidatePath('/goals');
}

export async function contributeGoalAction(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  const amount = parseFloat(formData.get('amount') as string);
  z.object({ id: z.number().int().positive(), amount: z.number().positive() }).parse({ id, amount });
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) return;
  const newAmount = goal.currentPaise + Math.round(amount * 100);
  await prisma.goal.update({ where: { id }, data: { currentPaise: newAmount, isAchieved: newAmount >= goal.targetPaise } });
  revalidatePath('/goals');
}

export async function deleteGoalAction(id: number) {
  z.number().int().positive().parse(id);
  await prisma.goal.delete({ where: { id } });
  revalidatePath('/goals');
}
