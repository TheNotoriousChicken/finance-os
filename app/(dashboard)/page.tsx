
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { calculateCombinedUtilization } from "@/lib/engine/utilization";
import { TrendingUp, CreditCard, Star, ArrowRight, Plus, ArrowUpRight, ArrowDownLeft, Wallet, BarChart3, Target } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [paymentMethods, spendResult, incomeResult, rewardResult, recentTxns] = await Promise.all([
    prisma.paymentMethod.findMany({ where: { isActive: true } }),
    prisma.transaction.aggregate({
      where: { type: "EXPENSE", isRefunded: false, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amountPaise: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "INCOME", date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amountPaise: true },
    }),
    prisma.reward.aggregate({
      where: { isReversed: false },
      _sum: { cashpointsEarned: true },
    }),
    prisma.transaction.findMany({
      take: 6,
      orderBy: { date: "desc" },
      include: { category: true, merchant: true, paymentMethod: true },
    }),
  ]);

  const spentPaise = spendResult._sum.amountPaise ?? 0;
  const incomePaise = incomeResult._sum.amountPaise ?? 0;
  const utilization = calculateCombinedUtilization(paymentMethods);
  const totalCashPoints = rewardResult._sum.cashpointsEarned ?? 0;
  const monthName = now.toLocaleString("en-IN", { month: "long" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1024px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* ── HERO ─────────────────────────────────────────── */}
      <div style={{ borderRadius: "24px", padding: "28px", background: "#0C0C0E", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#52525B", marginBottom: "16px" }}>
          {monthName} Spending
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "20px" }}>
          <div>
            <p style={{ fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: "#FFF", margin: 0 }}>
              {formatPaise(spentPaise)}
            </p>
            {incomePaise > 0 && (
              <p style={{ fontSize: "14px", color: "#52525B", marginTop: "12px", fontWeight: 500, margin: "12px 0 0 0" }}>
                <span style={{ color: "#00D68F", fontWeight: 600 }}>{formatPaise(incomePaise)}</span> received this month
              </p>
            )}
          </div>

          <Link
            href="/transactions"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "0 24px", height: "44px", borderRadius: "99px", background: "#FFF", color: "#000", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}
          >
            <Plus size={16} />
            New Transaction
          </Link>
        </div>

        {/* Metrics strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "16px", marginTop: "28px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <p style={{ fontSize: "10px", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "4px", margin: "0 0 4px 0" }}>Income</p>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "#00D68F", margin: 0, fontVariantNumeric: "tabular-nums" }}>{formatPaise(incomePaise)}</p>
          </div>
          <div>
            <p style={{ fontSize: "10px", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "4px", margin: "0 0 4px 0" }}>Credit Used</p>
            <p style={{ fontSize: "18px", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums", color: utilization.utilizationPct > 50 ? "#FFB547" : "#00D68F" }}>
              {utilization.utilizationPct.toFixed(1)}%
            </p>
          </div>
          <div>
            <p style={{ fontSize: "10px", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: "4px", margin: "0 0 4px 0" }}>CashPoints</p>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "#FFD700", margin: 0, fontVariantNumeric: "tabular-nums" }}>{totalCashPoints.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* ── BODY GRID ────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 2fr 1fr;
          }
        }
      `}} />
      <div className="dashboard-grid">

        {/* Recent Activity */}
        <div style={{ background: "#0C0C0E", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#FFF" }}>Recent Activity</span>
            <Link href="/transactions" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#52525B", textDecoration: "none", fontWeight: 500 }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {recentTxns.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#52525B", fontSize: "14px" }}>No transactions yet.</div>
          ) : (
            <div>
              {recentTxns.map((txn, i) => (
                <Link
                  key={txn.id}
                  href={`/transactions/${txn.id}`}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  {/* Icon */}
                  <div
                    style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: txn.category?.color ? `${txn.category.color}20` : "rgba(255,255,255,0.07)" }}
                  >
                    {txn.type === "INCOME"
                      ? <ArrowDownLeft size={15} color="#00D68F" />
                      : <ArrowUpRight size={15} color="#A1A1AA" />}
                  </div>

                  {/* Name + category */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13.5px", fontWeight: 500, color: "#FAFAFA", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {txn.merchant?.displayName ?? txn.merchantRaw ?? "Unknown"}
                    </p>
                    <p style={{ fontSize: "11.5px", color: "#52525B", margin: "2px 0 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {txn.category?.name ?? "Uncategorized"}
                      {txn.paymentMethod ? ` · ${txn.paymentMethod.name}` : ""}
                    </p>
                  </div>

                  {/* Amount + date */}
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "8px" }}>
                    <p style={{ fontSize: "13.5px", fontWeight: 600, margin: 0, fontVariantNumeric: "tabular-nums", color: txn.type === "INCOME" ? "#00D68F" : "#FAFAFA" }}>
                      {txn.type === "INCOME" ? "+" : "-"}{formatPaise(txn.amountPaise)}
                    </p>
                    <p style={{ fontSize: "11px", color: "#52525B", margin: "2px 0 0 0" }}>
                      {new Date(txn.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { href: "/analytics",    label: "Analytics",  sub: "Trends & insights",                               color: "#4D9EF7", Icon: BarChart3    },
            { href: "/accounts",     label: "Accounts",   sub: `${utilization.utilizationPct.toFixed(0)}% credit used`, color: "#00D68F", Icon: CreditCard   },
            { href: "/rewards",      label: "Rewards",    sub: `${totalCashPoints.toLocaleString()} pts earned`,   color: "#FFD700", Icon: Star          },
            { href: "/budgets",      label: "Budgets",    sub: "Monthly limits",                                   color: "#FF4757", Icon: Target        },
            { href: "/import",       label: "Import",     sub: "Upload statement",                                 color: "#A78BFA", Icon: TrendingUp    },
          ].map(({ href, label, sub, color, Icon }) => (
            <Link
              key={href}
              href={href}
              style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", borderRadius: "12px", background: "#0C0C0E", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}
            >
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: `${color}18` }}>
                <Icon size={15} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#FFF", margin: 0 }}>{label}</p>
                <p style={{ fontSize: "11.5px", color: "#52525B", margin: 0 }}>{sub}</p>
              </div>
              <ArrowRight size={13} color="#3F3F46" style={{ flexShrink: 0 }} />
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
