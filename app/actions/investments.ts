'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import yahooFinance from 'yahoo-finance2';

export async function addAssetAction(data: {
  type: string;
  name: string;
  ticker?: string;
  quantity: number;
  averageBuyPricePaise: number;
}) {
  let currentPricePaise = data.averageBuyPricePaise;

  // Try to fetch initial price if ticker is provided
  if (data.ticker && data.ticker.trim() !== '') {
    try {
      // suppress logging from yahoo finance
      // yahooFinance.suppressNotices(['yahooSurvey']);
      const quote: any = await yahooFinance.quote(data.ticker);
      if (quote && quote.regularMarketPrice) {
        currentPricePaise = Math.round(quote.regularMarketPrice * 100);
      }
    } catch (e) {
      console.error(`Failed to fetch initial quote for ${data.ticker}:`, e);
      // fallback to buy price
    }
  }

  const asset = await prisma.asset.create({
    data: {
      type: data.type,
      name: data.name,
      ticker: data.ticker || null,
      quantity: data.quantity,
      averageBuyPricePaise: data.averageBuyPricePaise,
      currentPricePaise: currentPricePaise,
    }
  });

  // initial history point
  await prisma.assetPriceHistory.create({
    data: {
      assetId: asset.id,
      pricePaise: currentPricePaise
    }
  });

  revalidatePath('/wealth');
  return { success: true, assetId: asset.id };
}

export async function refreshPricesAction() {
  const assets = await prisma.asset.findMany({
    where: {
      ticker: { not: null }
    }
  });

  // yahooFinance.suppressNotices(['yahooSurvey']);

  let updatedCount = 0;

  for (const asset of assets) {
    if (!asset.ticker) continue;
    
    try {
      const quote: any = await yahooFinance.quote(asset.ticker);
      if (quote && quote.regularMarketPrice) {
        const newPricePaise = Math.round(quote.regularMarketPrice * 100);
        
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            currentPricePaise: newPricePaise,
            lastUpdated: new Date()
          }
        });

        await prisma.assetPriceHistory.create({
          data: {
            assetId: asset.id,
            pricePaise: newPricePaise
          }
        });

        updatedCount++;
      }
    } catch (e) {
      console.error(`Failed to update quote for ${asset.ticker}:`, e);
    }
  }

  revalidatePath('/wealth');
  return { success: true, updatedCount };
}
