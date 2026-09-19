'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function payCreditCardBillAction(cardId: number) {
  try {
    await prisma.paymentMethod.update({
      where: { id: cardId },
      data: { outstandingPaise: 0 }
    });
    revalidatePath('/accounts');
    revalidatePath('/');
    
  } catch (error: any) {
    console.error(error.message);
  }
}
