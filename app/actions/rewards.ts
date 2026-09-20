'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function redeemPointsAction(formData: FormData) {
  const cashpoints = parseInt(formData.get('cashpoints') as string);
  const channel = formData.get('channel') as string;
  const notes = formData.get('notes') as string;
  z.object({ cashpoints: z.number().int().positive(), channel: z.string().min(1) }).parse({ cashpoints, channel });
  // 1 cashpoint = ₹0.25 (HDFC standard)
  const valuePaise = cashpoints * 25;
  const pm = await prisma.paymentMethod.findFirst({ where: { type: 'CREDIT_CARD', isRewardEligible: true } });
  if (!pm) return;
  await prisma.rewardRedemption.create({
    data: { paymentMethodId: pm.id, cashpointsUsed: cashpoints, valuePaise, channel, redeemedAt: new Date(), notes: notes || null }
  });
  revalidatePath('/rewards');
}
