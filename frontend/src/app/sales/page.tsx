"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GenericDashboardSkeleton } from "@/components/layout/GenericDashboardView";
import { DollarSign, TrendingUp, TrendingDown, Users, Activity, AlertCircle, MapPin, X, ChevronRight, Package, IndianRupee, Calendar, ArrowUpRight, ArrowDownRight, Search, ArrowUpDown, Filter, ChevronLeft, ChevronRight as ChevronRightIcon, ChevronDown, ChevronUp, Receipt, Sparkles } from "lucide-react";
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

export default function SalesDashboard() {
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
  const [drillDown, setDrillDown] = useState<{ type: 'product' | 'customer' | 'region' | 'state'; name: string } | null>(null);
  const [compareTarget, setCompareTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount' | 'qty'; direction: 'desc' | 'asc' }>({ key: 'date', direction: 'desc' });
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({});
  const [aiData, setAiData] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchAiInsights = useCallback(async () => {
    try {
      setIsAiLoading(true);
      setAiError(null);
      let url = '/api/sales/ai';
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', dateRange.from.toISOString().split('T')[0]);
      if (dateRange?.to) params.append('endDate', dateRange.to.toISOString().split('T')[0]);
      if (isAdjustedView) params.append('adjusted', 'true');
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch AI insights');
      }
      const aiResult = await res.json();
      setAiData(aiResult);
    } catch (err: any) {
      console.error("AI fetch error:", err);
      setAiError(err.message || 'Error occurred');
    } finally {
      setIsAiLoading(false);
    }
  }, [dateRange, isAdjustedView]);

  useEffect(() => {
    if (showAiPanel && !aiData && !isAiLoading) {
      fetchAiInsights();
    }
  }, [showAiPanel, aiData, isAiLoading, fetchAiInsights]);

  useEffect(() => {
    setAiData(null);
  }, [dateRange]);

  // KPI Detail States
  const [selectedKpi, setSelectedKpi] = useState<'gross' | 'net' | 'returns' | 'pending' | null>(null);
  const [kpiSearchQuery, setKpiSearchQuery] = useState("");
  const [kpiPage, setKpiPage] = useState(1);
  const [kpiExpandedTxId, setKpiExpandedTxId] = useState<string | null>(null);

  useEffect(() => {
    setKpiSearchQuery("");
    setKpiPage(1);
    setKpiExpandedTxId(null);
  }, [selectedKpi]);

  // Global Ledger States
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalCustomerFilter, setGlobalCustomerFilter] = useState("all");
  const [globalProductFilter, setGlobalProductFilter] = useState("all");
  const [globalSort, setGlobalSort] = useState<{ key: 'date' | 'amount' | 'qty'; direction: 'desc' | 'asc' }>({ key: 'date', direction: 'desc' });
  const [globalPage, setGlobalPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    async function fetchLiveData() {
      try {
        setIsLoading(true);
        let url = '/api/dashboard';
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
  }, [dateRange]);

  // Reset drill-down sub-states when closing or changing main target
  useEffect(() => {
    setCompareTarget(null);
    setSearchQuery("");
    setSortConfig({ key: 'date', direction: 'desc' });
  }, [drillDown]);

  // Reset global pagination when filters change
  useEffect(() => {
    setGlobalPage(1);
  }, [globalSearch, globalCustomerFilter, globalProductFilter, globalSort]);

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

  const computeEntityStats = useCallback((type: 'product' | 'customer' | 'region' | 'state', name: string) => {
    if (!data?.detailedTransactions) return null;
    const allTx = data.detailedTransactions as any[];
    
    const filtered = allTx.filter((tx: any) => {
       if (type === 'product') return (tx.items || []).some((i: any) => i.product === name);
       if (type === 'region') return tx.region === name;
       if (type === 'state') return tx.state === name;
       return tx.customer === name;
    });

    let totalAmount = 0;
    let totalQty = 0;
    const relatedBreakdown: Record<string, { amount: number; qty: number; count: number }> = {};
    const monthly: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    filtered.forEach((tx: any) => {
      const m = monthNames[new Date(tx.date).getMonth()];
      if (!monthly[m]) monthly[m] = 0;

      if (type === 'product') {
         const items = (tx.items || []).filter((i: any) => i.product === name);
         let invoiceProductAmount = 0;
         let invoiceProductQty = 0;
         items.forEach((item: any) => {
            invoiceProductAmount += item.amount || 0;
            invoiceProductQty += Number(item.qty) || 0;
         });
         
         totalAmount += invoiceProductAmount;
         totalQty += invoiceProductQty;
         monthly[m] += invoiceProductAmount;

         let rel = tx.customer || 'Cash';
         if (!relatedBreakdown[rel]) relatedBreakdown[rel] = { amount: 0, qty: 0, count: 0 };
         relatedBreakdown[rel].amount += invoiceProductAmount;
         relatedBreakdown[rel].qty += invoiceProductQty;
         relatedBreakdown[rel].count += 1;

      } else if (type === 'customer') {
         totalAmount += tx.amount || 0;
         totalQty += Number(tx.qty) || 0;
         monthly[m] += tx.amount || 0;

         (tx.items || []).forEach((item: any) => {
            let rel = item.product || 'Unknown';
            if (!relatedBreakdown[rel]) relatedBreakdown[rel] = { amount: 0, qty: 0, count: 0 };
            relatedBreakdown[rel].amount += item.amount || 0;
            relatedBreakdown[rel].qty += Number(item.qty) || 0;
            relatedBreakdown[rel].count += 1; // Number of invoices they bought this item in
         });

      } else {
         totalAmount += tx.amount || 0;
         totalQty += Number(tx.qty) || 0;
         monthly[m] += tx.amount || 0;

         let rel = type === 'region' ? (tx.state || 'Unknown State') : (tx.customer || 'Cash');
         if (!relatedBreakdown[rel]) relatedBreakdown[rel] = { amount: 0, qty: 0, count: 0 };
         relatedBreakdown[rel].amount += tx.amount || 0;
         relatedBreakdown[rel].qty += Number(tx.qty) || 0;
         relatedBreakdown[rel].count += 1;
      }
    });

    const avgRate = totalQty > 0 ? totalAmount / totalQty : 0;
    
    const topRelated = Object.entries(relatedBreakdown)
      .map(([relName, d]) => ({ name: relName, ...d }))
      .sort((a, b) => b.amount - a.amount);
    
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
        (drillDown?.type === 'product' ? tx.customer : drillDown?.type === 'region' ? tx.state : drillDown?.type === 'state' ? tx.customer : tx.product)?.toLowerCase().includes(q)
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
        tx.customer?.toLowerCase().includes(q) ||
        tx.product?.toLowerCase().includes(q)
      );
    }
    
    if (globalCustomerFilter !== "all") {
      list = list.filter(tx => tx.customer === globalCustomerFilter);
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
  }, [data, globalSearch, globalCustomerFilter, globalProductFilter, globalSort]);

  const paginatedGlobalTx = useMemo(() => {
    const startIndex = (globalPage - 1) * rowsPerPage;
    return filteredGlobalTx.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredGlobalTx, globalPage]);

  const totalPages = Math.ceil(filteredGlobalTx.length / rowsPerPage);

  // Available options for comparison dropdown
  const comparisonOptions = useMemo(() => {
    if (!drillDown || !data) return [];
    let list: any[] = [];
    if (drillDown.type === 'product') list = data.salesByProduct;
    else if (drillDown.type === 'customer') list = data.topCustomers;
    else if (drillDown.type === 'region') list = data.salesByRegion;
    else if (drillDown.type === 'state') {
      // Find all states in the same region
      const regionMatch = data.salesByRegion.find((r: any) => r.states.some((s: any) => s.name === drillDown.name));
      if (regionMatch) list = regionMatch.states;
    }
    return (list || []).map((x: any) => x.name).filter((n: string) => n !== drillDown.name);
  }, [drillDown, data]);

  // Unique lists for global filters
  const uniqueCustomers = useMemo(() => Array.from(new Set((data?.detailedTransactions || []).map((t: any) => t.customer).filter(Boolean))) as string[], [data]);
  const uniqueProducts = useMemo(() => Array.from(new Set((data?.detailedTransactions || []).map((t: any) => t.product).filter(Boolean))) as string[], [data]);

  const predictionUrl = useMemo(() => {
    let url = '/sales/prediction';
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
            Sales Intelligence
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
        <Card 
          onClick={() => setSelectedKpi('gross')}
          className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer hover:ring-2 hover:ring-blue-500"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-24 h-24 text-blue-600" /></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Gross Revenue</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center"><DollarSign className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatCurrency(kpis.grossSales.value)}</div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setSelectedKpi('net')}
          className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer hover:ring-2 hover:ring-emerald-500"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-24 h-24 text-emerald-600" /></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Net Sales</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatCurrency(kpis.netSales.value)}</div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setSelectedKpi('returns')}
          className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer hover:ring-2 hover:ring-rose-500"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown className="w-24 h-24 text-rose-600" /></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Returns</CardTitle>
            <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center"><TrendingDown className="h-4 w-4 text-rose-600" /></div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatCurrency(kpis.salesReturns.value)}</div>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setSelectedKpi('pending')}
          className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer hover:ring-2 hover:ring-amber-500"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle className="w-24 h-24 text-amber-600" /></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Pending Orders</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center"><AlertCircle className="h-4 w-4 text-amber-600" /></div>
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
              <Activity className="h-5 w-5 text-indigo-500" />
              Revenue Velocity
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesTrend} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={13} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={13} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} dx={-10} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 8, strokeWidth: 0, fill: '#2563eb' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: ALL Products & ALL Customers */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col h-[550px]">
          <CardHeader className="flex-none">
            <CardTitle className="flex items-center gap-2 text-xl font-bold"><Package className="h-6 w-6 text-pink-500" /> Product Revenue Matrix</CardTitle>
            <CardDescription className="text-sm">Click on any product to open Professional Analysis</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '420px' }}>
              <ResponsiveContainer width="100%" height={Math.max(400, (data.salesByProduct?.length || 0) * 45)}>
                <BarChart data={data.salesByProduct || []} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => formatCompact(v)} fontSize={12} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={180} fontSize={12} fontWeight={500} tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '…' : v} tick={{ fill: '#475569', cursor: 'pointer' }} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="sales" radius={[0, 8, 8, 0]} barSize={28} cursor="pointer" onClick={(b) => b?.name && setDrillDown({ type: 'product', name: b.name })}>
                    {(data.salesByProduct || []).map((_: any, i: number) => <Cell key={i} fill={i === 0 ? '#ec4899' : '#f472b6'} className="hover:opacity-80 transition-opacity" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col h-[550px]">
          <CardHeader className="flex-none">
            <CardTitle className="flex items-center gap-2 text-xl font-bold"><Users className="h-6 w-6 text-purple-500" /> Customer Concentration</CardTitle>
            <CardDescription className="text-sm">Click on any customer to analyze and compare</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '420px' }}>
              <ResponsiveContainer width="100%" height={Math.max(400, (data.topCustomers?.length || 0) * 45)}>
                <BarChart data={data.topCustomers || []} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => formatCompact(v)} fontSize={12} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" width={180} fontSize={12} fontWeight={500} tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '…' : v} tick={{ fill: '#475569', cursor: 'pointer' }} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="sales" radius={[0, 8, 8, 0]} barSize={28} cursor="pointer" onClick={(b) => b?.name && setDrillDown({ type: 'customer', name: b.name })}>
                    {(data.topCustomers || []).map((_: any, i: number) => <Cell key={i} fill={i === 0 ? '#8b5cf6' : '#a78bfa'} className="hover:opacity-80 transition-opacity" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3.5: Risk Metrics & Region */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* Top Returned Products */}
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col">
          <CardHeader className="flex-none">
            <CardTitle className="flex items-center gap-2 text-xl font-bold"><TrendingDown className="h-6 w-6 text-rose-500" /> Top Returned Products</CardTitle>
            <CardDescription className="text-sm">Products with the highest return value (Quality Risk)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
             <div className="rounded-xl border shadow-sm overflow-hidden bg-white dark:bg-slate-900">
               <Table>
                 <TableHeader className="bg-slate-50 dark:bg-slate-800">
                   <TableRow>
                     <TableHead className="text-xs">Product Name</TableHead>
                     <TableHead className="text-xs text-right">Return Qty</TableHead>
                     <TableHead className="text-xs text-right">Return Amount</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {(data.returnsByProduct || []).slice(0, 5).map((p: any, i: number) => (
                     <TableRow key={i} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setDrillDown({ type: 'product', name: p.name })}>
                       <TableCell className="text-xs font-medium text-indigo-600 hover:underline">{p.name}</TableCell>
                       <TableCell className="text-right text-xs tabular-nums">{p.qty}</TableCell>
                       <TableCell className="text-right text-xs font-bold text-rose-600 tabular-nums">{formatCurrency(p.returns)}</TableCell>
                     </TableRow>
                   ))}
                   {(!data.returnsByProduct || data.returnsByProduct.length === 0) && (
                     <TableRow>
                       <TableCell colSpan={3} className="h-24 text-center text-slate-400 text-sm">No returned products found.</TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
          </CardContent>
        </Card>

        {/* Sales By Region */}
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col">
          <CardHeader className="flex-none">
            <CardTitle className="flex items-center gap-2 text-xl font-bold"><MapPin className="h-6 w-6 text-emerald-500" /> Sales by Region</CardTitle>
            <CardDescription className="text-sm">Revenue distribution, outstandings & returns across territories (Click rows to expand details)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
             <div className="rounded-xl border shadow-sm overflow-hidden bg-white dark:bg-slate-900">
               <Table>
                 <TableHeader className="bg-slate-50 dark:bg-slate-800">
                   <TableRow>
                     <TableHead className="text-xs w-[35%]">Region</TableHead>
                     <TableHead className="text-xs text-right">Revenue</TableHead>
                     <TableHead className="text-xs text-right">Outstanding</TableHead>
                     <TableHead className="text-xs text-right">Share</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                    {(data.salesByRegion || []).map((r: any, i: number) => {
                      const isExpanded = !!expandedRegions[r.name];
                      const share = ((r.value / (data.kpis?.grossSales?.value || 1)) * 100).toFixed(1);
                      return (
                        <React.Fragment key={i}>
                          <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => setExpandedRegions(prev => ({ ...prev, [r.name]: !prev[r.name] }))}>
                            <TableCell className="text-xs font-medium">
                              <div className="flex items-center gap-2">
                                <span className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-500" />
                                  )}
                                </span>
                                <span 
                                  className="text-indigo-600 hover:underline cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); setDrillDown({ type: 'region', name: r.name }); }}
                                >
                                  {r.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs font-bold text-emerald-600 tabular-nums">
                              {formatCurrency(r.value)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-bold text-rose-500 tabular-nums">
                              {formatCurrency(r.outstanding || 0)}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800">
                                {share}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded content */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/30 dark:bg-slate-800/10">
                              <TableCell colSpan={4} className="p-4 border-t-0">
                                <div className="space-y-3 pl-6">
                                  {/* Region Summary Metrics */}
                                  <div className="grid grid-cols-4 gap-4 text-[11px] text-slate-500 dark:text-slate-400 border-b pb-2">
                                    <div>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Total Invoices:</span> {r.invoiceCount || 0}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Active Customers:</span> {r.customerCount || 0}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Sales Returns:</span> <span className={r.returns > 0 ? "text-rose-600 font-semibold" : ""}>{formatCurrency(r.returns || 0)}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">Outstanding:</span> <span className={r.outstanding > 0 ? "text-amber-600 font-semibold" : ""}>{formatCurrency(r.outstanding || 0)}</span>
                                    </div>
                                  </div>
                                  
                                  {/* States Table */}
                                  <div className="rounded-lg border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                                    <Table>
                                      <TableHeader className="bg-slate-100/50 dark:bg-slate-800/50">
                                        <TableRow>
                                          <TableHead className="text-[10px] py-1.5 h-auto">State</TableHead>
                                          <TableHead className="text-[10px] py-1.5 h-auto text-right">Revenue</TableHead>
                                          <TableHead className="text-[10px] py-1.5 h-auto text-right">Outstanding</TableHead>
                                          <TableHead className="text-[10px] py-1.5 h-auto text-right">Top Customer</TableHead>
                                          <TableHead className="text-[10px] py-1.5 h-auto text-right">Top Product</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {(r.states || []).map((s: any, j: number) => {
                                          const stateShare = ((s.sales / (r.value || 1)) * 100).toFixed(1);
                                          return (
                                            <TableRow key={j} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                              <TableCell className="text-[11px] font-medium py-1.5">
                                                <span 
                                                  className="text-indigo-600 hover:underline cursor-pointer"
                                                  onClick={(e) => { e.stopPropagation(); setDrillDown({ type: 'state', name: s.name }); }}
                                                >
                                                  {s.name}
                                                </span>
                                              </TableCell>
                                              <TableCell className="text-[11px] py-1.5 text-right font-semibold text-emerald-600 tabular-nums">
                                                <div className="flex flex-col items-end">
                                                  <span>{formatCurrency(s.sales)}</span>
                                                  <span className="text-[9px] text-slate-400 font-normal">{stateShare}% of region</span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-[11px] py-1.5 text-right font-semibold text-rose-500 tabular-nums">
                                                <div className="flex flex-col items-end">
                                                  <span>{formatCurrency(s.outstanding || 0)}</span>
                                                  {s.returns > 0 && (
                                                    <span className="text-[9px] text-amber-500 font-normal">Returns: {formatCurrency(s.returns)}</span>
                                                  )}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-[11px] py-1.5 text-right truncate max-w-[140px]" title={s.topCustomer?.name}>
                                                {s.topCustomer ? (
                                                  <div className="flex flex-col items-end">
                                                    <span 
                                                      className="text-indigo-600 hover:underline cursor-pointer font-medium text-right line-clamp-1"
                                                      onClick={(e) => { e.stopPropagation(); setDrillDown({ type: 'customer', name: s.topCustomer.name }); }}
                                                    >
                                                      {s.topCustomer.name}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-normal">{formatCurrency(s.topCustomer.sales)}</span>
                                                  </div>
                                                ) : '-'}
                                              </TableCell>
                                              <TableCell className="text-[11px] py-1.5 text-right truncate max-w-[140px]" title={s.topProduct?.name}>
                                                {s.topProduct ? (
                                                  <div className="flex flex-col items-end">
                                                    <span 
                                                      className="text-indigo-600 hover:underline cursor-pointer font-medium text-right line-clamp-1"
                                                      onClick={(e) => { e.stopPropagation(); setDrillDown({ type: 'product', name: s.topProduct.name }); }}
                                                    >
                                                      {s.topProduct.name}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-normal">{formatCurrency(s.topProduct.sales)}</span>
                                                  </div>
                                                ) : '-'}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                        {(!r.states || r.states.length === 0) && (
                                          <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4 text-[10px] text-slate-400">No states data found.</TableCell>
                                          </TableRow>
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {(!data.salesByRegion || data.salesByRegion.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-slate-400 text-sm">No regional data found.</TableCell>
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
        {/* Churn Risk */}
        <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col">
          <CardHeader className="flex-none">
            <CardTitle className="flex items-center gap-2 text-xl font-bold"><AlertCircle className="h-6 w-6 text-rose-500" /> Customer Churn Risk</CardTitle>
            <CardDescription className="text-sm">Customers who haven't ordered in &gt; 90 days</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
             <div className="rounded-xl border shadow-sm overflow-hidden bg-white dark:bg-slate-900">
               <Table>
                 <TableHeader className="bg-slate-50 dark:bg-slate-800">
                   <TableRow>
                     <TableHead className="text-xs">Customer</TableHead>
                     <TableHead className="text-xs text-right">Last Tx Date</TableHead>
                     <TableHead className="text-xs text-right">Lifetime Value</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                    {(data.churnedCustomers || []).map((c: any, i: number) => (
                      <TableRow key={i} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => setDrillDown({ type: 'customer', name: c.name })}>
                        <TableCell className="text-xs font-medium text-indigo-600 hover:underline">{c.name}</TableCell>
                        <TableCell className="text-right text-xs text-rose-600 font-semibold">{new Date(c.lastTxDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatCurrency(c.value)}</TableCell>
                     </TableRow>
                   ))}
                   {(!data.churnedCustomers || data.churnedCustomers.length === 0) && (
                     <TableRow>
                       <TableCell colSpan={3} className="h-24 text-center text-slate-400 text-sm">No at-risk customers found! Everyone is active.</TableCell>
                     </TableRow>
                   )}
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
