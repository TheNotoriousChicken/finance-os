'use server';

import { prisma } from '@/lib/prisma';
import { toPaise } from '@/lib/money';
import { revalidatePath } from 'next/cache';
import { encrypt } from '@/lib/crypto';
import { calculateCashPoints } from '@/lib/engine/rewards';

export async function addTransactionAction(formData: FormData) {
  const amountStr = formData.get('amount') as string;
  const merchantStr = formData.get('merchant') as string;
  const type = formData.get('type') as string;
  const paymentMethodId = formData.get('paymentMethodId') as string;
  const categoryId = formData.get('categoryId') as string;
  const notes = formData.get('notes') as string;
  const dateStr = formData.get('date') as string;

  if (!amountStr || !merchantStr || !type || !paymentMethodId || !categoryId) {
    return { error: 'Missing required fields' };
  }

  const amountPaise = toPaise(amountStr);
  let encryptedNotes = null;
  if (notes) {
    encryptedNotes = encrypt(notes);
  }

  const pmId = parseInt(paymentMethodId);
  const catId = parseInt(categoryId);

  // 1. Resolve or create merchant
  const normalized = merchantStr.trim().toUpperCase();
  let merchant = await prisma.merchant.findUnique({ where: { normalizedName: normalized } });
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: { normalizedName: normalized, displayName: merchantStr.trim() }
    });
  }

  // 2. Create transaction
  const tx = await prisma.transaction.create({
    data: {
      amountPaise,
      type: type as any,
      date: dateStr ? new Date(dateStr) : new Date(),
      merchantRaw: merchantStr.trim(),
      merchantId: merchant.id,
      paymentMethodId: pmId,
      categoryId: catId,
      notes: encryptedNotes,
      cashpointsEarned: 0,
    }
  });

  // 3. Calculate rewards if it's an expense on a reward card
  if (type === 'EXPENSE') {
    const pm = await prisma.paymentMethod.findUnique({ where: { id: pmId } });
    if (pm?.isRewardEligible && pm.rewardRuleSetId) {
      // Need full transaction with category and merchant for reward engine
      const fullTx = await prisma.transaction.findUnique({
        where: { id: tx.id },
        include: { category: true, merchant: true }
      });
      
      if (tx.type === 'EXPENSE') {
        const now = new Date();
        const cardMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const existingRewards = await prisma.reward.findMany({
          where: { paymentMethodId: pm.id, cardMonth, isReversed: false },
          include: { transaction: { include: { category: true } } }
        });
        
        const alreadyEarnedOverall = existingRewards.reduce((sum, r) => sum + r.cashpointsEarned, 0);
        const alreadyEarnedGrocery = existingRewards
          .filter(r => r.transaction.category?.name.toLowerCase().includes('grocer'))
          .reduce((sum, r) => sum + r.cashpointsEarned, 0);

        const mName = fullTx?.merchant?.displayName?.toLowerCase() || '';

        const result = calculateCashPoints({
          amountPaise: tx.amountPaise,
          paymentMethodId: pm.id,
          moneybackCardId: pm.id, 
          merchantNormalizedName: mName,
          categoryName: fullTx?.category?.name || '',
          is10xPartner: fullTx?.merchant?.is10xPartner || false,
          isGroceryMerchant: mName.includes('reliance smart') || mName.includes('bigbasket') || mName.includes('blinkit'),
          alreadyEarnedOverall,
          alreadyEarnedGrocery
        });

        if (result.cashpointsEarned > 0) {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { cashpointsEarned: result.cashpointsEarned }
          });
          
          await prisma.reward.create({
            data: {
              transactionId: tx.id,
              paymentMethodId: pm.id,
              cashpointsEarned: result.cashpointsEarned,
              ruleId: result.ruleId,
              cardMonth
            }
          });
        }
      }
    }
  }

  // 4. Update balances properly based on account type
  const account = await prisma.paymentMethod.findUnique({ where: { id: pmId } });
  if (account) {
    if (account.type === 'CREDIT_CARD') {
      if (type === 'EXPENSE') {
        await prisma.paymentMethod.update({
          where: { id: pmId },
          data: { outstandingPaise: { increment: amountPaise } }
        });
      } else if (type === 'REFUND' || type === 'INCOME') {
        await prisma.paymentMethod.update({
          where: { id: pmId },
          data: { outstandingPaise: { decrement: amountPaise } }
        });
      }
    } else {
      // Asset accounts like UPI, CASH, DEBIT_CARD
      if (type === 'EXPENSE') {
        await prisma.paymentMethod.update({
          where: { id: pmId },
          data: { balancePaise: { decrement: amountPaise } }
        });
      } else if (type === 'REFUND' || type === 'INCOME') {
        await prisma.paymentMethod.update({
          where: { id: pmId },
          data: { balancePaise: { increment: amountPaise } }
        });
      }
    }
  }

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/rewards');
  revalidatePath('/budgets');

  return { success: true };
}

export async function deleteTransactionAction(txId: number) {
  const tx = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!tx) throw new Error("Transaction not found");

  const account = await prisma.paymentMethod.findUnique({ where: { id: tx.paymentMethodId } });

  if (account) {
    if (account.type === 'CREDIT_CARD') {
      if (tx.type === 'EXPENSE') {
        await prisma.paymentMethod.update({
          where: { id: account.id },
          data: { outstandingPaise: { decrement: tx.amountPaise } }
        });
      } else if (tx.type === 'REFUND' || tx.type === 'INCOME') {
        await prisma.paymentMethod.update({
          where: { id: account.id },
          data: { outstandingPaise: { increment: tx.amountPaise } }
        });
      }
    } else {
      if (tx.type === 'EXPENSE') {
        await prisma.paymentMethod.update({
          where: { id: account.id },
          data: { balancePaise: { increment: tx.amountPaise } }
        });
      } else if (tx.type === 'REFUND' || tx.type === 'INCOME') {
        await prisma.paymentMethod.update({
          where: { id: account.id },
          data: { balancePaise: { decrement: tx.amountPaise } }
        });
      }
    }
  }

  // Also remove associated rewards if any
  if (tx.cashpointsEarned > 0) {
    await prisma.reward.deleteMany({ where: { transactionId: tx.id } });
  }

  await prisma.transaction.delete({ where: { id: tx.id } });

  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/rewards');
  revalidatePath('/budgets');
  
  return { success: true };
}
