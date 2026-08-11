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
  Target,
  BrainCircuit,
  LineChart,
  Bot
} from "lucide-react";

const navItems = [
  { title: "Executive Summary", href: "/executive", icon: LayoutDashboard },
  { title: "Revenue Dashboard", href: "/revenue", icon: TrendingUp },
  { title: "Profitability Dashboard", href: "/profitability", icon: PieChart },
  { title: "Cash Flow Dashboard", href: "/cash-flow", icon: Activity },
  { title: "Receivables Dashboard", href: "/receivables", icon: HandCoins },
  { title: "Payables Dashboard", href: "/payables", icon: CreditCard },
  { title: "Bank Dashboard", href: "/bank", icon: Banknote },
  { title: "Expense Dashboard", href: "/expense", icon: Receipt },
  { title: "Inventory Dashboard", href: "/inventory", icon: Package },
  { title: "Sales Dashboard", href: "/sales", icon: ShoppingCart },
  { title: "Purchase Dashboard", href: "/purchases", icon: ShoppingCart },
  { title: "Tax & Compliance", href: "/compliance", icon: ShieldCheck },
  { title: "Financial Ratios", href: "/ratios", icon: BarChart3 },
  { title: "Balance Sheet Snapshot", href: "/balance-sheet", icon: FileText },
  { title: "Working Capital", href: "/working-capital", icon: Wallet },
  { title: "Budget vs Actual", href: "/budget", icon: Target },
  { title: "Customer Analytics", href: "/customer-analytics", icon: Users },
  { title: "Vendor Analytics", href: "/vendor-analytics", icon: Briefcase },
  { title: "Business Alerts", href: "/alerts", icon: AlertTriangle },
  { title: "Forecast Dashboard", href: "/forecast", icon: LineChart },
  { title: "Investor Dashboard", href: "/investor", icon: PieChart },
  { title: "Director Decision Panel", href: "/director", icon: BrainCircuit },
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
                  "flex items-center rounded-lg px-3 py-2 text-sm transition-all",
                  pathname === item.href 
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
