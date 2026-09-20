import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    include: { merchant: true, category: true, paymentMethod: true },
    orderBy: { date: 'desc' },
    take: 10000
  });

  const header = 'Date,Merchant,Type,Category,Payment Method,Amount (₹),Cashpoints\n';
  const rows = transactions.map(tx => [
    new Date(tx.date).toLocaleDateString('en-IN'),
    `"${(tx.merchant?.displayName ?? tx.merchantRaw ?? 'Unknown').replace(/"/g, '""')}"`,
    tx.type,
    `"${tx.category?.name ?? 'Uncategorized'}"`,
    `"${tx.paymentMethod?.name ?? 'Unknown'}"`,
    (tx.amountPaise / 100).toFixed(2),
    tx.cashpointsEarned
  ].join(','));

  const csv = header + rows.join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="finance-os-export-${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}
