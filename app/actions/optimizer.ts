'use server';

export async function optimizePaymentAction(merchant: string, amountPaise: number) {
  // Simple heuristic based on HDFC MoneyBack+ logic vs generic card
  const m = merchant.toLowerCase();
  
  let suggestion = 'Any Credit Card';
  let reason = 'Standard 1x reward rate applies.';

  if (m.includes('swiggy') || m.includes('zomato') || m.includes('reliance smart') || m.includes('bigbasket') || m.includes('blinkit') || m.includes('amazon') || m.includes('flipkart')) {
    suggestion = 'HDFC MoneyBack+ Credit Card';
    reason = 'This is a 10X CashPoints partner! You will earn 20 points per Rs.200 spent.';
  } else if (m.includes('fuel') || m.includes('petrol') || m.includes('hpcl') || m.includes('bpcl') || m.includes('ioc')) {
    suggestion = 'UPI / Cash';
    reason = 'Fuel purchases are excluded from CashPoints on most cards. Pay via UPI to avoid surcharges.';
  } else if (m.includes('rent') || m.includes('wallet')) {
    suggestion = 'UPI / Bank Transfer';
    reason = 'Rent and wallet loads often incur 1-2% extra charges on credit cards and yield zero rewards.';
  } else if (amountPaise > 100000) { // > Rs. 1000
    suggestion = 'HDFC MoneyBack+ Credit Card';
    reason = 'Use a credit card for larger purchases to maximize base reward points (2 points / Rs.200).';
  } else {
    suggestion = 'UPI';
    reason = 'For smaller transactions, UPI is fast and avoids micro-charges on your credit limit.';
  }

  return { suggestion, reason };
}