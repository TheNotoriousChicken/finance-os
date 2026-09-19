'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function payCreditCardBillAction(cardId: number) {
  try {
    const card = await prisma.paymentMethod.findUnique({ where: { id: cardId } });
    if (!card) throw new Error("Card not found");
    
    const amountToPay = card.outstandingPaise;
    if (amountToPay <= 0) return;

    // Find the primary UPI/Bank account
    const bankAccount = await prisma.paymentMethod.findFirst({
      where: { type: 'UPI' }
    });

    if (bankAccount) {
      await prisma.paymentMethod.update({
        where: { id: bankAccount.id },
        data: { balancePaise: { decrement: amountToPay } }
      });
    }

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

export async function updateBankBalanceAction(accountId: number, newBalancePaise: number) {
  try {
    await prisma.paymentMethod.update({
      where: { id: accountId },
      data: { balancePaise: newBalancePaise }
    });
    revalidatePath('/accounts');
    revalidatePath('/');
  } catch (error: any) {
    console.error(error.message);
  }
}
