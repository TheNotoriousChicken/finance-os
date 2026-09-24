'use server';
import { prisma } from '@/lib/prisma';
import { calculateCashPoints, estimateRewardValue as getMBValue } from '@/lib/engine/rewards';
import { calculateNeuCoins } from '@/lib/engine/neuplus';
import { calculateCombinedUtilization } from '@/lib/engine/utilization';

export async function optimizePaymentAction(merchant: string, amountPaise: number, category: string = 'Shopping') {
  const m = merchant.toLowerCase();
  const c = category.toLowerCase();
  
  // Exclusions logic
  const isFuel = m.includes('fuel') || m.includes('petrol') || c.includes('fuel');
  const isRent = m.includes('rent') || c.includes('rent');
  const isGovt = m.includes('tax') || m.includes('govt') || c.includes('gov');
  const isWallet = m.includes('wallet') || c.includes('wallet');
  const isExcluded = isFuel || isRent || isGovt || isWallet;

  // Partner checks
  const is10x = m.includes('amazon') || m.includes('flipkart') || m.includes('swiggy') || m.includes('reliance smart') || m.includes('bigbasket');
  const isTata = m.includes('tata') || m.includes('croma') || m.includes('bigbasket') || m.includes('1mg') || m.includes('air india') || m.includes('taj');
  const isTataNeuApp = isTata && m.includes('neu');

  const paymentMethods = await prisma.paymentMethod.findMany({ where: { isActive: true } });
  
  const mbCard = paymentMethods.find(p => p.name.includes('MoneyBack+'));
  const neuCard = paymentMethods.find(p => p.name.includes('Neu Plus'));
  const fdCard = paymentMethods.find(p => p.name.includes('FD'));
  const upiAcc = paymentMethods.find(p => p.type === 'UPI');

  let bestSuggestion = 'UPI / Cash';
  let bestReason = 'Zero fees. No rewards for this category.';
  let maxNetValue = 0;

  const options = [];

  // Evaluate MoneyBack+
  if (mbCard) {
    const res = calculateCashPoints({
      amountPaise,
      paymentMethodId: mbCard.id,
      moneybackCardId: mbCard.id,
      merchantNormalizedName: m,
      categoryName: category,
      is10xPartner: is10x,
      isGroceryMerchant: m.includes('reliance smart') || m.includes('bigbasket'),
      alreadyEarnedOverall: 0,
      alreadyEarnedGrocery: 0
    });
    const valPaise = res.cashpointsEarned * 25; // 0.25 INR per pt
    const netPaise = valPaise - (isRent ? amountPaise * 0.01 : 0);
    options.push({ name: 'MoneyBack+', val: netPaise, desc: `Earns ${res.cashpointsEarned} CashPoints.` });
  }

  // Evaluate Neu Plus (Swipe)
  if (neuCard) {
    const res = calculateNeuCoins({
      amountPaise,
      paymentMethodId: neuCard.id,
      neuPlusCardId: neuCard.id,
      merchantNormalizedName: m,
      categoryName: category,
      paymentChannel: 'SWIPE',
      isTataBrand: isTata,
      isTataNeuApp: isTataNeuApp,
      isEmi: false,
      alreadyEarnedUpi: 0
    });
    const valPaise = (res.neuCoinsEarned + res.neuPassAcceleratedEarned) * 100; // 1 INR per coin
    const netPaise = valPaise - (isRent ? amountPaise * 0.01 : 0);
    options.push({ name: 'Neu Plus (Swipe/Online)', val: netPaise, desc: `Earns ${res.neuCoinsEarned + res.neuPassAcceleratedEarned} NeuCoins.` });
  }

  // Evaluate Neu Plus (UPI)
  if (neuCard) {
    const res = calculateNeuCoins({
      amountPaise,
      paymentMethodId: neuCard.id,
      neuPlusCardId: neuCard.id,
      merchantNormalizedName: m,
      categoryName: category,
      paymentChannel: 'UPI',
      isTataBrand: isTata,
      isTataNeuApp: isTataNeuApp,
      isEmi: false,
      alreadyEarnedUpi: 0
    });
    const valPaise = (res.neuCoinsEarned + res.neuPassAcceleratedEarned) * 100;
    options.push({ name: 'Neu Plus (UPI)', val: valPaise, desc: `Earns ${res.neuCoinsEarned + res.neuPassAcceleratedEarned} NeuCoins.` });
  }

  options.sort((a, b) => b.val - a.val);

  if (options.length > 0 && options[0].val > 0) {
    bestSuggestion = options[0].name;
    bestReason = options[0].desc + ` This gives the highest net value.`;
  }

  return { suggestion: bestSuggestion, reason: bestReason, detailedOptions: options };
}
