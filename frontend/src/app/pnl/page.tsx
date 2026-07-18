"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Scale, Target, Activity, Search, X, ChevronRight, ChevronDown, ChevronUp, Receipt, ArrowUpDown, PieChart as PieChartIcon } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Line, BarChart, Bar, Cell, Legend, LineChart, PieChart, Pie } from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PnLDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const d = new Date();
    const currentMonth = d.getMonth();
    const fyStartYear = currentMonth < 3 ? d.getFullYear() - 1 : d.getFullYear();
    return {
      from: new Date(fyStartYear, 3, 1),
      to: new Date(fyStartYear + 1, 2, 31)
    };
  });
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Deep Dive State
  const [selectedLedger, setSelectedLedger] = useState<any | null>(null);
  const [compareLedger, setCompareLedger] = useState<string>("none");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount'; direction: 'desc' | 'asc' }>({ key: 'date', direction: 'desc' });

  useEffect(() => {
    async function fetchLiveData() {
      try {
        setIsLoading(true);
        let url = '/api/pnl';
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('startDate', dateRange.from.toISOString().split('T')[0]);
        if (dateRange?.to) params.append('endDate', dateRange.to.toISOString().split('T')[0]);
        if (params.toString()) url += '?' + params.toString();

        const res = await fetch(url);
        const json = await res.json();
        setData(json);

        
      } catch (error) {
        console.error("Failed to fetch PnL data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLiveData();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };
  const formatCompact = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 1, notation: "compact" }).format(amount);
  };

  const handleSort = (key: 'date' | 'amount') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const allLedgersCombined = [...(data?.topIncomes || []), ...(data?.topExpenses || [])];

  const filteredTransactions = useMemo(() => {
    if (!selectedLedger || !data?.detailedTransactions) return [];
    
    let list = [];
    if (selectedLedger.isGroup) {
      list = data.detailedTransactions.filter((tx: any) => tx.rootGroup === selectedLedger.name);
    } else {
      list = data.detailedTransactions.filter((tx: any) => tx.ledger === selectedLedger.name);
    }
    
    list.sort((a: any, b: any) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      return sortConfig.direction === 'desc' ? (valB - valA) : (valA - valB);
    });
    
    return list;
  }, [selectedLedger, data, sortConfig]);

  const deepDiveTrend = useMemo(() => {
    if (!selectedLedger || !data?.detailedTransactions) return [];
    
    const monthly: Record<string, { month: string, target: number, compare: number, sortKey: number }> = {};
    
    data.detailedTransactions.forEach((tx: any) => {
      const isTarget = selectedLedger.isGroup 
        ? tx.rootGroup === selectedLedger.name 
        : tx.ledger === selectedLedger.name;
      const isCompare = tx.ledger === compareLedger;
      
      if (!isTarget && !isCompare) return;

      const d = new Date(tx.date);
      const m = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear().toString().substring(2);
      const sortKey = d.getFullYear() * 100 + d.getMonth();
      
      if (!monthly[m]) monthly[m] = { month: m, target: 0, compare: 0, sortKey };

      if (isTarget) monthly[m].target += tx.amount;
      if (isCompare) monthly[m].compare += tx.amount;
    });

    return Object.values(monthly).sort((a, b) => a.sortKey - b.sortKey);
  }, [selectedLedger, compareLedger, data]);

  const kpis = data?.kpis;

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  const expenseByGroup = useMemo(() => {
    if (!data?.topExpenses) return [];
    const groups: Record<string, number> = {};
    data.topExpenses.forEach((l: any) => {
      groups[l.rootGroup] = (groups[l.rootGroup] || 0) + l.amount;
    });
    return Object.keys(groups)
      .map(k => ({ name: k || 'Unknown', value: Math.max(0, groups[k]) }))
      .filter(g => g.value > 0)
      .sort((a,b)=>b.value - a.value);
  }, [data]);

  const incomeByGroup = useMemo(() => {
    if (!data?.topIncomes) return [];
    const groups: Record<string, number> = {};
    data.topIncomes.forEach((l: any) => {
      groups[l.rootGroup] = (groups[l.rootGroup] || 0) + l.amount;
    });
    return Object.keys(groups)
      .map(k => ({ name: k || 'Unknown', value: Math.max(0, groups[k]) }))
      .filter(g => g.value > 0)
      .sort((a,b)=>b.value - a.value);
  }, [data]);

  const groupLedgers = useMemo(() => {
    if (!selectedLedger || !selectedLedger.isGroup || !filteredTransactions.length) return [];
    const ledgers = new Map();
    filteredTransactions.forEach((tx: any) => {
      ledgers.set(tx.ledger, (ledgers.get(tx.ledger) || 0) + tx.amount);
    });
    return Array.from(ledgers.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a,b) => b.amount - a.amount);
  }, [filteredTransactions, selectedLedger]);

  const getRankClass = (i: number, baseClass: string) => {
    if (i === 0) return 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm ring-2 ring-amber-200 ring-offset-1';
    if (i === 1) return 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm ring-2 ring-slate-200 ring-offset-1';
    if (i === 2) return 'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-sm ring-2 ring-orange-200 ring-offset-1';
    return baseClass;
  };


  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl border backdrop-blur-sm shadow-sm">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Scale className="h-8 w-8 text-indigo-600" />
            Profit & Loss Dashboard
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Executive Income & Expense Statement</p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border">
          <DateRangePicker 
            value={dateRange}
            onDateChange={setDateRange}
          />
        </div>
      </div>

      {/* KPI Cards */}
      {(isLoading || !data) ? (
        <div className="flex flex-1 items-center justify-center p-8 space-y-4 flex-col">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium">Computing live Profit & Loss statement...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white hover:shadow-xl transition-all hover:-translate-y-1">
              <CardContent className="p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4"><DollarSign className="w-32 h-32" /></div>
                <p className="text-indigo-100 text-sm font-semibold uppercase tracking-wider mb-2">Total Revenue</p>
                <h3 className="text-4xl font-black truncate">{formatCompact(kpis?.totalIncome || 0)}</h3>
                <p className="text-indigo-200 mt-2 text-sm">{formatCompact(kpis?.totalDirectIncome || 0)} Direct</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Expenses</p>
                <h3 className="text-3xl font-black text-rose-600 truncate">{formatCompact(kpis?.totalExpense || 0)}</h3>
                <p className="text-slate-500 mt-2 text-sm">{formatCompact(kpis?.totalIndirectExpense || 0)} Indirect</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 hover:shadow-xl transition-all border-l-4 border-l-emerald-500">
              <CardContent className="p-6">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Gross Profit</p>
                <h3 className={`text-3xl font-black truncate ${kpis?.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCompact(kpis?.grossProfit || 0)}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className={kpis?.gpMargin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                    {kpis?.gpMargin?.toFixed(1)}% Margin
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 hover:shadow-xl transition-all border-l-4 border-l-indigo-500 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-5 -translate-y-2"><Target className="w-24 h-24" /></div>
              <CardContent className="p-6 relative z-10">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Net Profit</p>
                <h3 className={`text-3xl font-black truncate ${kpis?.netProfit >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-600'}`}>
                  {formatCompact(kpis?.netProfit || 0)}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className={kpis?.npMargin >= 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}>
                    {kpis?.npMargin?.toFixed(1)}% Margin
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-0 shadow-xl bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  Income vs Expense Trend
                </CardTitle>
                <CardDescription>Monthly visualization of net profit margins</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data?.trendData || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="totalIncome" name="Total Income" fill="url(#incomeFill)" stroke="#10b981" strokeWidth={3} />
                    <Line type="monotone" dataKey="totalExpense" name="Total Expense" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-rose-500" />
                  Top Expenses
                </CardTitle>
                <CardDescription>Click to deep dive into ledgers</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto custom-scrollbar h-[400px]">
                <ResponsiveContainer width="100%" height={Math.max(100, (data?.topExpenses?.slice(0, 15)?.length || 0) * 45 + 40)}>
                  <BarChart data={data?.topExpenses?.slice(0, 15) || []} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" fontSize={12} stroke="#94a3b8" tickFormatter={(v) => formatCompact(v)} />
                    <YAxis dataKey="name" type="category" width={120} fontSize={11} fontWeight={500} tickFormatter={(v: string) => v.length > 15 ? v.substring(0, 13) + '...' : v} tick={{ fill: '#475569' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="amount" name="Expense Amount" radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => setSelectedLedger(data)}>
                      {(data?.topExpenses || []).map((_: any, i: number) => (
                        <Cell key={i} fill="#f43f5e" className="cursor-pointer hover:opacity-80 transition-opacity" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-rose-500" />
                  Expense Structure
                </CardTitle>
                <CardDescription>Breakdown by expense groups</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseByGroup} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={3} dataKey="value" nameKey="name">
                      {expenseByGroup.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSelectedLedger({ name: entry.name, amount: entry.value, type: 'EXPENSE', isGroup: true })} />)}
                    </Pie>
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-emerald-500" />
                  Income Structure
                </CardTitle>
                <CardDescription>Breakdown by income groups</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomeByGroup} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={3} dataKey="value" nameKey="name">
                      {incomeByGroup.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setSelectedLedger({ name: entry.name, amount: entry.value, type: 'INCOME', isGroup: true })} />)}
                    </Pie>
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 mt-6">
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Top Income Sources
                </CardTitle>
                <CardDescription>Click to deep dive into ledgers</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto custom-scrollbar h-[350px]">
                <ResponsiveContainer width="100%" height={Math.max(100, (data?.topIncomes?.slice(0, 10)?.length || 0) * 45 + 40)}>
                  <BarChart data={data?.topIncomes?.slice(0, 10) || []} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" fontSize={12} stroke="#94a3b8" tickFormatter={(v) => formatCompact(v)} />
                    <YAxis dataKey="name" type="category" width={150} fontSize={11} fontWeight={500} tickFormatter={(v: string) => v.length > 20 ? v.substring(0, 18) + '...' : v} tick={{ fill: '#475569' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="amount" name="Income Amount" radius={[0, 4, 4, 0]} barSize={20} onClick={(data) => setSelectedLedger(data)}>
                      {(data?.topIncomes || []).map((_: any, i: number) => (
                        <Cell key={i} fill="#10b981" className="cursor-pointer hover:opacity-80 transition-opacity" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 mb-4">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Search className="h-6 w-6 text-indigo-600" />
              Deep Insights
            </h2>
            <p className="text-slate-500 mt-1 text-sm">Actionable analytics mined deeply from vouchers, ledgers, and inventory items.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {data?.insights?.topProducts?.map((p: any, i: number) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getRankClass(i, 'bg-indigo-100 text-indigo-700')}`}>{i+1}</div>
                        <p className="font-medium text-slate-700 truncate max-w-[120px]">{p.name}</p>
                      </div>
                      <p className="font-bold text-slate-800">{formatCompact(p.value)}</p>
                    </div>
                  ))}
                  {(!data?.insights?.topProducts || data.insights.topProducts.length === 0) && (
                    <div className="p-8 text-center text-slate-500">No product sales found</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">State-wise Revenue</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {data?.insights?.stateWiseRevenue?.map((s: any, i: number) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getRankClass(i, 'bg-emerald-100 text-emerald-700')}`}>{i+1}</div>
                        <p className="font-medium text-slate-700 truncate max-w-[120px]">{s.name}</p>
                      </div>
                      <p className="font-bold text-slate-800">{formatCompact(s.value)}</p>
                    </div>
                  ))}
                  {(!data?.insights?.stateWiseRevenue || data.insights.stateWiseRevenue.length === 0) && (
                    <div className="p-8 text-center text-slate-500">No state-wise revenue found</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">Top Customers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {data?.insights?.topCustomers?.map((c: any, i: number) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getRankClass(i, 'bg-blue-100 text-blue-700')}`}>{i+1}</div>
                        <p className="font-medium text-slate-700 truncate max-w-[120px]">{c.name}</p>
                      </div>
                      <p className="font-bold text-slate-800">{formatCompact(c.value)}</p>
                    </div>
                  ))}
                  {(!data?.insights?.topCustomers || data.insights.topCustomers.length === 0) && (
                    <div className="p-8 text-center text-slate-500">No customers found</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">Top Vendors</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {data?.insights?.topVendors?.map((v: any, i: number) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getRankClass(i, 'bg-rose-100 text-rose-700')}`}>{i+1}</div>
                        <p className="font-medium text-slate-700 truncate max-w-[120px]">{v.name}</p>
                      </div>
                      <p className="font-bold text-slate-800">{formatCompact(v.value)}</p>
                    </div>
                  ))}
                  {(!data?.insights?.topVendors || data.insights.topVendors.length === 0) && (
                    <div className="p-8 text-center text-slate-500">No vendors found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* LEDGER DEEP DIVE MODAL */}
      {selectedLedger && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center gap-4">
                {selectedLedger.parentContext && (
                  <button 
                    onClick={() => setSelectedLedger(selectedLedger.parentContext)}
                    className="p-2 rounded-full bg-white shadow-sm border hover:bg-slate-100 transition-colors text-slate-500"
                    title="Go back to group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                )}
                <div>
                  <Badge variant="outline" className={`mb-2 ${selectedLedger.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                    {selectedLedger.type === 'INCOME' ? 'Income Deep Dive' : 'Expense Deep Dive'}
                  </Badge>
                  <h3 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white" title={selectedLedger.name}>
                    {selectedLedger.name.length > 50 ? selectedLedger.name.substring(0, 50) + '...' : selectedLedger.name}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLedger(null)}
                className="p-3 rounded-full bg-white shadow-sm border hover:bg-slate-100 transition-colors text-slate-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8 space-y-8 bg-slate-50/30 dark:bg-slate-900/50 custom-scrollbar">
              
              <div className="grid grid-cols-3 gap-6">
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase text-slate-400 font-bold">Total {selectedLedger.type === 'INCOME' ? 'Income' : 'Expense'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-4xl font-black ${selectedLedger.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(selectedLedger.amount || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase text-slate-400 font-bold">Group Classification</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold text-slate-700">{selectedLedger.isGroup ? selectedLedger.name : (selectedLedger.rootGroup || 'Unknown')}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase text-slate-400 font-bold">Transaction Count</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-indigo-600">{filteredTransactions.length} <span className="text-lg text-slate-400 font-medium tracking-normal">vouchers</span></p>
                  </CardContent>
                </Card>
              </div>

              {/* Comparative Velocity Chart */}
              <Card className="border-0 shadow-xl bg-white flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/80">
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-500" /> Historical Trend</h4>
                    <p className="text-xs text-slate-500">Track and compare the monthly accumulation of this ledger.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase">Compare With:</span>
                    <select 
                      className="text-sm border-2 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:border-indigo-500 font-medium max-w-xs truncate"
                      value={compareLedger}
                      onChange={(e) => setCompareLedger(e.target.value)}
                    >
                      <option value="none">-- Select a ledger to compare --</option>
                      {allLedgersCombined
                        .filter((p: any) => p.name !== selectedLedger.name)
                        .map((p: any) => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="h-[400px] p-6 pt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={deepDiveTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => formatCompact(v)} />
                      <RechartsTooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      
                      <Line type="monotone" dataKey="target" name={selectedLedger.name.substring(0, 15)} stroke={selectedLedger.type === 'INCOME' ? '#10b981' : '#f43f5e'} strokeWidth={3} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      
                      {compareLedger !== 'none' && (
                        <Line type="monotone" dataKey="compare" name={compareLedger.substring(0, 15)} stroke="#0ea5e9" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Group Ledgers Breakdown (Only for Groups) */}
              {selectedLedger.isGroup && groupLedgers.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <PieChartIcon className="h-4 w-4 text-indigo-500" />
                    Ledgers in this Group
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupLedgers.map((l, i) => (
                      <Card 
                        key={i} 
                        className="border hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all bg-white"
                        onClick={() => setSelectedLedger({ 
                          name: l.name, 
                          amount: l.amount, 
                          type: selectedLedger.type, 
                          isGroup: false, 
                          rootGroup: selectedLedger.name,
                          parentContext: selectedLedger 
                        })}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <p className="font-semibold text-sm text-slate-700 truncate pr-4">{l.name}</p>
                          <p className={`font-black text-sm tabular-nums ${selectedLedger.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(l.amount)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction Ledger Table */}
              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <ChevronRight className="h-4 w-4 text-indigo-500" />
                  Transaction Ledger
                </h3>
                <div className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="max-h-[400px] overflow-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="text-xs font-semibold cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap pl-6" onClick={() => handleSort('date')}>
                            Date {sortConfig.key === 'date' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                          </TableHead>
                          <TableHead className="text-xs font-semibold">Voucher</TableHead>
                          <TableHead className="text-xs font-semibold">Type</TableHead>
                          <TableHead className="text-xs font-semibold text-right cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap pr-6" onClick={() => handleSort('amount')}>
                            Amount {sortConfig.key === 'amount' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.length > 0 ? filteredTransactions.map((tx: any, i: number) => (
                          <React.Fragment key={i}>
                            <TableRow 
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer"
                              onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                            >
                              <TableCell className="text-xs whitespace-nowrap text-slate-500 pl-6">
                                <div className="flex items-center gap-1.5">
                                  {expandedTxId === tx.id ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                                  {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-mono text-slate-400">{tx.id}</TableCell>
                              <TableCell className="text-xs font-medium">
                                <Badge variant="outline" className={tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}>
                                  {tx.voucherType}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-xs text-right font-bold tabular-nums pr-6 ${tx.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {formatCurrency(tx.amount)}
                              </TableCell>
                            </TableRow>
                            {expandedTxId === tx.id && (
                              <TableRow className="bg-slate-50/50 dark:bg-slate-800/30">
                                <TableCell colSpan={4} className="p-0">
                                  <div className="p-4 border-b pl-6 pr-6">
                                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1"><Receipt className="w-3.5 h-3.5 text-indigo-500" /> Detailed Voucher Breakdown</h4>
                                    <table className="w-full text-xs">
                                      <thead><tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500"><th className="text-left py-1.5 font-medium">Item / Ledger</th><th className="text-right py-1.5 font-medium">Qty</th><th className="text-right py-1.5 font-medium">Rate</th><th className="text-right py-1.5 font-medium">Amount</th></tr></thead>
                                      <tbody>
                                        {(tx.items || []).map((item: any, idx: number) => (
                                          <tr key={`item-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                                            <td className="py-1.5">{item.product}</td>
                                            <td className="text-right py-1.5 text-slate-600">{item.qty > 0 ? item.qty : '—'}</td>
                                            <td className="text-right py-1.5 text-slate-600">{item.rate > 0 ? formatCurrency(item.rate) : '—'}</td>
                                            <td className="text-right py-1.5 font-medium">{formatCurrency(item.amount)}</td>
                                          </tr>
                                        ))}
                                        {(tx.ledgers || []).map((l: any, idx: number) => (
                                          <tr key={`l-${idx}`}>
                                            <td className={`text-left py-1.5 italic ${l.is_debit ? 'text-rose-500' : 'text-emerald-500'}`}>
                                              {l.name} <span className="text-[9px] uppercase font-bold opacity-50 ml-1">{l.is_debit ? 'Dr' : 'Cr'}</span>
                                            </td>
                                            <td colSpan={2}></td>
                                            <td className="text-right py-1.5 text-slate-500">{formatCurrency(l.amount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm">No transactions found.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
