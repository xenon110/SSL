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
} from "lucide-react";

const groupedNav = [
  {
    category: "Home",
    icon: LayoutDashboard,
    items: [
      { title: "Executive Summary", href: "/executive", icon: LayoutDashboard },
      { title: "Director Panel", href: "/director", icon: BrainCircuit },
      { title: "Business Alerts", href: "/alerts", icon: AlertTriangle },
    ]
  },
  {
    category: "Finance",
    icon: LineChart,
    items: [
      { title: "Profitability", href: "/profitability", icon: PieChart },
      { title: "Cash Flow", href: "/cash-flow", icon: Activity },
      { title: "Working Capital", href: "/working-capital", icon: Wallet },
      { title: "Financial Ratios", href: "/ratios", icon: BarChart3 },
      { title: "Balance Sheet", href: "/balance-sheet", icon: FileText },

      { title: "Investor Board", href: "/investor", icon: PieChart },
    ]
  },
  {
    category: "Sales",
    icon: TrendingUp,
    items: [
      { title: "Sales Board", href: "/sales", icon: ShoppingCart },
      { title: "Revenue", href: "/revenue", icon: TrendingUp },
      { title: "Receivables", href: "/receivables", icon: HandCoins },
      { title: "Customers", href: "/customer-analytics", icon: Users },
    ]
  },
  {
    category: "Purchases",
    icon: ShoppingCart,
    items: [
      { title: "Purchases", href: "/purchases", icon: ShoppingCart },
      { title: "Payables", href: "/payables", icon: CreditCard },
      { title: "Vendors", href: "/vendor-analytics", icon: Briefcase },
    ]
  },
  {
    category: "Operations",
    icon: Package,
    items: [
      { title: "Inventory", href: "/inventory", icon: Package },
      { title: "Expenses", href: "/expense", icon: Receipt },
      { title: "Bank", href: "/bank", icon: Banknote },
      { title: "Tax & Comp.", href: "/compliance", icon: ShieldCheck },
      { title: "Forecast", href: "/forecast", icon: LineChart },
    ]
  },
  {
    category: "Settings",
    icon: Settings,
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-20 border-r border-slate-800 bg-[#0f111a] text-slate-400 transition-transform flex flex-col items-center py-6 shadow-xl">
      <div className="mb-8 w-full flex justify-center">
        <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
          SP
        </div>
      </div>
      
      <div className="flex w-full flex-col space-y-4 mt-2">
        {groupedNav.map((group) => {
          const isActive = group.items.some(item => pathname === item.href);
          
          return (
            <div key={group.category} className="group relative w-full flex flex-col items-center">
              <div 
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all cursor-pointer mx-auto",
                  isActive 
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                    : "hover:bg-white/5 hover:text-slate-200"
                )}
              >
                <group.icon className="h-6 w-6 mb-1.5" strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium tracking-wide">{group.category}</span>
              </div>
              
              {/* Flyout Menu */}
              <div className="absolute left-20 top-0 hidden w-56 flex-col bg-white dark:bg-slate-900 shadow-xl group-hover:flex z-50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/50 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.category}</span>
                </div>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-2.5 text-sm transition-colors",
                      pathname === item.href 
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
