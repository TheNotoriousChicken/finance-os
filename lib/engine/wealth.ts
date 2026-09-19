import { prisma } from '@/lib/prisma';

export interface NetWorthSummary {
  totalAssetsPaise: number;
  totalLiabilitiesPaise: number;
  netWorthPaise: number;
  totalInvestedPaise: number;
  unrealizedPnLPaise: number;
  pnlPercentage: number;
}

export async function getNetWorthSummary(): Promise<NetWorthSummary> {
  // 1. Fetch Assets
  const assets = await prisma.asset.findMany();
  
  let totalAssetsPaise = 0;
  let totalInvestedPaise = 0;

  for (const asset of assets) {
    const value = asset.currentPricePaise * asset.quantity;
    const invested = (asset.averageBuyPricePaise ?? 0) * asset.quantity;
    
    totalAssetsPaise += value;
    totalInvestedPaise += invested;
  }

  // 2. Fetch Liabilities (Credit Cards + EMIs)
  const creditCards = await prisma.paymentMethod.findMany({
    where: { type: 'CREDIT_CARD', isActive: true }
  });
  
  let totalLiabilitiesPaise = 0;
  for (const cc of creditCards) {
    totalLiabilitiesPaise += cc.outstandingPaise;
  }

  const emiPlans = await prisma.emiPlan.findMany({
    where: { status: 'ACTIVE' },
    include: { installments: true }
  });

  for (const plan of emiPlans) {
    const pendingInstallments = plan.installments.filter(i => i.status === 'PENDING');
    for (const inst of pendingInstallments) {
      totalLiabilitiesPaise += inst.principalPaise;
    }
  }

  // 3. Calculate metrics
  const netWorthPaise = totalAssetsPaise - totalLiabilitiesPaise;
  const unrealizedPnLPaise = totalAssetsPaise - totalInvestedPaise;
  const pnlPercentage = totalInvestedPaise > 0 ? (unrealizedPnLPaise / totalInvestedPaise) * 100 : 0;

  return {
    totalAssetsPaise: Math.round(totalAssetsPaise),
    totalLiabilitiesPaise: Math.round(totalLiabilitiesPaise),
    netWorthPaise: Math.round(netWorthPaise),
    totalInvestedPaise: Math.round(totalInvestedPaise),
    unrealizedPnLPaise: Math.round(unrealizedPnLPaise),
    pnlPercentage
  };
}
