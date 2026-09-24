'use server';
import { prisma } from '@/lib/prisma';
import { calculateCashPoints } from '@/lib/engine/rewards';
import { calculateNeuCoins } from '@/lib/engine/neuplus';
import { calculateCombinedUtilization } from '@/lib/engine/utilization';
import { parseOptimizerOrQuestion, askFinanceAssistant } from '@/lib/ai';
import { calcEmi } from '@/lib/engine/emi';
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

  const options: any[] = [];

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





export async function askAssistantAction(query: string) {
  // 1. Gather DB context
  const paymentMethods = await prisma.paymentMethod.findMany({ where: { isActive: true } });
  const txs = await prisma.transaction.findMany({
    take: 10,
    orderBy: { date: 'desc' },
    include: { merchant: true, paymentMethod: true }
  });
  
  const now = new Date();
  const cardMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rewards = await prisma.reward.findMany({
    where: { cardMonth, isReversed: false },
    include: { paymentMethod: true, transaction: true }
  });

  const mbPts = rewards.filter(r => r.paymentMethod.rewardCurrency === 'CASHPOINTS').reduce((s, r) => s + r.cashpointsEarned, 0);
  const neuPts = rewards.filter(r => r.paymentMethod.rewardCurrency === 'NEUCOINS').reduce((s, r) => s + r.neuCoinsEarned, 0);
  const upiNeuPts = rewards.filter(r => r.paymentMethod.rewardCurrency === 'NEUCOINS' && r.transaction?.paymentChannel === 'UPI').reduce((s, r) => s + r.neuCoinsEarned, 0);

  // Group limits
  let hdfcTotalOutstanding = 0;
  let hdfcLimit = 0;
  let fdLimit = 0;
  let fdOut = 0;
  
  paymentMethods.forEach(pm => {
    if (pm.sharedLimitGroupId === 'HDFC_PRIMARY') {
      hdfcTotalOutstanding += pm.outstandingPaise;
      hdfcLimit = pm.limitPaise ?? 0;
    } else if (pm.name.includes('FD')) {
      fdLimit = pm.limitPaise ?? 0;
      fdOut = pm.outstandingPaise;
    }
  });

  const hdfcAvail = Math.max(0, hdfcLimit - hdfcTotalOutstanding);

  const context = `You are a financial assistant for this app. Use this deterministic data to answer the user's question accurately.
User's Cards:
- HDFC Shared Limit Pool (MoneyBack+ & Tata Neu Plus): Limit Rs.${hdfcLimit/100}, Outstanding Rs.${hdfcTotalOutstanding/100}, Available Rs.${hdfcAvail/100}.
- HDFC FD Card: Limit Rs.${fdLimit/100}, Outstanding Rs.${fdOut/100}.
Rewards this month (${cardMonth}):
- MoneyBack+ CashPoints: ${mbPts} (Cap: 2500 overall, 1000 grocery)
- Tata NeuCoins: ${neuPts} (UPI earned: ${upiNeuPts} / 500 cap)
Recent transactions: ${txs.map(t => `${t.date.toISOString().split('T')[0]} - Rs.${t.amountPaise/100} at ${t.merchant?.displayName} via ${t.paymentMethod?.name}`).join('; ')}

Do not invent numbers. If you don't know, say so. Keep answers concise.`;

  const answer = await askFinanceAssistant(query, context);
  return answer;
}

export async function smartOptimizeAction(query: string) {
  try {

  const parsed = await parseOptimizerOrQuestion(query);
  
  if (parsed.intentType === 'GENERAL_QUESTION') {
    const answer = await askAssistantAction(query);
    return { type: 'chat', answer };
  }

  // It's a TRANSACTION_OPTIMIZER
  const amountPaise = parsed.amountPaise ?? 0;
  if (amountPaise === 0) return { type: 'error', error: 'Could not determine the amount.' };
  
  const m = (parsed.merchant || 'Unknown Merchant').toLowerCase();
  const category = parsed.category || 'Shopping';
  const isEmi = parsed.isEmi || false;
  const splitUpiPaise = parsed.splitUpiAmountPaise || 0;
  const cardAmountPaise = Math.max(0, amountPaise - splitUpiPaise);

  const paymentMethods = await prisma.paymentMethod.findMany({ where: { isActive: true } });
  
  const mbCard = paymentMethods.find(p => p.name.includes('MoneyBack+'));
  const neuCard = paymentMethods.find(p => p.name.includes('Neu Plus'));
  const fdCard = paymentMethods.find(p => p.name.includes('FD'));
  
  // Utilization Context
  let hdfcTotalOutstanding = 0;
  let hdfcLimit = 0;
  paymentMethods.forEach(pm => {
    if (pm.sharedLimitGroupId === 'HDFC_PRIMARY') {
      hdfcTotalOutstanding += pm.outstandingPaise;
      hdfcLimit = pm.limitPaise ?? 0;
    }
  });
  
  const isFuel = m.includes('fuel') || m.includes('petrol') || category.toLowerCase().includes('fuel');
  const isRent = m.includes('rent') || category.toLowerCase().includes('rent');
  const isGovt = m.includes('tax') || m.includes('govt') || category.toLowerCase().includes('gov');
  const isWallet = m.includes('wallet') || category.toLowerCase().includes('wallet');
  
  const is10x = m.includes('amazon') || m.includes('flipkart') || m.includes('swiggy') || m.includes('reliance smart') || m.includes('bigbasket') || m.includes('blinkit');
  const isGrocery = m.includes('reliance smart') || m.includes('bigbasket') || m.includes('blinkit');
  const isTata = m.includes('tata') || m.includes('croma') || m.includes('bigbasket') || m.includes('1mg') || m.includes('air india') || m.includes('taj');

  const options: any[] = [];

  // Helper to add option
  const addOption = (name: string, pType: string, baseEarned: number, valPaise: number, fees: number, emiCost: number, utilDelta: number, reason: string) => {
    const netCost = cardAmountPaise - valPaise + fees + emiCost;
    options.push({ name, type: pType, baseEarned, valPaise, fees, emiCost, netCost, utilDelta, reason });
  };

  // Evaluate MB+
  if (mbCard) {
    if (isEmi) {
      const emiRes = calcEmi({ financedAmountPaise: cardAmountPaise, tenureMonths: 6, annualInterestRatePct: 15.99, rateType: 'REDUCING', processingFeePaise: 19900 });
      addOption('MoneyBack+ (6m EMI)', 'CREDIT_CARD', 0, 0, emiRes.totalProcessingFeePaise + emiRes.totalGstPaise, emiRes.totalInterestPaise, cardAmountPaise, 'EMI incurs 15.99% interest + processing fees. Zero rewards on EMI.');
    } else {
      const { cashpointsEarned, isExcluded } = calculateCashPoints({ amountPaise: cardAmountPaise, paymentMethodId: mbCard.id, moneybackCardId: mbCard.id, merchantNormalizedName: m, categoryName: category, is10xPartner: is10x, isGroceryMerchant: isGrocery, alreadyEarnedOverall: 0, alreadyEarnedGrocery: 0 });
      const valPaise = cashpointsEarned * 25;
      const fees = isRent ? Math.round(cardAmountPaise * 0.01 * 1.18) : 0;
      addOption('HDFC MoneyBack+', 'CREDIT_CARD', cashpointsEarned, valPaise, fees, 0, cardAmountPaise, isExcluded ? 'Excluded category. Zero rewards.' : (is10x ? '10X Reward Partner! High yield.' : 'Standard base rewards.'));
    }
  }

  // Evaluate Neu Plus Swipe
  if (neuCard) {
    const { neuCoinsEarned, neuPassAcceleratedEarned, isExcluded } = calculateNeuCoins({ amountPaise: cardAmountPaise, paymentMethodId: neuCard.id, neuPlusCardId: neuCard.id, merchantNormalizedName: m, categoryName: category, paymentChannel: 'SWIPE', isTataBrand: isTata, isTataNeuApp: false, isEmi, alreadyEarnedUpi: 0 });
    const valPaise = (neuCoinsEarned + neuPassAcceleratedEarned) * 100;
    const fees = isRent ? Math.round(cardAmountPaise * 0.01 * 1.18) : 0;
    addOption('Tata Neu Plus (Swipe)', 'CREDIT_CARD', neuCoinsEarned + neuPassAcceleratedEarned, valPaise, fees, 0, cardAmountPaise, isExcluded ? 'Excluded category. Zero rewards.' : (isTata ? '2% Tata Brand yield.' : '1% non-Tata yield.'));
  }

  // Evaluate Neu Plus UPI
  if (neuCard && !isEmi) {
    const { neuCoinsEarned, neuPassAcceleratedEarned, isExcluded } = calculateNeuCoins({ amountPaise: cardAmountPaise, paymentMethodId: neuCard.id, neuPlusCardId: neuCard.id, merchantNormalizedName: m, categoryName: category, paymentChannel: 'UPI', isTataBrand: isTata, isTataNeuApp: false, isEmi: false, alreadyEarnedUpi: 0 });
    const valPaise = (neuCoinsEarned + neuPassAcceleratedEarned) * 100;
    addOption('Tata Neu Plus (UPI)', 'UPI', neuCoinsEarned + neuPassAcceleratedEarned, valPaise, 0, 0, cardAmountPaise, isExcluded ? 'UPI for excluded category.' : 'Earns NeuCoins on UPI (max 500/mo).');
  }

  // Evaluate Bank UPI
  addOption('Bank UPI / Cash', 'CASH', 0, 0, 0, 0, 0, 'Zero fees, zero rewards. Immediate settlement.');

  options.sort((a, b) => a.netCost - b.netCost);

  // Confidence
  let confidence = 'High';
  if (parsed.confidenceScore < 60) confidence = 'Low';
  else if (parsed.confidenceScore < 85) confidence = 'Medium';

  return {
    type: 'optimizer',
    parsed: { ...parsed, amountPaise, cardAmountPaise, splitUpiPaise, m, category },
    options,
    bestOption: options[0],
    confidence,
    needsVerification: (m === 'unknown merchant' || confidence === 'Low' || (!isTata && !is10x && !isFuel && !isRent))
  };
  } catch (err: any) {
    return { type: 'error', error: err.stack || err.message || String(err) };
  }
}
