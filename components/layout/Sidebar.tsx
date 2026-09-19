
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, BarChart3,
  Star, Target, TrendingUp, Upload, Settings, Wallet
} from "lucide-react";

const navItems = [
  { href: "/",            label: "Overview",     icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight  },
  { href: "/accounts",    label: "Accounts",     icon: CreditCard       },
  { href: "/analytics",   label: "Analytics",    icon: BarChart3        },
  { href: "/rewards",     label: "Rewards",      icon: Star             },
  { href: "/budgets",     label: "Budgets",      icon: Target           },
  { href: "/emi",         label: "EMIs",         icon: TrendingUp       },
  { href: "/import",      label: "Import",       icon: Upload           },
  { href: "/settings",    label: "Settings",     icon: Settings         },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{ width: "220px", background: "#080809", borderRight: "1px solid rgba(255,255,255,0.06)", zIndex: 20 }} className="fixed inset-y-0 left-0 hidden lg:flex flex-col">
      {/* Logo */}
      <div style={{ height: "64px", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 20px" }} className="flex items-center gap-3">
        <div style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.1)", borderRadius: "8px" }} className="flex items-center justify-center">
          <Wallet size={14} color="#FFF" />
        </div>
        <span style={{ fontSize: "15px", fontWeight: "700", color: "#FFF", letterSpacing: "-0.02em" }}>Finance OS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: "500",
                transition: "all 0.2s ease",
                background: active ? "rgba(255,255,255,0.09)" : "transparent",
                color: active ? "#FFF" : "#6B6B6B"
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#D4D4D8";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "#6B6B6B";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon
                size={16}
                strokeWidth={active ? 2.5 : 1.8}
                color={active ? "#FFF" : "#6B6B6B"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00D68F" }} />
          <span style={{ fontSize: "11px", color: "#52525B", fontWeight: "600" }}>Finance OS v2</span>
        </div>
      </div>
    </aside>
  );
}
