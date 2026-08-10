"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { GenericDashboardSkeleton } from "@/components/layout/GenericDashboardView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Users, Activity, AlertCircle, MapPin, X, ChevronRight, Package, IndianRupee, Calendar, ArrowUpRight, ArrowDownRight, Truck, Search, ArrowUpDown, Filter, ChevronLeft, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function PurchaseDashboard() {
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
  const [isAdjustedView, setIsAdjustedView] = useState(false);

  // Drill-down States
  const [drillDown, setDrillDown] = useState<{ type: 'product' | 'supplier'; name: string } | null>(null);
  const [compareTarget, setCompareTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount' | 'qty'; direction: 'desc' | 'asc' }>({ key: 'date', direction: 'desc' });

  // Global Ledger States
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSupplierFilter, setGlobalSupplierFilter] = useState("all");
  const [globalProductFilter, setGlobalProductFilter] = useState("all");
  const [globalSort, setGlobalSort] = useState<{ key: 'date' | 'amount' | 'qty'; direction: 'desc' | 'asc' }>({ key: 'date', direction: 'desc' });
  const [globalPage, setGlobalPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    async function fetchLiveData() {
      try {
        setIsLoading(true);
        let url = '/api/purchases';
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('startDate', dateRange.from.toISOString().split('T')[0]);
        if (dateRange?.to) params.append('endDate', dateRange.to.toISOString().split('T')[0]);
        if (isAdjustedView) params.append('adjusted', 'true');
        if (params.toString()) url += '?' + params.toString();
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch data');
        const apiData = await res.json();
        setData(apiData);

        
      } catch (error) {
        console.error("Error fetching live data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLiveData();
  }, [dateRange, isAdjustedView]);

  // Reset drill-down sub-states when closing or changing main target
  useEffect(() => {
    setCompareTarget(null);
    setSearchQuery("");
    setSortConfig({ key: 'date', direction: 'desc' });
  }, [drillDown]);

  // Reset global pagination when filters change
  useEffect(() => {
    setGlobalPage(1);
  }, [globalSearch, globalSupplierFilter, globalProductFilter, globalSort]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

  const formatCompact = (val: number) => {
    const v = val || 0;
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(2)}k`;
    return `₹${v.toFixed(2)}`;
  };

  const kpis = data?.kpis;

  const computeEntityStats = useCallback((type: 'product' | 'supplier', name: string) => {
    if (!data?.detailedTransactions) return null;
    const allTx = data.detailedTransactions as any[];
    
    const filtered = allTx.filter((tx: any) => type === 'product' ? tx.product === name : tx.supplier === name);
    const totalAmount = filtered.reduce((s: number, t: any) => s + (t.amount || 0), 0);
    const totalQty = filtered.reduce((s: number, t: any) => s + (Number(t.qty) || 0), 0);
    const avgRate = totalQty > 0 ? totalAmount / totalQty : 0;
    
    const relatedBreakdown: Record<string, { amount: number; qty: number; count: number }> = {};
    filtered.forEach((tx: any) => {
      const rel = type === 'product' ? (tx.supplier || 'Cash') : (tx.product || 'Multiple/None');
      if (!relatedBreakdown[rel]) relatedBreakdown[rel] = { amount: 0, qty: 0, count: 0 };
      relatedBreakdown[rel].amount += tx.amount || 0;
      relatedBreakdown[rel].qty += Number(tx.qty) || 0;
      relatedBreakdown[rel].count += 1;
    });
    const topRelated = Object.entries(relatedBreakdown)
      .map(([relName, d]) => ({ name: relName, ...d }))
      .sort((a, b) => b.amount - a.amount);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly: Record<string, number> = {};
    filtered.forEach((tx: any) => {
      const m = monthNames[new Date(tx.date).getMonth()];
      monthly[m] = (monthly[m] || 0) + (tx.amount || 0);
    });
    
    return { name, filtered, totalAmount, totalQty, avgRate, topRelated, monthly, txCount: filtered.length };
  }, [data]);

  const primaryStats = useMemo(() => drillDown ? computeEntityStats(drillDown.type, drillDown.name) : null, [drillDown, computeEntityStats]);
  const compareStats = useMemo(() => drillDown && compareTarget ? computeEntityStats(drillDown.type, compareTarget) : null, [drillDown, compareTarget, computeEntityStats]);

  const combinedMonthlyTrend = useMemo(() => {
    if (!primaryStats) return [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthNames.map(m => {
      const pSales = primaryStats.monthly[m] || 0;
      const cSales = compareStats ? (compareStats.monthly[m] || 0) : 0;
      return { month: m, primary: pSales, compare: cSales };
    }).filter(d => d.primary > 0 || d.compare > 0);
  }, [primaryStats, compareStats]);

  const handleDrillSort = (key: 'date' | 'amount' | 'qty') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleGlobalSort = (key: 'date' | 'amount' | 'qty') => {
    setGlobalSort(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filteredAndSortedTx = useMemo(() => {
    if (!primaryStats) return [];
    let list = [...primaryStats.filtered];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(tx => 
        tx.id.toLowerCase().includes(q) || 
        (drillDown?.type === 'product' ? tx.supplier : tx.product)?.toLowerCase().includes(q)
      );
    }
    
    list.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      return sortConfig.direction === 'desc' ? (valB - valA) : (valA - valB);
    });
    
    return list;
  }, [primaryStats, searchQuery, sortConfig, drillDown]);

  // Global Ledger Filtering
  const filteredGlobalTx = useMemo(() => {
    if (!data?.detailedTransactions) return [];
    let list = [...data.detailedTransactions];

    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      list = list.filter(tx => 
        tx.id?.toLowerCase().includes(q) || 
        tx.supplier?.toLowerCase().includes(q) ||
        tx.product?.toLowerCase().includes(q)
      );
    }
    
    if (globalSupplierFilter !== "all") {
      list = list.filter(tx => tx.supplier === globalSupplierFilter);
    }
    
    if (globalProductFilter !== "all") {
      list = list.filter(tx => tx.product === globalProductFilter);
    }

    list.sort((a, b) => {
      let valA = a[globalSort.key];
      let valB = b[globalSort.key];
      if (globalSort.key === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      return globalSort.direction === 'desc' ? (valB - valA) : (valA - valB);
    });
    
    return list;
  }, [data, globalSearch, globalSupplierFilter, globalProductFilter, globalSort]);

  const paginatedGlobalTx = useMemo(() => {
    const startIndex = (globalPage - 1) * rowsPerPage;
    return filteredGlobalTx.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredGlobalTx, globalPage]);

  const totalPages = Math.ceil(filteredGlobalTx.length / rowsPerPage);

  // Available options for comparison dropdown
  const comparisonOptions = useMemo(() => {
    if (!drillDown || !data) return [];
    const list = drillDown.type === 'product' ? data.purchasesByProduct : data.topSuppliers;
    return (list || []).map((x: any) => x.name).filter((n: string) => n !== drillDown.name);
  }, [drillDown, data]);

  // Unique lists for global filters
  const uniqueSuppliers = useMemo(() => Array.from(new Set((data?.detailedTransactions || []).map((t: any) => t.supplier).filter(Boolean))) as string[], [data]);
  const uniqueProducts = useMemo(() => Array.from(new Set((data?.detailedTransactions || []).map((t: any) => t.product).filter(Boolean))) as string[], [data]);

  const predictionUrl = useMemo(() => {
    let url = '/purchases/prediction';
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', dateRange.from.toISOString().split('T')[0]);
    if (dateRange?.to) params.append('endDate', dateRange.to.toISOString().split('T')[0]);
    if (params.toString()) url += '?' + params.toString();
    return url;
  }, [dateRange]);

  return (
    <div className="flex-1 space-y-6 pb-8 px-2 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Procurement Intelligence
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live syncing from Tally
            </p>
            <div className="h-4 w-px bg-slate-300"></div>
            <button 
              onClick={() => setIsAdjustedView(!isAdjustedView)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                isAdjustedView 
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${isAdjustedView ? "bg-indigo-500" : "bg-slate-300"}`}></div>
              {isAdjustedView ? "Adjusted Values (Approved)" : "Pure Tally Values"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={predictionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-lg shadow-md hover:scale-102 active:scale-98 transition-all duration-200"
          >
            <Sparkles className="h-4 w-4 text-white animate-pulse" />
            AI Future Prediction
          </a>
          
          <div className="flex items-center space-x-2 bg-white/50 dark:bg-slate-900/50 p-1.5 rounded-lg shadow-sm border backdrop-blur-sm">
             <DateRangePicker value={dateRange} onDateChange={setDateRange} />
          </div>
        </div>
      </div>

      {(isLoading || !data) ? (
        <GenericDashboardSkeleton />
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-both">
      
      {/* KPI Scorecards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-24 h-24 text-blue-600" /></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Total Spend</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center"><DollarSign className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatCurrency(kpis.totalPurchases.value)}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Activity className="w-24 h-24 text-indigo-600" /></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Avg Invoice</CardTitle>
            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center"><Activity className="h-4 w-4 text-indigo-600" /></div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatCurrency(kpis.avgOrderValue.value)}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Truck className="w-24 h-24 text-emerald-600" /></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Active Vendors</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"><Truck className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{kpis.activeSuppliers.value}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle className="w-24 h-24 text-rose-600" /></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Pending POs</CardTitle>
            <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center"><AlertCircle className="h-4 w-4 text-rose-600" /></div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatCurrency(kpis.pendingOrders.value)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Capital Expenditure Velocity
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.purchaseTrend} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={13} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={13} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} dx={-10} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSpend)" activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: ALL Products & ALL Suppliers */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col h-[550px]">
          <CardHeader className="flex-none">
            <CardTitle className="flex items-center gap-2 text-xl font-bold"><Package className="h-6 w-6 text-emerald-500" /> Product Spend Matrix</CardTitle>
            <CardDescription className="text-sm">Click on any product to open Professional Analysis</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '420px' }}>
              <ResponsiveContainer width="100%" height={Math.max(400, (data.purchasesByProduct?.length || 0) * 45)}>
                <BarChart data={data.purchasesByProduct || []} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => formatCompact(v)} fontSize={12} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={180} fontSize={12} fontWeight={500} tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '…' : v} tick={{ fill: '#475569', cursor: 'pointer' }} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="purchases" radius={[0, 8, 8, 0]} barSize={28} cursor="pointer" onClick={(b) => b?.name && setDrillDown({ type: 'product', name: b.name })}>
                    {(data.purchasesByProduct || []).map((_: any, i: number) => <Cell key={i} fill={i === 0 ? '#10b981' : '#34d399'} className="hover:opacity-80 transition-opacity" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col h-[550px]">
          <CardHeader className="flex-none">
            <CardTitle className="flex items-center gap-2 text-xl font-bold"><Truck className="h-6 w-6 text-blue-500" /> Vendor Concentration Risk</CardTitle>
            <CardDescription className="text-sm">Click on any supplier to analyze and compare</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '420px' }}>
              <ResponsiveContainer width="100%" height={Math.max(400, (data.topSuppliers?.length || 0) * 45)}>
                <BarChart data={data.topSuppliers || []} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => formatCompact(v)} fontSize={12} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={180} fontSize={12} fontWeight={500} tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '…' : v} tick={{ fill: '#475569', cursor: 'pointer' }} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="purchases" radius={[0, 8, 8, 0]} barSize={28} cursor="pointer" onClick={(b) => b?.name && setDrillDown({ type: 'supplier', name: b.name })}>
                    {(data.topSuppliers || []).map((_: any, i: number) => <Cell key={i} fill={i === 0 ? '#3b82f6' : '#60a5fa'} className="hover:opacity-80 transition-opacity" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3.5: Supplier Quality Risk */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* Top Defective Suppliers */}
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col">
          <CardHeader className="flex-none">
            <CardTitle className="flex items-center gap-2 text-xl font-bold"><TrendingDown className="h-6 w-6 text-rose-500" /> Supplier Quality Risk</CardTitle>
            <CardDescription className="text-sm">Suppliers with the highest value of returned/rejected goods (Debit Notes)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
             <div className="rounded-xl border shadow-sm overflow-hidden bg-white dark:bg-slate-900">
               <Table>
                 <TableHeader className="bg-slate-50 dark:bg-slate-800">
                   <TableRow>
                     <TableHead className="text-xs">Supplier Name</TableHead>
                     <TableHead className="text-xs text-right">Debit Notes</TableHead>
                     <TableHead className="text-xs text-right">Return Amount</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {(data.defectiveSuppliers || []).slice(0, 5).map((s: any, i: number) => (
                     <TableRow key={i}>
                       <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-200">{s.name}</TableCell>
                       <TableCell className="text-right text-xs tabular-nums">{s.count}</TableCell>
                       <TableCell className="text-right text-xs font-bold text-rose-600 tabular-nums">{formatCurrency(s.returns)}</TableCell>
                     </TableRow>
                   ))}
                   {(!data.defectiveSuppliers || data.defectiveSuppliers.length === 0) && (
                     <TableRow>
                       <TableCell colSpan={3} className="h-24 text-center text-slate-400 text-sm">No returned goods recorded.</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
          </CardContent>
        </Card>

      </div>

      {/* Row 3.7: Advanced Analytics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* Supplier Dependency Risk */}
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col">
          <CardHeader className="flex-none">
            <CardTitle className="flex items-center gap-2 text-xl font-bold"><AlertCircle className="h-6 w-6 text-rose-500" /> Supplier Dependency Risk</CardTitle>
            <CardDescription className="text-sm">Concentration of purchases across top suppliers</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
             <div className="rounded-xl border shadow-sm overflow-hidden bg-white dark:bg-slate-900">
               <Table>
                 <TableHeader className="bg-slate-50 dark:bg-slate-800">
                   <TableRow>
                     <TableHead className="text-xs">Supplier</TableHead>
                     <TableHead className="text-xs text-right">Dependency %</TableHead>
                     <TableHead className="text-xs text-right">Spend</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                    {(data.topSuppliers || []).slice(0,5).map((c: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-200">{c.name}</TableCell>
                        <TableCell className="text-right text-xs">
                           <Badge variant={c.dependencyPercentage > 40 ? "destructive" : "outline"} className="text-[10px]">
                              {c.dependencyPercentage.toFixed(1)}%
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatCurrency(c.sales)}</TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
          </CardContent>
        </Card>

        {/* Pending Order Pipeline */}
        
      </div>
      </div>
      )}
    </div>
  );
}
