"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Package,
  Users,
  BarChart3,
  PieChart,
  FileText,
  Activity,
  AlertTriangle,
  Settings,
  Banknote,
  Briefcase,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Wallet,
  HandCoins,
} from "lucide-react";

const navItems = [
  { title: "Stock Summary", href: "/dashboard", icon: LayoutDashboard },
  { title: "Sales", href: "/sales", icon: TrendingUp },
  { title: "Purchases", href: "/purchases", icon: ShoppingCart },
  { title: "Outstandings", href: "/outstandings", icon: HandCoins },
  { title: "Cash Flow", href: "/cash-flow", icon: Activity },
  { title: "Income & Expenses", href: "/pnl", icon: Receipt },
  { title: "P&L & Balance Sheet", href: "/pnl-balance-sheet", icon: PieChart },
  { title: "Production", href: "/production", icon: Briefcase },
  { title: "Compare", href: "/compare", icon: BarChart3 },
  { title: "Audit (Edit Log)", href: "/audit", icon: ShieldCheck },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background transition-transform">
      <div className="flex h-full flex-col overflow-y-auto px-3 py-4">
        <div className="mb-6 px-3">
          <h2 className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-1">
            Samridhi<span className="text-indigo-600 font-bold">Prime</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Financial Intelligence</p>
        </div>
        <ul className="space-y-1 font-medium">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
