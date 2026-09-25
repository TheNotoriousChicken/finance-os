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

  const context = `You are a concise, accurate financial assistant embedded in a personal finance app for an Indian user.

## USER'S FINANCIAL DATA (current as of now, do NOT fabricate any numbers outside this)

### Credit Cards
- HDFC Shared Limit Pool (MoneyBack+ + Tata Neu Plus RuPay combined):
  Total Credit Limit: ₹${(hdfcLimit / 100).toLocaleString('en-IN')}
  Total Outstanding: ₹${(hdfcTotalOutstanding / 100).toLocaleString('en-IN')}
  Available Credit: ₹${(hdfcAvail / 100).toLocaleString('en-IN')}
  Note: MoneyBack+ and Tata Neu Plus SHARE this limit — using one reduces availability for the other.
- HDFC FD-Backed Card (separate limit): Limit ₹${(fdLimit / 100).toLocaleString('en-IN')}, Outstanding ₹${(fdOut / 100).toLocaleString('en-IN')}

### Rewards This Month (${cardMonth})
- HDFC MoneyBack+ CashPoints earned: ${mbPts} / 2500 overall cap (grocery sub-cap: 1000/mo)
- Tata Neu Plus NeuCoins earned: ${neuPts} total (UPI portion: ${upiNeuPts} / 500 UPI cap)
- CashPoint value: 1 pt ≈ ₹0.25. NeuCoin value: 1 coin = ₹1 on Tata Neu.

### Recent Transactions (last 10)
${txs.map(t => `  • ${t.date.toISOString().split('T')[0]}: ₹${(t.amountPaise / 100).toLocaleString('en-IN')} at ${t.merchant?.displayName ?? 'Unknown'} via ${t.paymentMethod?.name ?? 'Unknown'}`).join('\n')}

## CARD REWARD RULES (for answering reward-related questions)
MoneyBack+: 10 pts/₹200 at Amazon/Flipkart/Swiggy/Reliance Smart/BigBasket/Blinkit. 2 pts/₹200 everywhere else. Zero on Fuel/Rent/Govt/Wallets/EMI.
Tata Neu Plus: 2% NeuCoins on Tata brands (Croma, 1mg, Air India, Taj, Tata Cliq, Titan, Tanishq, BigBasket, Westside, Zudio, Starbucks). 1% on other eligible spend. 1% on UPI (capped 500/mo). Zero on Fuel/Rent/Govt/Wallets/EMI.

## RESPONSE RULES
- Answer only with data from the context above. Do NOT invent balances, percentages, or transactions.
- If something is not in the context, say "I don't have that data right now."
- Be concise. Use ₹ symbol. Use bullet points for comparisons.
- If asked about utilization, note that MoneyBack+ and Neu Plus share their limit pool.`;

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

  // Build a human-readable AI analysis summary
  const best = options[0];
  const savedPaise = best.valPaise - best.fees - best.emiCost;
  const merchant_display = parsed.merchant || 'this merchant';
  let analysisLines: string[] = [];
  
  if (best.type === 'CASH') {
    analysisLines.push(`No reward benefit here — Bank UPI is the cleanest option with zero fees and instant settlement.`);
  } else {
    analysisLines.push(`Best choice: ${best.name} saves you ${savedPaise > 0 ? '₹' + (savedPaise / 100).toLocaleString('en-IN') : 'the most'} vs plain UPI.`);
    if (is10x) analysisLines.push(`MoneyBack+ earns 10X CashPoints at ${merchant_display} — one of its highest-yield partners.`);
    if (isTata && !is10x) analysisLines.push(`Tata Neu Plus earns 2% NeuCoins here as a Tata brand (worth ₹1 each on Tata Neu app).`);
    if (isEmi) analysisLines.push(`EMI option costs extra in interest (${15.99}% p.a.) + processing fee — only worth it if cash flow is tight.`);
    if (splitUpiPaise > 0) analysisLines.push(`UPI split of ₹${(splitUpiPaise / 100).toLocaleString('en-IN')} reduces card utilization.`);
  }
  
  if (isFuel) analysisLines.push(`All cards earn zero rewards on fuel purchases.`);
  if (isRent) analysisLines.push(`Rent payments incur a ~1.18% processing fee on credit cards — factor this into your net cost.`);
  
  const hdfcAvailPaise = Math.max(0, hdfcLimit - hdfcTotalOutstanding);
  if (cardAmountPaise > hdfcAvailPaise && hdfcAvailPaise > 0) {
    analysisLines.push(`⚠️ Heads up: your HDFC available credit (₹${(hdfcAvailPaise / 100).toLocaleString('en-IN')}) may be insufficient for this purchase.`);
  }

  const geminiAnalysis = analysisLines.join(' ');

  return {
    type: 'optimizer',
    parsed: { ...parsed, amountPaise, cardAmountPaise, splitUpiPaise, m, category },
    options,
    bestOption: options[0],
    confidence,
    geminiAnalysis,
    needsVerification: (m === 'unknown merchant' || confidence === 'Low' || (!isTata && !is10x && !isFuel && !isRent))
  };
  } catch (err: any) {
    return { type: 'error', error: err.stack || err.message || String(err) };
  }
}
