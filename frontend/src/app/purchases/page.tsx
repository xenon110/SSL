"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DateRange } from "react-day-picker";
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
        <div className="flex flex-1 items-center justify-center h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
            <p className="text-lg font-medium text-slate-600 animate-pulse">Aggregating Enterprise Data...</p>
          </div>
        </div>
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
        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex flex-col justify-center items-center p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center mb-6">
              <Package className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Purchase Order Pipeline</h2>
            <p className="text-emerald-100 mb-6">You currently have pending Purchase Orders waiting to be received.</p>
            <div className="text-6xl font-black mb-4">
              {formatCurrency(kpis.pendingOrders?.value || 0)}
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-full text-sm font-semibold">
              Pending Goods Receipt
            </div>
        </Card>
      </div>

      {/* Row 4: All Transactions Ledger */}
      <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-500" />
                Comprehensive Transaction Ledger
              </CardTitle>
              <CardDescription>All recorded transactions in the selected period ({filteredGlobalTx.length} results)</CardDescription>
            </div>
            
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search vouchers or names..." 
                  className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 shadow-sm"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
                <select 
                  className="text-sm border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate w-full sm:w-40"
                  value={globalSupplierFilter}
                  onChange={(e) => setGlobalSupplierFilter(e.target.value)}
                >
                  <option value="all">All Suppliers</option>
                  {uniqueSuppliers.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
                
                <select 
                  className="text-sm border rounded-lg px-3 py-2 bg-white dark:bg-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate w-full sm:w-40"
                  value={globalProductFilter}
                  onChange={(e) => setGlobalProductFilter(e.target.value)}
                >
                  <option value="all">All Products</option>
                  {uniqueProducts.map((p: string) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                <TableRow>
                  <TableHead className="text-xs font-semibold cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap pl-6" onClick={() => handleGlobalSort('date')}>
                    Date {globalSort.key === 'date' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Voucher</TableHead>
                  <TableHead className="text-xs font-semibold">Supplier</TableHead>
                  <TableHead className="text-xs font-semibold">Product</TableHead>
                  <TableHead className="text-xs font-semibold text-right cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap" onClick={() => handleGlobalSort('qty')}>
                    Qty {globalSort.key === 'qty' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap pr-6" onClick={() => handleGlobalSort('amount')}>
                    Amount {globalSort.key === 'amount' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGlobalTx.map((tx: any, i: number) => (
                  <TableRow key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <TableCell className="text-xs whitespace-nowrap text-slate-500 pl-6">{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-400">{tx.id}</TableCell>
                    <TableCell className="text-xs font-medium text-indigo-600 cursor-pointer hover:underline truncate max-w-[150px]" onClick={() => tx.supplier && setDrillDown({ type: 'supplier', name: tx.supplier })}>{tx.supplier}</TableCell>
                    <TableCell className="text-xs text-slate-600 truncate max-w-[150px] cursor-pointer hover:underline hover:text-indigo-600" onClick={() => tx.product && tx.product !== 'Multiple/None' && setDrillDown({ type: 'product', name: tx.product })}>{tx.product}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{tx.qty > 0 ? tx.qty : '—'}</TableCell>
                    <TableCell className="text-xs text-right font-bold text-slate-700 dark:text-slate-200 tabular-nums pr-6">{formatCurrency(tx.amount)}</TableCell>
                  </TableRow>
                ))}
                {paginatedGlobalTx.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 text-sm">No transactions found matching your filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
              <div className="text-xs text-slate-500 font-medium">
                Showing {((globalPage - 1) * rowsPerPage) + 1} to {Math.min(globalPage * rowsPerPage, filteredGlobalTx.length)} of {filteredGlobalTx.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setGlobalPage(p => Math.max(1, p - 1))}
                  disabled={globalPage === 1}
                  className="p-1.5 rounded-md border bg-white dark:bg-slate-800 text-slate-600 disabled:opacity-50 hover:bg-slate-100 disabled:hover:bg-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-xs font-semibold px-2">Page {globalPage} of {totalPages}</div>
                <button 
                  onClick={() => setGlobalPage(p => Math.min(totalPages, p + 1))}
                  disabled={globalPage === totalPages}
                  className="p-1.5 rounded-md border bg-white dark:bg-slate-800 text-slate-600 disabled:opacity-50 hover:bg-slate-100 disabled:hover:bg-white transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DRILL-DOWN PANEL */}
      {drillDown && primaryStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDrillDown(null)} />
          <div className="relative w-full max-w-5xl max-h-[95vh] flex flex-col bg-background shadow-2xl rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header with Comparison Select */}
            <div className="flex-none bg-background/90 backdrop-blur-xl border-b px-6 py-4 z-20">
              <div className="flex items-start justify-between">
                <div className="w-full">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                    {drillDown.type === 'product' ? <Package className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                    Professional {drillDown.type} Analysis
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2 w-full pr-12">
                    <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white truncate" title={drillDown.name}>
                      {drillDown.name}
                    </h2>
                    
                    <div className="flex items-center gap-2 flex-1 max-w-[300px]">
                      <span className="text-xs font-semibold text-slate-400">VS</span>
                      <select 
                        className="flex-1 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 font-medium truncate"
                        value={compareTarget || ""}
                        onChange={(e) => setCompareTarget(e.target.value || null)}
                      >
                        <option value="">Compare with...</option>
                        {comparisonOptions.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <button onClick={() => setDrillDown(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              
              {/* KPIs Dual View */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800/50">
                  <div className="text-sm text-indigo-700 dark:text-indigo-400 font-semibold mb-2">Total Volume</div>
                  <div className="flex items-end gap-4">
                    <div>
                      <div className="text-xs text-slate-500 mb-1 truncate max-w-[120px]">{drillDown.name}</div>
                      <div className="text-2xl font-bold">{formatCurrency(primaryStats.totalAmount)}</div>
                    </div>
                    {compareStats && (
                      <>
                        <div className="w-px h-10 bg-indigo-200 dark:bg-indigo-800 mx-2" />
                        <div>
                          <div className="text-xs text-slate-500 mb-1 truncate max-w-[120px]">{compareStats.name}</div>
                          <div className="text-2xl font-bold text-slate-600 dark:text-slate-300">{formatCurrency(compareStats.totalAmount)}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border shadow-sm">
                  <div className="text-sm font-semibold mb-2 text-slate-600">Total Qty</div>
                  <div className="text-xl font-bold">{primaryStats.totalQty.toFixed(2)}</div>
                  {compareStats && (
                    <div className="text-sm text-slate-500 mt-1 font-medium">vs {compareStats.totalQty.toFixed(2)}</div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border shadow-sm">
                  <div className="text-sm font-semibold mb-2 text-slate-600">Avg Rate</div>
                  <div className="text-xl font-bold">{formatCurrency(primaryStats.avgRate)}</div>
                  {compareStats && (
                    <div className="text-sm font-medium mt-1 flex items-center gap-1">
                      {primaryStats.avgRate > compareStats.avgRate ? (
                        <span className="text-rose-500 flex items-center"><ArrowUpRight className="h-3 w-3" /> {(primaryStats.avgRate - compareStats.avgRate).toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-500 flex items-center"><ArrowDownRight className="h-3 w-3" /> {(compareStats.avgRate - primaryStats.avgRate).toFixed(2)}</span>
                      )}
                      <span className="text-slate-400 text-xs line-through">{formatCurrency(compareStats.avgRate)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Comparison Chart */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                  Velocity Comparison
                </h3>
                <div className="h-[250px] bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={combinedMonthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => formatCompact(v)} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v) => formatCurrency(v as number)} cursor={{fill: '#f1f5f9'}} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="primary" name={drillDown.name.substring(0, 15)+'...'} fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={compareStats ? 12 : 24} />
                      {compareStats && (
                        <Bar dataKey="compare" name={compareTarget?.substring(0, 15)+'...'} fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={12} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Related Entities Table */}
              {primaryStats.topRelated && primaryStats.topRelated.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    {drillDown.type === 'product' ? <Truck className="h-4 w-4 text-indigo-500" /> : <Package className="h-4 w-4 text-indigo-500" />}
                    {drillDown.type === 'product' ? 'Suppliers Used' : 'Products Procured'}
                  </h3>
                  <div className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800">
                        <TableRow>
                          <TableHead className="text-xs">{drillDown.type === 'product' ? 'Supplier Name' : 'Product Name'}</TableHead>
                          <TableHead className="text-xs text-right">Qty</TableHead>
                          <TableHead className="text-xs text-right">Invoices</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                          <TableHead className="text-xs text-right">Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {primaryStats.topRelated.map((p: any, i: number) => (
                          <TableRow 
                            key={i} 
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" 
                            onClick={() => {
                              if (p.name !== 'Multiple/None' && p.name !== 'Cash') {
                                setDrillDown({ type: drillDown.type === 'product' ? 'supplier' : 'product', name: p.name });
                              }
                            }}
                          >
                            <TableCell className="text-xs font-medium text-indigo-600 truncate max-w-[200px]" title={p.name}>{p.name}</TableCell>
                            <TableCell className="text-right text-xs tabular-nums">{p.qty > 0 ? p.qty.toFixed(2) : '—'}</TableCell>
                            <TableCell className="text-right text-xs tabular-nums">{p.count}</TableCell>
                            <TableCell className="text-right text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatCurrency(p.amount)}</TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800">
                                {((p.amount / primaryStats.totalAmount) * 100).toFixed(0)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Pro Transaction Table with Filtering/Sorting */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wide">
                    <ChevronRight className="h-4 w-4 text-indigo-500" />
                    Transaction Ledger
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search voucher or name..." 
                      className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="max-h-[350px] overflow-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="text-xs cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap" onClick={() => handleDrillSort('date')}>
                            Date {sortConfig.key === 'date' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                          </TableHead>
                          <TableHead className="text-xs">Voucher</TableHead>
                          <TableHead className="text-xs">{drillDown.type === 'product' ? 'Supplier' : 'Product'}</TableHead>
                          <TableHead className="text-xs text-right cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap" onClick={() => handleDrillSort('qty')}>
                            Qty {sortConfig.key === 'qty' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                          </TableHead>
                          <TableHead className="text-xs text-right cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap" onClick={() => handleDrillSort('amount')}>
                            Amount {sortConfig.key === 'amount' && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedTx.length > 0 ? filteredAndSortedTx.map((tx: any, i: number) => (
                          <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell className="text-xs whitespace-nowrap text-slate-500">{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-400">{tx.id}</TableCell>
                            <TableCell className="text-xs font-medium truncate max-w-[150px]">{drillDown.type === 'product' ? tx.supplier : tx.product}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{tx.qty > 0 ? tx.qty : '—'}</TableCell>
                            <TableCell className="text-xs text-right font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatCurrency(tx.amount)}</TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-slate-400 text-sm">No transactions match your search.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Manager Insight */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mt-6">
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">💡 Manager Insight</h4>
                {drillDown.type === 'product' && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    We spent <strong>{formatCurrency(primaryStats.totalAmount)}</strong> on <strong>{drillDown.name}</strong> across{' '}
                    <strong>{primaryStats.txCount}</strong> transactions.{' '}
                    {primaryStats.topRelated.length > 0 && (
                      <>Our main supplier is <strong>{primaryStats.topRelated[0].name}</strong> providing{' '}
                      <strong>{((primaryStats.topRelated[0].amount / primaryStats.totalAmount) * 100).toFixed(0)}%</strong> of this product's procurement volume.{' '}
                      </>
                    )}
                    {primaryStats.totalQty > 0 && (
                      <>Average buying rate is <strong>{formatCurrency(primaryStats.avgRate)}</strong> per unit.{' '}
                      {primaryStats.topRelated.length === 1 && 'Single-source dependency: Consider finding secondary suppliers to reduce supply chain risk.'}
                      </>
                    )}
                  </p>
                )}
                {drillDown.type === 'supplier' && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    We procured <strong>{formatCurrency(primaryStats.totalAmount)}</strong> from <strong>{drillDown.name}</strong> across{' '}
                    <strong>{primaryStats.txCount}</strong> invoices.{' '}
                    {primaryStats.topRelated.length > 0 && (
                      <>Our largest spend with them is for <strong>{primaryStats.topRelated[0].name}</strong> ({formatCurrency(primaryStats.topRelated[0].amount)}).{' '}
                      </>
                    )}
                    {Object.keys(primaryStats.monthly).filter(m => primaryStats.monthly[m] > 0).length > 1 && (
                      <>They have supplied us for <strong>{Object.keys(primaryStats.monthly).filter(m => primaryStats.monthly[m] > 0).length} months</strong>.{' '}
                      </>
                    )}
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
