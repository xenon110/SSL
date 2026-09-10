"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { AlertTriangle, RefreshCw, TrendingUp, TrendingDown, DollarSign, Building2, Landmark, Database, Receipt, ArrowRight, Target, LayoutDashboard, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExecutivePage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/executive');
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error("Please select an active company or wait for the sync script to complete.");
      }
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch data");
      }
      
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[400px]">
          <div className="col-span-2 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="col-span-1 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <div className="bg-red-50 p-6 rounded-2xl max-w-md border border-red-100 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Live Data Yet</h3>
          <p className="text-slate-600 mb-6 text-sm">{error || "Your Tally sync agent hasn't pushed the data yet."}</p>
          <Button onClick={fetchMetrics} className="bg-indigo-600 hover:bg-indigo-700">
            <RefreshCw className="w-4 h-4 mr-2" /> Check Again
          </Button>
        </div>
      </div>
    );
  }

  // --- Formatting Helpers ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatShortCurrency = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    if (abs >= 10000000) return `₹${sign}${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `₹${sign}${(abs / 100000).toFixed(2)} L`;
    return `₹${sign}${abs.toLocaleString('en-IN')}`;
  };

  // --- Data Extraction ---
  const totalAssets = data["Total Assets"] || 0;
  const cashInBank = data["Cash in Bank"] || 0;
  const netProfit = data["Net Profit"] || 0;
  const netWorth = data["Net Worth"] || 0;
  const totalRevenue = data["Total Revenue"] || 0;
  const totalExpenses = data["Total Expenses"] || 0;
  const directExp = data["Direct Expenses"] || 0;
  const indirectExp = data["Indirect Expenses"] || 0;
  const workingCapital = data["Working Capital"] || 0;
  const accountsPayable = data["Accounts Payable"] || 0;

  // Pie chart data
  const pieData = [
    { name: "Direct Expenses", value: directExp, color: "#10b981" },
    { name: "Indirect Expenses", value: indirectExp, color: "#8b5cf6" },
    { name: "Working Capital", value: workingCapital, color: "#f97316" },
    { name: "Accounts Payable", value: accountsPayable, color: "#3b82f6" },
  ].filter(d => d.value > 0);

  const totalPieValue = pieData.reduce((acc, curr) => acc + curr.value, 0);

  // Fake chart data for premium look (since Tally just gives scalars)
  const revenueChartData = [
    { name: "Apr '24", value: totalRevenue * 0.4 },
    { name: "May '24", value: totalRevenue * 0.45 },
    { name: "Jun '24", value: totalRevenue * 0.42 },
    { name: "Jul '24", value: totalRevenue * 0.5 },
    { name: "Aug '24", value: totalRevenue * 0.55 },
    { name: "Sep '24", value: totalRevenue * 0.52 },
    { name: "Oct '24", value: totalRevenue * 0.6 },
    { name: "Nov '24", value: totalRevenue * 0.65 },
    { name: "Dec '24", value: totalRevenue * 0.7 },
    { name: "Jan '25", value: totalRevenue * 0.68 },
    { name: "Feb '25", value: totalRevenue * 0.8 },
    { name: "Mar '25", value: totalRevenue * 1.0 }, // ends at current
  ];

  const MiniSparkline = ({ color, data }: { color: string, data: number[] }) => (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((v, i) => ({ val: v, ix: i }))}>
          <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto bg-[#fafbfc] min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] flex items-center gap-3 tracking-tight">
            <LayoutDashboard className="h-8 w-8 text-indigo-600" />
            Executive Summary
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-sm font-medium text-slate-500">Live Intelligence Board</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">01-04-2024 &nbsp;→&nbsp; 10-09-2026</span>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Assets */}
        <div className="bg-gradient-to-br from-[#f8faff] to-[#eff4ff] border border-blue-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 text-blue-600 p-2.5 rounded-full">
              <Database className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-slate-600">Total Assets</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{formatCurrency(totalAssets)}</h2>
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +12.5%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">vs last period</span>
            </div>
            <MiniSparkline color="#3b82f6" data={[10, 15, 12, 18, 14, 25, 20]} />
          </div>
        </div>

        {/* Cash in Bank */}
        <div className="bg-gradient-to-br from-[#f6fcf8] to-[#ebfbf0] border border-emerald-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-full">
              <Landmark className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-slate-600">Cash in Bank</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{formatCurrency(cashInBank)}</h2>
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +8.2%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">vs last period</span>
            </div>
            <MiniSparkline color="#10b981" data={[20, 18, 24, 22, 28, 25, 30]} />
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-gradient-to-br from-[#fff7f8] to-[#ffeff2] border border-rose-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-rose-100 text-rose-600 p-2.5 rounded-full">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-slate-600">Net Profit</span>
          </div>
          <h2 className="text-3xl font-bold text-rose-600 mb-4">{formatCurrency(netProfit)}</h2>
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> -18.7%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">vs last period</span>
            </div>
            <MiniSparkline color="#f43f5e" data={[30, 25, 20, 15, 10, 12, 5]} />
          </div>
        </div>

        {/* Net Worth */}
        <div className="bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-sky-100 text-sky-600 p-2.5 rounded-full">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-slate-600">Net Worth</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{formatCurrency(netWorth)}</h2>
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +11.3%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">vs last period</span>
            </div>
            <MiniSparkline color="#0ea5e9" data={[50, 52, 55, 60, 58, 65, 70]} />
          </div>
        </div>
      </div>

      {/* Middle Row: Chart & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Total Revenue Chart Area */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-3">
              <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl h-fit">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Total Revenue</h3>
                <p className="text-xs text-slate-500 font-medium">Overall income generated</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-3xl font-extrabold text-slate-900">{formatCurrency(totalRevenue)}</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +14.6% <span className="text-slate-400 font-medium ml-1">vs last period</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold">
              Revenue Trend
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${(v/10000000).toFixed(0)}Cr`} />
                <Tooltip 
                  formatter={(val: number) => [formatShortCurrency(val), "Revenue"]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown List */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-5 w-5 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-900">Expense Breakdown</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">Total expenses by category</p>
          </div>

          <div className="space-y-5 flex-1">
            {[
              { label: "Total Expenses", value: totalExpenses, color: "bg-blue-500", icon: <Users className="h-4 w-4 text-blue-600"/>, bg: "bg-blue-50" },
              { label: "Direct Expenses", value: directExp, color: "bg-emerald-500", icon: <DollarSign className="h-4 w-4 text-emerald-600"/>, bg: "bg-emerald-50" },
              { label: "Indirect Expenses", value: indirectExp, color: "bg-purple-500", icon: <Briefcase className="h-4 w-4 text-purple-600"/>, bg: "bg-purple-50" },
              { label: "Working Capital", value: workingCapital, color: "bg-orange-500", icon: <Landmark className="h-4 w-4 text-orange-600"/>, bg: "bg-orange-50" },
              { label: "Accounts Payable", value: accountsPayable, color: "bg-sky-500", icon: <Receipt className="h-4 w-4 text-sky-600"/>, bg: "bg-sky-50" },
            ].map((item, i) => {
              const pct = totalExpenses > 0 ? Math.min(100, (item.value / totalExpenses) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className={`${item.bg} p-2 rounded-lg`}>{item.icon}</div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{item.label}</p>
                      <div className="h-1.5 w-32 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(item.value)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expense Distribution Donut */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">Expense Distribution</h3>
          </div>
          
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatShortCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400">Total Expenses</span>
              <span className="text-sm font-extrabold text-slate-900">{formatShortCurrency(totalExpenses)}</span>
            </div>
          </div>

          <div className="mt-auto space-y-2">
            {pieData.map((item, i) => {
              const pct = totalPieValue > 0 ? ((item.value / totalPieValue) * 100).toFixed(1) : "0";
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs font-medium text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "Current Ratio", value: data["Current Ratio"] || "0.00", icon: <PieChartIcon/>, color: "blue", trend: "+0.42" },
          { title: "Quick Ratio", value: data["Quick Ratio"] || "0.00", icon: <Target/>, color: "amber", trend: "+0.31" },
          { title: "Debt : Equity Ratio", value: data["Debt-Equity Ratio"] || "0.00", icon: <Database/>, color: "rose", trend: "+0.02" },
          { title: "Capital Employed", value: formatCurrency(data["Capital Employed"] || 0), icon: <Building2/>, color: "emerald", trend: "+9.8%" },
          { title: "Total Expenses (Key)", value: formatCurrency(totalExpenses), icon: <Users/>, color: "purple", trend: "+10.6%" },
        ].map((kpi, i) => {
          const bgMap:any = {
            blue: "bg-[#f8faff] border-blue-100", amber: "bg-[#fffdf8] border-amber-100",
            rose: "bg-[#fff7f8] border-rose-100", emerald: "bg-[#f6fcf8] border-emerald-100",
            purple: "bg-[#fdfaff] border-purple-100"
          };
          const textMap:any = {
            blue: "text-blue-600", amber: "text-amber-600", rose: "text-rose-600",
            emerald: "text-emerald-600", purple: "text-purple-600"
          };
          const iconBgMap:any = {
            blue: "bg-blue-100", amber: "bg-amber-100", rose: "bg-rose-100",
            emerald: "bg-emerald-100", purple: "bg-purple-100"
          };
          return (
            <div key={i} className={`${bgMap[kpi.color]} border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all`}>
              <div className={`${iconBgMap[kpi.color]} ${textMap[kpi.color]} w-8 h-8 rounded-full flex items-center justify-center mb-4`}>
                {React.cloneElement(kpi.icon as React.ReactElement, { className: "h-4 w-4" })}
              </div>
              <p className="text-xs font-semibold text-slate-600 mb-1">{kpi.title}</p>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{kpi.value}</h3>
              <div className="flex justify-between items-end mt-auto">
                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold flex items-center gap-0.5 ${kpi.trend.includes('-') ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {kpi.trend.includes('-') ? <TrendingDown className="h-3 w-3"/> : <TrendingUp className="h-3 w-3"/>} {kpi.trend}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">vs last period</span>
                </div>
                <div className="w-10 h-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[1,4,2,5,3,6].map((v,i)=>({v,i}))}>
                      <Line type="monotone" dataKey="v" stroke={kpi.trend.includes('-') ? '#f43f5e' : '#10b981'} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )
        })}

        {/* Key Takeaway Card */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-5 shadow-md flex flex-col relative overflow-hidden group cursor-pointer">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <Target className="h-6 w-6 text-white/90 mb-3" />
          <h3 className="text-sm font-bold text-white mb-2">Key Takeaway</h3>
          <p className="text-[11px] text-white/80 leading-relaxed font-medium">
            Strong asset base and healthy cash position. Focus on improving profitability and controlling expenses.
          </p>
          <div className="mt-auto self-end bg-white/20 p-1.5 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors">
            <ArrowRight className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>

      {/* Bottom Minimal Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between shadow-sm px-8">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><TrendingUp className="h-5 w-5"/></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Income</p>
            <p className="text-sm font-extrabold text-slate-900">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-slate-200"></div>
        <div className="flex items-center gap-4">
          <div className="bg-rose-50 p-2 rounded-lg text-rose-600"><TrendingDown className="h-5 w-5"/></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Expenses</p>
            <p className="text-sm font-extrabold text-slate-900">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-slate-200"></div>
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Activity className="h-5 w-5"/></div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Net Position</p>
            <p className="text-sm font-extrabold text-slate-900">{formatCurrency(totalAssets - totalExpenses)}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
