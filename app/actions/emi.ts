
'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function addEmiAction(formData: FormData) {
  const desc = formData.get('description') as string;
  const merchant = formData.get('merchantName') as string;
  const original = parseFloat(formData.get('originalAmount') as string) * 100;
  const downpayment = parseFloat(formData.get('downPayment') as string || '0') * 100;
  const months = parseInt(formData.get('months') as string);
  const rate = parseFloat(formData.get('rate') as string || '0');

  const financed = original - downpayment;
  // Simple flat rate calculation for demo
  const totalInterest = (financed * rate * (months / 12)) / 100;
  const emiAmount = Math.round((financed + totalInterest) / months);

  await prisma.emiPlan.create({
    data: {
      description: desc,
      merchantName: merchant,
      originalAmountPaise: original,
      downPaymentPaise: downpayment,
      financedAmountPaise: financed,
      tenureMonths: months,
      interestRatePct: rate,
      rateType: 'FLAT',
      startDate: new Date(),
      emiAmountPaise: emiAmount,
    }
  });

  revalidatePath('/emi');
}
