'use server';
import { prisma } from '@/lib/prisma';

async function fetchWithRetry(url: string, options: any, maxRetries = 2): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status === 503) {
      const errorData = await res.json().catch(() => null);
      let waitMs = 2000 * Math.pow(2, i);
      if (res.status === 429 && errorData?.error?.message) {
        const match = errorData.error.message.match(/retry in ([0-9.]+)s/);
        if (match?.[1]) waitMs = parseFloat(match[1]) * 1000 + 500;
      }
      if (waitMs > 8000) throw new Error('Rate limit exceeded. Try again in a moment.');
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    return res;
  }
  return fetch(url, options);
}

export interface DigestSection {
  icon: string;
  title: string;
  body: string;
  accent?: 'green' | 'yellow' | 'red' | 'blue' | 'neutral';
}

export interface WeeklyDigestResult {
  generatedAt: string;
  weekLabel: string;
  sections: DigestSection[];
  rawInsight: string; // Full Gemini paragraph, displayed below sections
}

export async function weeklyDigestAction(): Promise<WeeklyDigestResult> {
  const now = new Date();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  // ── Date boundaries ──────────────────────────────────────────────────
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const cardMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── Fetch this week's transactions ───────────────────────────────────
  const thisWeekTxs = await prisma.transaction.findMany({
    where: { date: { gte: weekStart }, type: 'EXPENSE' },
    include: { merchant: true, category: true, paymentMethod: true },
    orderBy: { amountPaise: 'desc' },
  });

  const prevWeekTxs = await prisma.transaction.findMany({
    where: { date: { gte: prevWeekStart, lt: weekStart }, type: 'EXPENSE' },
    include: { category: true },
  });

  // ── This month's rewards ─────────────────────────────────────────────
  const rewards = await prisma.reward.findMany({
    where: { cardMonth, isReversed: false },
    include: { paymentMethod: true },
  });

  const mbPts = rewards
    .filter(r => r.paymentMethod.rewardCurrency === 'CASHPOINTS')
    .reduce((s, r) => s + r.cashpointsEarned, 0);
  const neuCoins = rewards
    .filter(r => r.paymentMethod.rewardCurrency === 'NEUCOINS')
    .reduce((s, r) => s + r.neuCoinsEarned, 0);

  // ── Credit utilization ───────────────────────────────────────────────
  const paymentMethods = await prisma.paymentMethod.findMany({ where: { isActive: true } });
  let hdfcOutstanding = 0, hdfcLimit = 0, fdOutstanding = 0, fdLimit = 0;
  paymentMethods.forEach(pm => {
    if (pm.sharedLimitGroupId === 'HDFC_PRIMARY') {
      hdfcOutstanding += pm.outstandingPaise;
      hdfcLimit = pm.limitPaise ?? 0;
    } else if (pm.name.includes('FD')) {
      fdOutstanding += pm.outstandingPaise;
      fdLimit = pm.limitPaise ?? 0;
    }
  });
  const hdfcUtilPct = hdfcLimit > 0 ? Math.round((hdfcOutstanding / hdfcLimit) * 100) : 0;

  // ── Category breakdown ───────────────────────────────────────────────
  const thisWeekByCategory: Record<string, number> = {};
  thisWeekTxs.forEach(t => {
    const cat = t.category?.name ?? 'Other';
    thisWeekByCategory[cat] = (thisWeekByCategory[cat] ?? 0) + t.amountPaise;
  });

  const prevWeekByCategory: Record<string, number> = {};
  prevWeekTxs.forEach(t => {
    const cat = t.category?.name ?? 'Other';
    prevWeekByCategory[cat] = (prevWeekByCategory[cat] ?? 0) + t.amountPaise;
  });

  const thisWeekTotal = thisWeekTxs.reduce((s, t) => s + t.amountPaise, 0);
  const prevWeekTotal = prevWeekTxs.reduce((s, t) => s + t.amountPaise, 0);

  // ── Top merchants this week ───────────────────────────────────────────
  const topMerchants = thisWeekTxs
    .slice(0, 5)
    .map(t => `${t.merchant?.displayName ?? t.merchantRaw ?? 'Unknown'} ₹${(t.amountPaise / 100).toLocaleString('en-IN')}`);

  // ── Month-to-date spend ───────────────────────────────────────────────
  const mtdTxs = await prisma.transaction.findMany({
    where: { date: { gte: monthStart }, type: 'EXPENSE' },
  });
  const mtdTotal = mtdTxs.reduce((s, t) => s + t.amountPaise, 0);

  // ── Category movement (for highlighting spikes) ────────────────────
  const catMovements = Object.entries(thisWeekByCategory).map(([cat, amt]) => {
    const prev = prevWeekByCategory[cat] ?? 0;
    const change = prev > 0 ? Math.round(((amt - prev) / prev) * 100) : null;
    return { cat, amt, prev, change };
  }).sort((a, b) => b.amt - a.amt);

  // ── Build structured data summary for Gemini ─────────────────────────
  const dataContext = `
## THIS WEEK (${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
Total spend: ₹${(thisWeekTotal / 100).toLocaleString('en-IN')} (prev week: ₹${(prevWeekTotal / 100).toLocaleString('en-IN')}, change: ${prevWeekTotal > 0 ? (((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100).toFixed(0) + '%' : 'N/A'})
Transaction count: ${thisWeekTxs.length}

Top spends this week:
${topMerchants.join('\n')}

Category breakdown (this week vs last week):
${catMovements.slice(0, 6).map(c => `  ${c.cat}: ₹${(c.amt / 100).toLocaleString('en-IN')}${c.change !== null ? ` (${c.change > 0 ? '+' : ''}${c.change}% vs last week)` : ' (new this week)'}`).join('\n')}

## MONTH TO DATE (${cardMonth})
Total spend: ₹${(mtdTotal / 100).toLocaleString('en-IN')}
MoneyBack+ CashPoints earned: ${mbPts} / 2500 cap (₹${(mbPts * 0.25).toFixed(0)} value at ₹0.25/pt)
Tata Neu Plus NeuCoins earned: ${neuCoins.toFixed(1)} (₹${neuCoins.toFixed(0)} value at ₹1/coin)
Combined reward value this month: ₹${((mbPts * 0.25) + neuCoins).toFixed(0)}

## CREDIT UTILIZATION
HDFC Shared Pool (MoneyBack+ + Neu Plus): ₹${(hdfcOutstanding / 100).toLocaleString('en-IN')} / ₹${(hdfcLimit / 100).toLocaleString('en-IN')} = ${hdfcUtilPct}%
FD Card: ₹${(fdOutstanding / 100).toLocaleString('en-IN')} / ₹${(fdLimit / 100).toLocaleString('en-IN')}

## REWARD RULES CONTEXT
MoneyBack+: 2500 CashPoints/mo overall cap. 1000/mo grocery sub-cap. At ${mbPts} pts used — ${2500 - mbPts} pts remaining.
Tata Neu Plus: 500 NeuCoins/mo UPI cap. 1 NeuCoin = ₹1 on Tata Neu app.
`.trim();

  const prompt = `You are a smart personal finance digest writer for an Indian user. Based on the financial data below, write a concise weekly digest.

${dataContext}

## YOUR OUTPUT RULES
Write 3–4 SHORT, punchy insight paragraphs. Each should be useful and actionable. Focus on:
1. Spending trend this week vs last week — where did money go, any spikes?
2. Reward performance — are they on track? Any caps approaching? What should they do differently?
3. Credit utilization — is it healthy or concerning? (>30% = worth mentioning, >60% = flag it)
4. One specific actionable tip for the coming week based on the data

Tone: Direct, confident, like a smart friend who knows finance — not a corporate bot. Use ₹ symbol. Keep it under 150 words total. No bullet points, just flowing prose paragraphs. No generic advice — every sentence must reference specific numbers from the data.`;

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 350 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const rawInsight: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No insights generated.';

  // ── Build structured sections from deterministic data ────────────────
  const sections: DigestSection[] = [];

  // Spending section
  const spendChange = prevWeekTotal > 0 ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100) : 0;
  sections.push({
    icon: '💸',
    title: 'This Week',
    body: `₹${(thisWeekTotal / 100).toLocaleString('en-IN')} across ${thisWeekTxs.length} transactions${prevWeekTotal > 0 ? ` — ${spendChange > 0 ? '↑' : '↓'} ${Math.abs(spendChange)}% vs last week` : ''}`,
    accent: spendChange > 25 ? 'red' : spendChange > 0 ? 'yellow' : 'green',
  });

  // Rewards section
  const mbRemaining = 2500 - mbPts;
  const mbPctUsed = Math.round((mbPts / 2500) * 100);
  sections.push({
    icon: '⭐',
    title: 'Rewards',
    body: `MoneyBack+ ${mbPts} pts (${mbPctUsed}% of cap) · Neu Plus ${neuCoins.toFixed(0)} NeuCoins · Combined ₹${((mbPts * 0.25) + neuCoins).toFixed(0)} earned this month`,
    accent: mbPctUsed > 85 ? 'yellow' : 'green',
  });

  // Utilization section
  sections.push({
    icon: '💳',
    title: 'HDFC Credit',
    body: `₹${(hdfcOutstanding / 100).toLocaleString('en-IN')} used of ₹${(hdfcLimit / 100).toLocaleString('en-IN')} shared limit — ${hdfcUtilPct}% utilized`,
    accent: hdfcUtilPct > 60 ? 'red' : hdfcUtilPct > 30 ? 'yellow' : 'green',
  });

  // Top category spike (if any)
  const spike = catMovements.find(c => c.change !== null && c.change > 40 && c.amt > 50000);
  if (spike) {
    sections.push({
      icon: '📈',
      title: `${spike.cat} spike`,
      body: `₹${(spike.amt / 100).toLocaleString('en-IN')} this week — up ${spike.change}% from last week's ₹${(spike.prev / 100).toLocaleString('en-IN')}`,
      accent: 'yellow',
    });
  }

  // Cap warning
  if (mbRemaining < 400 && mbRemaining > 0) {
    sections.push({
      icon: '⚠️',
      title: 'Cap Alert',
      body: `Only ${mbRemaining} CashPoints left before MoneyBack+ monthly cap. Switch large spends to Tata Neu Plus this week.`,
      accent: 'red',
    });
  }

  const weekLabel = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  return {
    generatedAt: now.toISOString(),
    weekLabel,
    sections,
    rawInsight,
  };
}
