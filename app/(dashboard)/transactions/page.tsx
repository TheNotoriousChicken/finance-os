export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";
import { Suspense } from "react";
import { formatDate } from "@/lib/utils";
import {
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ShoppingCart, Coffee,
  Car, Home, Zap, HeartPulse, Plane, Monitor, GraduationCap, Smile, HelpCircle, ReceiptText,
  Download
} from "lucide-react";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import { SearchBar } from "@/components/ui/SearchBar";

function getCategoryIcon(categoryName: string | undefined) {
  if (!categoryName) return <HelpCircle size={16} />;
  const name = categoryName.toLowerCase();
  if (name.includes("grocer") || name.includes("shop") || name.includes("mart")) return <ShoppingCart size={16} />;
  if (name.includes("food") || name.includes("dine") || name.includes("restaurant") || name.includes("cafe")) return <Coffee size={16} />;
  if (name.includes("transport") || name.includes("fuel") || name.includes("auto")) return <Car size={16} />;
  if (name.includes("home") || name.includes("rent")) return <Home size={16} />;
  if (name.includes("utilit") || name.includes("bill") || name.includes("electric")) return <Zap size={16} />;
  if (name.includes("health") || name.includes("medical") || name.includes("pharm")) return <HeartPulse size={16} />;
  if (name.includes("flight") || name.includes("hotel")) return <Plane size={16} />;
  if (name.includes("tech") || name.includes("software") || name.includes("subscript")) return <Monitor size={16} />;
  if (name.includes("edu") || name.includes("school")) return <GraduationCap size={16} />;
  if (name.includes("entertain") || name.includes("movie")) return <Smile size={16} />;
  return <ShoppingCart size={16} />;
}

function groupTransactionsByDate(transactions: any[]) {
  const grouped: Record<string, any[]> = {};
  for (const tx of transactions) {
    const d = new Date(tx.date);
    let key = "";
    if (isToday(d)) key = "Today";
    else if (isYesterday(d)) key = "Yesterday";
    else key = format(d, "EEEE, MMM d");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tx);
  }
  return grouped;
}

async function TransactionsList({ searchParams }: { searchParams: Record<string, string> }) {
  const page = parseInt(searchParams.page ?? "1");
  const limit = 30;
  const skip = (page - 1) * limit;

  const type = searchParams.type;
  const categoryId = searchParams.categoryId ? parseInt(searchParams.categoryId) : undefined;

  const start = searchParams.start ? new Date(searchParams.start) : undefined;
  const end = searchParams.end ? new Date(searchParams.end) : undefined;
  const min = searchParams.min ? parseInt(searchParams.min) : undefined;
  const max = searchParams.max ? parseInt(searchParams.max) : undefined;
  const merchantQuery = searchParams.merchant;
  const categoryQuery = searchParams.category;

  const whereClause: any = {
    ...(type && { type }),
    ...(categoryId && { categoryId }),
  };

  if (start || end) {
    whereClause.date = {};
    if (start) whereClause.date.gte = start;
    if (end) whereClause.date.lte = end;
  }
  if (min !== undefined || max !== undefined) {
    whereClause.amountPaise = {};
    if (min !== undefined) whereClause.amountPaise.gte = min;
    if (max !== undefined) whereClause.amountPaise.lte = max;
  }
  if (merchantQuery) {
    whereClause.OR = [
      { merchantRaw: { contains: merchantQuery, mode: "insensitive" } },
      { merchant: { displayName: { contains: merchantQuery, mode: "insensitive" } } },
    ];
  }
  if (categoryQuery) {
    whereClause.category = { name: { contains: categoryQuery, mode: "insensitive" } };
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: whereClause,
      include: {
        merchant: { select: { displayName: true } },
        category: { select: { name: true, color: true } },
        paymentMethod: { select: { name: true, type: true, color: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where: whereClause }),
  ]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-[#52525B]"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <ReceiptText size={22} />
        </div>
        <h3 className="text-white font-semibold mb-1">No transactions found</h3>
        <p className="text-[#52525B] text-sm">Try adjusting your search.</p>
      </div>
    );
  }

  const buildQuery = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    return `?${params.toString()}`;
  };

  const grouped = groupTransactionsByDate(transactions);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {Object.entries(grouped).map(([dateLabel, txs]) => (
        <div key={dateLabel}>
          <p className="text-[11px] font-semibold text-[#52525B] uppercase tracking-widest mb-2 px-1">{dateLabel}</p>
          <div className="minimal-card rounded-2xl overflow-hidden">
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {txs.map(tx => (
                <Link
                  key={tx.id}
                  href={`/transactions/${tx.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.025] transition-colors group"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[#A1A1AA]"
                    style={{ background: tx.category?.color ? `${tx.category.color}18` : "rgba(255,255,255,0.06)" }}
                  >
                    {getCategoryIcon(tx.category?.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13.5px] font-medium text-white truncate">
                        {tx.merchant?.displayName ?? tx.merchantRaw ?? "Unknown"}
                      </p>
                      {tx.cashpointsEarned > 0 && (
                        <span className="text-[10px] font-bold text-[#FFD700] flex-shrink-0">
                          +{tx.cashpointsEarned}pt
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-[#52525B] mt-0.5 truncate">
                      {tx.category?.name ?? "Uncategorized"}
                      {tx.paymentMethod && ` · ${tx.paymentMethod.name}`}
                    </p>
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0">
                    <span
                      className="text-[13.5px] font-semibold"
                      style={{ color: tx.type === "INCOME" || tx.type === "REFUND" ? "#00D68F" : "#FAFAFA" }}
                    >
                      {tx.type === "INCOME" || tx.type === "REFUND" ? "+" : "-"}{formatPaise(tx.amountPaise)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {page > 1 && (
            <Link href={buildQuery(page - 1)}
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-[#A1A1AA] hover:text-white transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              Previous
            </Link>
          )}
          <span className="text-[13px] text-[#52525B] font-medium">{page} / {Math.ceil(total / limit)}</span>
          {page < Math.ceil(total / limit) && (
            <Link href={buildQuery(page + 1)}
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-[#A1A1AA] hover:text-white transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className=" max-w-3xl mx-auto pb-10 page-enter">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Transactions</h1>
            <p className="text-sm text-[#52525B] mt-1">AI-powered search across all activity</p>
          </div>
          <a
            href="/api/export"
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#52525B] hover:text-white transition-colors"
          >
            <Download size={14} />
            Export CSV
          </a>
        </div>
        <SearchBar />
      </div>

      <Suspense fallback={
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          ))}
        </div>
      }>
        <TransactionsList searchParams={params} />
      </Suspense>
    </div>
  );
}
