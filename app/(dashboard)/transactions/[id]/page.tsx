import { prisma } from '@/lib/prisma';
import { formatPaise } from '@/lib/money';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { 
  ArrowLeft, MapPin, Tag, CreditCard, Star, CalendarDays, ReceiptText,
  ShoppingCart, Coffee, Car, Home, Zap, HeartPulse, Plane, Monitor, GraduationCap, Smile, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteTransactionButton } from '@/components/transactions/DeleteTransactionButton';

function getCategoryIcon(categoryName: string | undefined) {
  if (!categoryName) return <HelpCircle size={28} />;
  const name = categoryName.toLowerCase();
  if (name.includes('grocer') || name.includes('shop') || name.includes('mart')) return <ShoppingCart size={28} />;
  if (name.includes('food') || name.includes('dine') || name.includes('restaurant') || name.includes('cafe')) return <Coffee size={28} />;
  if (name.includes('transport') || name.includes('travel') || name.includes('fuel') || name.includes('auto')) return <Car size={28} />;
  if (name.includes('home') || name.includes('rent')) return <Home size={28} />;
  if (name.includes('utilit') || name.includes('bill') || name.includes('electric')) return <Zap size={28} />;
  if (name.includes('health') || name.includes('medical') || name.includes('pharm')) return <HeartPulse size={28} />;
  if (name.includes('travel') || name.includes('flight') || name.includes('hotel')) return <Plane size={28} />;
  if (name.includes('tech') || name.includes('software') || name.includes('subscript')) return <Monitor size={28} />;
  if (name.includes('edu') || name.includes('school')) return <GraduationCap size={28} />;
  if (name.includes('entertain') || name.includes('fun') || name.includes('movie')) return <Smile size={28} />;
  return <ShoppingCart size={28} />;
}

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({
    where: { id: parseInt(id) },
    include: {
      merchant: true,
      category: true,
      paymentMethod: true,
    },
  });

  if (!transaction) {
    notFound();
  }

  const isPositive = transaction.type === 'INCOME' || transaction.type === 'REFUND';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/transactions" 
          className="w-10 h-10 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Transaction Details</h1>
        </div>
      </div>

      <div className="bg-[#121214] border border-[#27272A] rounded-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center text-center pb-8 border-b border-[#27272A]">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4"
              style={{ background: transaction.category?.color ? `${transaction.category.color}40` : '#27272A' }}
            >
              {getCategoryIcon(transaction.category?.name)}
            </div>
            <h2 className="text-xl font-medium text-white">
              {transaction.merchant?.displayName ?? transaction.merchantRaw ?? 'Unknown Merchant'}
            </h2>
            <div className="mt-2 text-3xl font-semibold" style={{ color: isPositive ? '#00D68F' : '#FAFAFA' }}>
              {isPositive ? '+' : ''}{formatPaise(transaction.amountPaise)}
            </div>
            <p className="text-sm text-[#A1A1AA] mt-2">
              {formatDate(transaction.date, 'long')}
            </p>
          </div>

          <div className="py-6 space-y-6">
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <div className="flex items-center gap-2 text-[#A1A1AA] mb-1">
                  <Tag size={16} />
                  <span className="text-xs font-medium uppercase tracking-wider">Category</span>
                </div>
                <p className="text-white text-sm">{transaction.category?.name ?? 'Uncategorized'}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[#A1A1AA] mb-1">
                  <CreditCard size={16} />
                  <span className="text-xs font-medium uppercase tracking-wider">Payment</span>
                </div>
                <p className="text-white text-sm">{transaction.paymentMethod?.name ?? 'Unknown'}</p>
              </div>
            </div>
          </div>

          {transaction.cashpointsEarned > 0 && (
            <div className="pt-6 border-t border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700]">
                  <Star size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Rewards Earned</p>
                  <p className="text-xs text-[#A1A1AA]">Added to your MoneyBack+ balance</p>
                </div>
              </div>
              <Badge variant="gold" className="text-sm px-3 py-1">+{transaction.cashpointsEarned} pts</Badge>
            </div>
          )}

          <div className="pt-6 mt-6 border-t border-[#27272A] flex justify-center">
            <DeleteTransactionButton transactionId={transaction.id} />
          </div>
        </div>
      </div>
    </div>
  );
}