"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Banknote, ArrowDownRight, ArrowUpRight, Activity, Search, X, Users, Briefcase, HandCoins, ChevronRight, ChevronDown, ChevronUp, Receipt, ArrowUpDown, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend, PieChart, Pie, LineChart, Line, ComposedChart } from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CashFlowDashboard() {
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
  const [outstandings, setOutstandings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdjustedView, setIsAdjustedView] = useState(false);

  // Modal State for Overlays
  const [modalType, setModalType] = useState<'all' | 'inflow' | 'outflow' | 'liquidity_bank' | 'liquidity_cash' | null>(null);
  const [modalSearch, setModalSearch] = useState("");

  // Ledger Deep Dive State
  const [selectedLedger, setSelectedLedger] = useState<any | null>(null);
  const [compareLedger, setCompareLedger] = useState<string>("none");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount'; direction: 'desc' | 'asc' }>({ key: 'date', direction: 'desc' });

  const [isSyncing, setIsSyncing] = useState(false);

  const triggerSync = async () => {
    try {
      setIsSyncing(true);
      let syncUrl = '/api/sync';
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      if (params.toString()) syncUrl += '?' + params.toString();
      
      await fetch(syncUrl, { method: 'POST' });
      
      // Reload data after sync
      let dataUrl = '/api/cash-flow';
      if (params.toString()) dataUrl += '?' + params.toString();
      if (isAdjustedView) {
        if (dataUrl.includes('?')) dataUrl += '&adjusted=true';
        else dataUrl += '?adjusted=true';
      }
      const res = await fetch(dataUrl);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Live Sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    async function fetchLiveData() {
      try {
        setIsLoading(true);
        let url = '/api/cash-flow';
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
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

  useEffect(() => {
    async function fetchOutstandings() {
      try {
        let url = '/api/outstandings';
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
        if (params.toString()) url += '?' + params.toString();
        
        const res = await fetch(url);
        const json = await res.json();
        setOutstandings(json);
      } catch (err) {
        console.error("Failed to fetch outstandings:", err);
      }
    }
    fetchOutstandings();
  }, [dateRange]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

  const formatCompact = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
  };

  const kpis = data?.kpis;

  // Compute Ledger Deep Dive Trend
  const deepDiveTrend = useMemo(() => {
    if (!selectedLedger || !data?.detailedTransactions) return [];
    
    const monthly: Record<string, { name: string, targetIn: number, targetOut: number, compareIn: number, compareOut: number, sortKey: number }> = {};
    
    data.detailedTransactions.forEach((tx: any) => {
      const isTarget = tx.ledger === selectedLedger.name;
      const isCompare = tx.ledger === compareLedger;
      
      if (!isTarget && !isCompare) return;

      const d = new Date(tx.date);
      const m = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear().toString().substring(2);
      const sortKey = d.getFullYear() * 100 + d.getMonth();
      
      if (!monthly[m]) monthly[m] = { name: m, targetIn: 0, targetOut: 0, compareIn: 0, compareOut: 0, sortKey };

      if (isTarget) {
        if (tx.type === 'INFLOW') monthly[m].targetIn += tx.amount;
        if (tx.type === 'OUTFLOW') monthly[m].targetOut += tx.amount;
      }
      if (isCompare) {
        if (tx.type === 'INFLOW') monthly[m].compareIn += tx.amount;
        if (tx.type === 'OUTFLOW') monthly[m].compareOut += tx.amount;
      }
    });

    return Object.values(monthly).sort((a, b) => a.sortKey - b.sortKey);
  }, [selectedLedger, compareLedger, data]);

  const handleSort = (key: 'date' | 'amount') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filteredTransactions = useMemo(() => {
    if (!selectedLedger || !data?.detailedTransactions) return [];
    
    let list = data.detailedTransactions.filter((tx: any) => tx.ledger === selectedLedger.name);
    
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

  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-[99]">
          <p className="font-bold text-slate-800 dark:text-white text-sm">{data.name}</p>
          <p className="text-emerald-600 font-bold text-xs mt-1">Amount: {formatCurrency(data.value)}</p>
          <p className="text-[10px] text-slate-400 mt-2 italic text-center">Click to view deep dive</p>
        </div>
      );
    }
    return null;
  };

  const donutColors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#6366f1', '#eab308', '#f43f5e', '#14b8a6'];

  const allLedgersCombined = useMemo(() => {
    if (!data) return [];
    const map: Record<string, any> = {};
    (data.topSources || []).forEach((s: any) => {
      map[s.name] = { name: s.name, inflow: s.amount, outflow: 0, netFlow: s.amount };
    });
    (data.topUses || []).forEach((u: any) => {
      if (!map[u.name]) map[u.name] = { name: u.name, inflow: 0, outflow: 0, netFlow: 0 };
      map[u.name].outflow += u.amount;
      map[u.name].netFlow -= u.amount;
    });
    return Object.values(map).sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow));
  }, [data]);

  const expectedFlows = useMemo(() => {
    if (!outstandings) return null;
    const now = new Date();
    now.setHours(0,0,0,0);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeks = [
      { label: 'This Week', in: 0, out: 0 },
      { label: 'Next Week', in: 0, out: 0 },
      { label: 'Week 3', in: 0, out: 0 },
      { label: 'Week 4', in: 0, out: 0 },
    ];

    const processBills = (bills: any[], type: 'in' | 'out') => {
      bills?.forEach((p: any) => {
        p.bills?.forEach((b: any) => {
          if (!b.due_date) return;
          const due = new Date(b.due_date).getTime();
          const amount = Math.abs(Number(b.pending_amount) || 0);
          
          if (due < now.getTime()) {
            // Overdue bills: distribute realistically over 4 weeks based on collection velocity
            weeks[0][type] += amount * 0.40;
            weeks[1][type] += amount * 0.30;
            weeks[2][type] += amount * 0.20;
            weeks[3][type] += amount * 0.10;
          } else {
            const diff = due - now.getTime();
            const wk = Math.floor(diff / msPerWeek);
            if (wk >= 0 && wk < 4) {
              weeks[wk][type] += amount;
            } else if (wk >= 4) {
              // Standard late collection logic
              weeks[3][type] += amount;
            }
          }
        });
      });
    };

    processBills(outstandings.receivables, 'in');
    processBills(outstandings.payables, 'out');

    return weeks;
  }, [outstandings]);

  const predictionUrl = useMemo(() => {
    let url = '/cash-flow/prediction';
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    if (params.toString()) url += '?' + params.toString();
    return url;
  }, [dateRange]);

  return (
    <div className="flex-1 space-y-6 pb-8 px-2 animate-in fade-in duration-700 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
            Cash Flow & Liquidity
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-time cash movement from Tally
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
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-emerald-500" : ""}`} />
            {isSyncing ? "Syncing Live..." : "Live Sync"}
          </button>
          
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
            <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin"></div>
            <p className="text-lg font-medium text-slate-600 animate-pulse">Visualizing Cash Flow...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-both">

          {/* Expected Cash Flow Strip */}
          {expectedFlows && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-indigo-900">Expected Flow (Next 4 Weeks)</h3>
                <span className="text-xs text-indigo-500 ml-2 bg-indigo-100 px-2 py-0.5 rounded">Based on pending bill due dates</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {expectedFlows.map((wk, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-indigo-50 flex flex-col justify-between">
                    <span className="text-sm font-medium text-slate-500 mb-2">{wk.label}</span>
                    <div className="flex justify-between items-end">
                      <div className="text-emerald-600">
                        <div className="text-xs font-semibold opacity-70">IN</div>
                        <div className="font-bold">{formatCompact(wk.in)}</div>
                      </div>
                      <div className="text-rose-600 text-right">
                        <div className="text-xs font-semibold opacity-70">OUT</div>
                        <div className="font-bold">{formatCompact(wk.out)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      
          {/* KPI Scorecards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            
            <Card 
              className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer ring-2 ring-transparent hover:ring-indigo-500/50 group"
              onClick={() => setModalType('all')}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote className="w-24 h-24 text-indigo-600 transition-transform group-hover:scale-110" /></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Net Cash Flow</CardTitle>
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center"><Banknote className="h-4 w-4 text-indigo-600" /></div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className={`text-3xl font-extrabold tracking-tight ${kpis.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCompact(kpis.netFlow)}
                </div>
                <p className="text-xs text-indigo-600 mt-1 font-semibold flex items-center gap-1">View All Ledger Flow <ArrowUpRight className="h-3 w-3" /></p>
              </CardContent>
            </Card>

            <Card 
              className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer ring-2 ring-transparent hover:ring-emerald-500/50 group"
              onClick={() => setModalType('inflow')}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowDownRight className="w-24 h-24 text-emerald-600 transition-transform group-hover:scale-110" /></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Total Inflow (Receipts)</CardTitle>
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center"><ArrowDownRight className="h-4 w-4 text-emerald-600" /></div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatCompact(kpis.totalInflow)}</div>
                <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">View Top Cash Sources <ArrowUpRight className="h-3 w-3 ml-auto opacity-50" /></p>
              </CardContent>
            </Card>

            <Card 
              className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer ring-2 ring-transparent hover:ring-rose-500/50 group"
              onClick={() => setModalType('outflow')}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowUpRight className="w-24 h-24 text-rose-600 transition-transform group-hover:scale-110" /></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Total Outflow (Payments)</CardTitle>
                <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center"><ArrowUpRight className="h-4 w-4 text-rose-600" /></div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{formatCompact(kpis.totalOutflow)}</div>
                <p className="text-xs text-rose-600 mt-1 font-medium flex items-center gap-1">View Top Cash Drains <ArrowUpRight className="h-3 w-3 ml-auto opacity-50" /></p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 group">
              <div className="absolute top-0 right-0 p-4 opacity-10"><HandCoins className="w-24 h-24 text-amber-600 transition-transform group-hover:scale-110" /></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Total Transactions</CardTitle>
                <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center"><HandCoins className="h-4 w-4 text-amber-600" /></div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{kpis.transactionCount}</div>
                <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">Receipts & Payments</p>
              </CardContent>
            </Card>

          </div>

          {/* Liquidity Scorecards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            
            <Card 
              className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-indigo-500 to-blue-600 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300 cursor-pointer group"
              onClick={() => setModalType('liquidity_bank')}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20"><Briefcase className="w-32 h-32 text-white transition-transform group-hover:scale-110" /></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-blue-100">Total Bank Balance</CardTitle>
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><Briefcase className="h-4 w-4 text-white" /></div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-black text-white tracking-tight">{formatCurrency(Math.abs(kpis.totalBankBalance || 0))}</div>
                <p className="text-xs text-blue-100 mt-1 font-medium flex items-center gap-1">Click to view {data.liquidityAccounts?.filter((a: any) => a.parent_group === 'Bank Accounts').length || 0} Bank Accounts <ArrowUpRight className="h-3 w-3 ml-auto opacity-70" /></p>
              </CardContent>
            </Card>

            <Card 
              className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300 cursor-pointer group"
              onClick={() => setModalType('liquidity_cash')}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20"><Banknote className="w-32 h-32 text-white transition-transform group-hover:scale-110" /></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-emerald-100">Total Cash in Hand</CardTitle>
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><Banknote className="h-4 w-4 text-white" /></div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-black text-white tracking-tight">{formatCurrency(Math.abs(kpis.totalCashBalance || 0))}</div>
                <p className="text-xs text-emerald-100 mt-1 font-medium flex items-center gap-1">Click to view {data.liquidityAccounts?.filter((a: any) => a.parent_group === 'Cash-in-Hand').length || 0} Cash Accounts <ArrowUpRight className="h-3 w-3 ml-auto opacity-70" /></p>
              </CardContent>
            </Card>

          </div>

          {/* Net Cash Position (Surplus / Deficit) Chart */}
          {data.trendData && data.trendData.length > 0 && (
            <div className="grid gap-6">
              <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col lg:col-span-2">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                    Net Cash Position (Surplus / Deficit)
                  </CardTitle>
                  <CardDescription className="text-slate-500">Actual net cash flow (Inflows minus Outflows) synced from Tally for the selected date range</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] p-4 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                      <RechartsTooltip formatter={(value) => [formatCurrency(value as number), 'Net Flow']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar name="Net Cash Movement" dataKey="netFlow" radius={[4,4,0,0]}>
                        {data.trendData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.netFlow >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Row 2: Main Cash Flow Charts */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col lg:col-span-2">
              <CardHeader className="flex-none">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  Monthly Cash Flow Velocity
                </CardTitle>
                <CardDescription className="text-sm">Inflow vs Outflow over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => formatCompact(v)} />
                    <RechartsTooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="inflow" name="Cash Inflow" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                    <Area type="monotone" dataKey="outflow" name="Cash Outflow" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col">
              <CardHeader className="flex-none">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5 text-emerald-500" />
                  Top Cash Sources (Receipts)
                </CardTitle>
                <CardDescription className="text-sm">Click any bar to open ledger deep dive</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden h-[350px]">
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height={Math.max(100, (data.topSources?.slice(0, 20).length || 0) * 45 + 40)}>
                    <BarChart data={data.topSources?.slice(0, 20) || []} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={12} stroke="#94a3b8" tickFormatter={(v) => formatCompact(v)} />
                      <YAxis dataKey="name" type="category" width={180} fontSize={11} fontWeight={500} tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '…' : v} tick={{ fill: '#475569' }} />
                      <RechartsTooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatCurrency(value)} />
                      <Bar 
                        dataKey="amount" 
                        name="Inflow Amount" 
                        radius={[0, 4, 4, 0]} 
                        barSize={20}
                        onClick={(data) => setSelectedLedger(data)}
                      >
                        {(data.topSources || []).map((_: any, i: number) => (
                          <Cell key={i} fill="#10b981" className="cursor-pointer hover:opacity-80 transition-opacity" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col">
              <CardHeader className="flex-none">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-rose-500" />
                  Top Cash Uses (Payments)
                </CardTitle>
                <CardDescription className="text-sm">Click any bar to open ledger deep dive</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden h-[350px]">
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height={Math.max(100, (data.topUses?.slice(0, 20).length || 0) * 45 + 40)}>
                    <BarChart data={data.topUses?.slice(0, 20) || []} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={12} stroke="#94a3b8" tickFormatter={(v) => formatCompact(v)} />
                      <YAxis dataKey="name" type="category" width={180} fontSize={11} fontWeight={500} tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '…' : v} tick={{ fill: '#475569' }} />
                      <RechartsTooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatCurrency(value)} />
                      <Bar 
                        dataKey="amount" 
                        name="Outflow Amount" 
                        radius={[0, 4, 4, 0]} 
                        barSize={20}
                        onClick={(data) => setSelectedLedger(data)}
                      >
                        {(data.topUses || []).map((_: any, i: number) => (
                          <Cell key={i} fill="#f43f5e" className="cursor-pointer hover:opacity-80 transition-opacity" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =================================================================================================== */}
      {/* 1. VISUAL KPI MODAL (Donuts / Grids) */}
      {/* =================================================================================================== */}
      {modalType && !selectedLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-5 border-b bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                  {modalType === 'inflow' ? <ArrowDownRight className="h-6 w-6 text-emerald-600" /> :
                   modalType === 'outflow' ? <ArrowUpRight className="h-6 w-6 text-rose-600" /> :
                   <Banknote className="h-6 w-6 text-indigo-600" />}
                  {modalType === 'inflow' ? 'Cash Inflow Distribution' :
                   modalType === 'outflow' ? 'Cash Outflow Distribution' :
                   modalType === 'liquidity_bank' ? 'Bank Accounts Detail' :
                   modalType === 'liquidity_cash' ? 'Cash-in-Hand Detail' :
                   'Master Ledger Grid'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {modalType === 'all' ? 'Interactive cards for all cash-flow ledgers. Click to deep dive.' :
                   modalType === 'liquidity_bank' || modalType === 'liquidity_cash' ? 'Live closing balances directly from Tally.' :
                   'Donut chart visualization of your highest cash flow sources. Click a slice to deep dive.'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {(modalType === 'all' || modalType === 'liquidity_bank' || modalType === 'liquidity_cash') && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search ledgers..." 
                      className="pl-9 pr-4 py-2 border rounded-full bg-white dark:bg-slate-900 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                  </div>
                )}
                <button onClick={() => setModalType(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
              
              {/* ALL LEDGERS GRID */}
              {modalType === 'all' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allLedgersCombined
                    .filter((p: any) => p.name.toLowerCase().includes(modalSearch.toLowerCase()))
                    .map((p: any, i: number) => (
                    <Card key={i} className="cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:shadow-lg transition-all group" onClick={() => setSelectedLedger(p)}>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors" title={p.name}>{p.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex justify-between items-end mt-4">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Net Flow</p>
                            <p className={`text-xl font-black ${p.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCompact(p.netFlow)}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">IN: {formatCompact(p.inflow)}</p>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-rose-500">OUT: {formatCompact(p.outflow)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* LIQUIDITY ACCOUNTS GRID (Bank / Cash) */}
              {(modalType === 'liquidity_bank' || modalType === 'liquidity_cash') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(data?.liquidityAccounts || [])
                    .filter((a: any) => 
                      (modalType === 'liquidity_bank' ? a.parent_group === 'Bank Accounts' : a.parent_group === 'Cash-in-Hand') &&
                      a.name.toLowerCase().includes(modalSearch.toLowerCase())
                    )
                    .map((a: any, i: number) => (
                    <Card key={i} className={`border-0 shadow-lg ${modalType === 'liquidity_bank' ? 'bg-gradient-to-br from-blue-50 to-indigo-50/30 ring-1 ring-blue-100' : 'bg-gradient-to-br from-emerald-50 to-teal-50/30 ring-1 ring-emerald-100'} hover:shadow-xl transition-all`}>
                      <CardHeader className="p-5 pb-2">
                        <CardTitle className={`text-lg font-bold line-clamp-2 leading-snug ${modalType === 'liquidity_bank' ? 'text-blue-900' : 'text-emerald-900'}`} title={a.name}>{a.name}</CardTitle>
                        <CardDescription className="text-xs font-semibold uppercase tracking-wider">{a.parent_group}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-5 pt-4 border-t border-black/5 mt-4">
                        <div className="space-y-1">
                          <p className={`text-[11px] uppercase font-bold tracking-wider ${modalType === 'liquidity_bank' ? 'text-blue-400' : 'text-emerald-400'}`}>Current Closing Balance</p>
                          <p className={`text-3xl font-black ${modalType === 'liquidity_bank' ? 'text-blue-700' : 'text-emerald-700'}`}>{formatCurrency(Math.abs(a.closing_balance || 0))}</p>
                          {a.closing_balance < 0 && <p className="text-xs text-rose-500 font-bold mt-1">(Credit Balance / Overdraft)</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* DONUT CHARTS for INFLOW / OUTFLOW */}
              {(modalType === 'inflow' || modalType === 'outflow') && (
                <div className="h-[500px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip content={<CustomDonutTooltip />} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', maxHeight: '400px', overflowY: 'auto' }} />
                      <Pie
                        data={
                          (modalType === 'inflow' ? data?.topSources : data?.topUses)
                            ?.slice(0, 15)
                            .map((p: any) => ({ name: p.name, value: p.amount, ...p })) || []
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={100}
                        outerRadius={160}
                        paddingAngle={2}
                        dataKey="value"
                        onClick={(data) => setSelectedLedger(data.payload)}
                        className="cursor-pointer"
                      >
                        {Array.from({length: 15}).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={modalType === 'inflow' ? donutColors[index % donutColors.length] : donutColors.reverse()[index % donutColors.length]} className="hover:opacity-80 transition-opacity" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* =================================================================================================== */}
      {/* 2. LEDGER DEEP DIVE MODAL */}
      {/* =================================================================================================== */}
      {selectedLedger && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b bg-gradient-to-r from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900">
              <div>
                <Badge variant="outline" className="mb-2 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300">Ledger Deep Dive</Badge>
                <h3 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white" title={selectedLedger.name}>
                  {selectedLedger.name.length > 50 ? selectedLedger.name.substring(0, 50) + '...' : selectedLedger.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLedger(null)}
                className="p-3 rounded-full bg-white shadow-sm border hover:bg-slate-100 transition-colors text-slate-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

              <div className="flex-1 overflow-auto p-8 space-y-8 bg-slate-50/30 dark:bg-slate-900/50 custom-scrollbar">
                
                {/* Product isolated KPIs */}
              <div className="grid grid-cols-3 gap-6">
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase text-slate-400 font-bold">Total Received From</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-emerald-600">{formatCurrency(selectedLedger.inflow || selectedLedger.amount || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase text-slate-400 font-bold">Total Paid To</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-rose-600">{formatCurrency(selectedLedger.outflow || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md bg-white relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10"><Banknote className="h-24 w-24 text-indigo-600" /></div>
                  <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="text-xs uppercase text-slate-400 font-bold">Net Cash Flow</CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className={`text-4xl font-black ${(selectedLedger.netFlow || selectedLedger.amount || 0) >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                      {formatCurrency(selectedLedger.netFlow || selectedLedger.amount || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Comparative Velocity Chart */}
              <Card className="border-0 shadow-xl bg-white flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/80">
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-500" /> Historical Cash Flow</h4>
                    <p className="text-xs text-slate-500">Track and compare the monthly cash flow with this ledger.</p>
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
                      <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => formatCompact(v)} />
                      <RechartsTooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      
                      <Line type="monotone" dataKey="targetIn" name={`${selectedLedger.name.substring(0, 15)} (Received)`} stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="targetOut" name={`${selectedLedger.name.substring(0, 15)} (Paid)`} stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                      
                      {compareLedger !== 'none' && (
                        <>
                          <Line type="monotone" dataKey="compareIn" name={`${compareLedger.substring(0, 15)} (Received)`} stroke="#0ea5e9" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="compareOut" name={`${compareLedger.substring(0, 15)} (Paid)`} stroke="#eab308" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                        </>
                      )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

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
                                  <Badge variant="outline" className={tx.type === 'INFLOW' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}>
                                    {tx.voucherType}
                                  </Badge>
                                </TableCell>
                                <TableCell className={`text-xs text-right font-bold tabular-nums pr-6 ${tx.type === 'INFLOW' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                  {tx.type === 'INFLOW' ? '+' : '-'}{formatCurrency(tx.amount)}
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
                              <TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm">No transactions match your search.</TableCell>
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
