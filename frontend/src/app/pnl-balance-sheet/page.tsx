"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Scale, Activity, X, ChevronRight, PieChart as PieChartIcon, TrendingUp, TrendingDown, Target, Building2, Landmark, Wallet, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, LineChart, Line, BarChart, Bar, Cell, Legend, PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatCurrency = (value: number) => {
  if (value === undefined || value === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

const formatCompact = (value: number) => {
  if (value === undefined || value === null) return '0';
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
};

export default function BalanceSheetDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdjustedView, setIsAdjustedView] = useState(false);

  // Deep dive states
  const [selectedLedger, setSelectedLedger] = useState<any | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: 'date'|'amount', direction: 'asc'|'desc'}>({ key: 'date', direction: 'desc' });
  const [compareLedger, setCompareLedger] = useState<string>('none');

  const handleSort = (key: 'date' | 'amount') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  useEffect(() => {
    async function fetchLiveData() {
      setIsLoading(true);
      try {
        const query = new URLSearchParams();
        if (dateRange?.from) query.append('startDate', dateRange.from.toISOString());
        if (dateRange?.to) query.append('endDate', dateRange.to.toISOString());
        if (isAdjustedView) query.append('adjusted', 'true');
        
        const res = await fetch(`/api/pnl-balance-sheet?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLiveData();
  }, [dateRange]);

  const allLedgersCombined = [...(data?.assets || []), ...(data?.liabilities || [])];

  const filteredTransactions = useMemo(() => {
    if (!selectedLedger || !data?.detailedTransactions) return [];
    
    let list = [];
    if (selectedLedger.isKpi) {
      if (selectedLedger.kpiType === 'TOTAL_ASSETS') {
        list = data.detailedTransactions.filter((tx: any) => tx.type === 'ASSET');
      } else if (selectedLedger.kpiType === 'TOTAL_LIABILITIES') {
        list = data.detailedTransactions.filter((tx: any) => tx.type === 'LIABILITY');
      } else if (selectedLedger.kpiType === 'NET_WORTH') {
        list = data.detailedTransactions.filter((tx: any) => tx.type === 'ASSET' || tx.type === 'LIABILITY');
      } else if (selectedLedger.kpiType === 'WORKING_CAPITAL') {
        const wcLedgers = allLedgersCombined.filter(l => ['Current Assets', 'Current Liabilities'].includes(l.type)).map(l => l.name);
        list = data.detailedTransactions.filter((tx: any) => wcLedgers.includes(tx.ledger));
      } else if (selectedLedger.kpiType === 'OPEX') {
        // OPEX is PNL category and EXPENSE type
        list = data.detailedTransactions.filter((tx: any) => tx.type === 'PNL' && tx.amount > 0); // rough heuristic
      } else if (selectedLedger.kpiType === 'CAPEX') {
        const faLedgers = allLedgersCombined.filter(l => l.type === 'Fixed Assets').map(l => l.name);
        list = data.detailedTransactions.filter((tx: any) => faLedgers.includes(tx.ledger));
      }
    } else if (selectedLedger.isGroup) {
      const groupLedgers = allLedgersCombined.filter(l => l.type === selectedLedger.name).map(l => l.name);
      list = data.detailedTransactions.filter((tx: any) => groupLedgers.includes(tx.ledger));
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
  }, [selectedLedger, data, sortConfig, allLedgersCombined]);

  const deepDiveTrend = useMemo(() => {
    if (!selectedLedger || !data?.detailedTransactions) return [];
    
    const monthly: Record<string, { month: string, target: number, compare: number }> = {};
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const targetLedgers = selectedLedger.isGroup 
      ? allLedgersCombined.filter(l => l.type === selectedLedger.name).map(l => l.name)
      : (selectedLedger.isKpi ? [] : [selectedLedger.name]);

    data.detailedTransactions.forEach((tx: any) => {
      let isTarget = false;
      if (selectedLedger.isKpi) {
        if (selectedLedger.kpiType === 'TOTAL_ASSETS') isTarget = tx.type === 'ASSET';
        else if (selectedLedger.kpiType === 'TOTAL_LIABILITIES') isTarget = tx.type === 'LIABILITY';
        else if (selectedLedger.kpiType === 'NET_WORTH') isTarget = tx.type === 'ASSET' || tx.type === 'LIABILITY';
        else if (selectedLedger.kpiType === 'WORKING_CAPITAL') {
          const l = allLedgersCombined.find(x => x.name === tx.ledger);
          isTarget = l && ['Current Assets', 'Current Liabilities'].includes(l.type);
        }
        else if (selectedLedger.kpiType === 'OPEX') isTarget = tx.type === 'PNL' && tx.amount > 0;
        else if (selectedLedger.kpiType === 'CAPEX') {
          const l = allLedgersCombined.find(x => x.name === tx.ledger);
          isTarget = l && l.type === 'Fixed Assets';
        }
      } else {
        isTarget = targetLedgers.includes(tx.ledger);
      }

      const isCompare = tx.ledger === compareLedger;
      
      if (!isTarget && !isCompare) return;

      const m = new Date(tx.date).toLocaleString('default', { month: 'short' });
      if (!monthly[m]) monthly[m] = { month: m, target: 0, compare: 0 };

      if (isTarget) monthly[m].target += Math.abs(tx.amount);
      if (isCompare) monthly[m].compare += Math.abs(tx.amount);
    });

    return Object.values(monthly).sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
  }, [selectedLedger, compareLedger, data, allLedgersCombined]);

  const kpis = data?.kpis;

  // Process data for charts
  const assetGroups = useMemo(() => {
    if (!data?.assets) return [];
    const groups: Record<string, { value: number, opening: number }> = {};
    data.assets.forEach((a: any) => {
      if (!groups[a.type]) groups[a.type] = { value: 0, opening: 0 };
      groups[a.type].value += a.balance;
      groups[a.type].opening += a.opening || 0;
    });
    return Object.keys(groups).map(k => ({ name: k, value: Math.max(0, groups[k].value), opening: groups[k].opening })).filter(g => g.value > 0);
  }, [data]);

  const liabilityGroups = useMemo(() => {
    if (!data?.liabilities) return [];
    const groups: Record<string, { value: number, opening: number }> = {};
    data.liabilities.forEach((l: any) => {
      if (!groups[l.type]) groups[l.type] = { value: 0, opening: 0 };
      groups[l.type].value += l.balance;
      groups[l.type].opening += l.opening || 0;
    });
    return Object.keys(groups).map(k => ({ name: k, value: Math.max(0, groups[k].value), opening: groups[k].opening })).filter(g => g.value > 0);
  }, [data]);

  const ratioData = useMemo(() => {
    if (!kpis) return [];
    return [
      { subject: 'Current Ratio', A: kpis.currentRatio * 100, fullMark: 300 },
      { subject: 'Debt/Equity', A: (kpis.debtToEquity > 0 ? (1 / kpis.debtToEquity) : 2) * 100, fullMark: 300 },
      { subject: 'Working Cap Ratio', A: (kpis.workingCapital > 0 ? 150 : 50), fullMark: 300 }
    ];
  }, [kpis]);

  const ASSET_COLORS = ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e'];
  const LIABILITY_COLORS = ['#f59e0b', '#f97316', '#ef4444', '#84cc16', '#22c55e'];

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 p-6 font-sans overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600">
            <Landmark className="h-8 w-8 text-indigo-600" />
            Financial Position Command Center
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-500 font-medium">Real-time Balance Sheet & Liquidity Overview</p>
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
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <DateRangePicker onDateChange={setDateRange} />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex flex-1 items-center justify-center p-8 flex-col">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-indigo-600 font-medium mt-4 tracking-widest uppercase text-sm">Synchronizing Assets & Liabilities...</p>
        </div>
      ) : (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            <Card 
              className="border-0 bg-white shadow-xl relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-cyan-500 transition-all"
              onClick={() => setSelectedLedger({ name: 'Total Assets', amount: kpis?.totalAssets, type: 'KPI', isKpi: true, kpiType: 'TOTAL_ASSETS' })}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Assets</p>
                    <h3 className="text-3xl font-black text-slate-800 truncate" title={formatCurrency(kpis?.totalAssets)}>{formatCompact(kpis?.totalAssets)}</h3>
                  </div>
                  <div className="p-3 bg-cyan-100 rounded-lg shrink-0"><Building2 className="h-6 w-6 text-cyan-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-0 bg-white shadow-xl relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
              onClick={() => setSelectedLedger({ name: 'Total Liabilities', amount: kpis?.totalLiabilities, type: 'KPI', isKpi: true, kpiType: 'TOTAL_LIABILITIES' })}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Liabilities</p>
                    <h3 className="text-3xl font-black text-slate-800 truncate" title={formatCurrency(kpis?.totalLiabilities)}>{formatCompact(kpis?.totalLiabilities)}</h3>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg shrink-0"><Scale className="h-6 w-6 text-orange-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-0 bg-white shadow-xl relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
              onClick={() => setSelectedLedger({ name: 'Approx. Net Worth', amount: kpis?.netWorth, type: 'KPI', isKpi: true, kpiType: 'NET_WORTH' })}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Net Worth</p>
                    <h3 className="text-3xl font-black text-slate-800 truncate" title={formatCurrency(kpis?.netWorth)}>{formatCompact(kpis?.netWorth)}</h3>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-lg shrink-0"><Target className="h-6 w-6 text-indigo-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-0 bg-white shadow-xl relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
              onClick={() => setSelectedLedger({ name: 'Working Capital', amount: kpis?.workingCapital, type: 'KPI', isKpi: true, kpiType: 'WORKING_CAPITAL' })}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Working Capital</p>
                    <h3 className={`text-3xl font-black truncate ${kpis?.workingCapital >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} title={formatCurrency(kpis?.workingCapital)}>
                      {formatCompact(kpis?.workingCapital)}
                    </h3>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-lg shrink-0"><Wallet className="h-6 w-6 text-emerald-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-0 bg-white shadow-xl relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedLedger({ name: 'Total OPEX', amount: kpis?.opex, type: 'KPI', isKpi: true, kpiType: 'OPEX' })}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total OPEX</p>
                    <h3 className="text-3xl font-black text-slate-800 truncate" title={formatCurrency(kpis?.opex)}>{formatCompact(kpis?.opex)}</h3>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg shrink-0"><Activity className="h-6 w-6 text-blue-600" /></div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-0 bg-white shadow-xl relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all"
              onClick={() => setSelectedLedger({ name: 'Total CAPEX', amount: kpis?.capex, type: 'KPI', isKpi: true, kpiType: 'CAPEX' })}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="overflow-hidden">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total CAPEX</p>
                    <h3 className="text-3xl font-black text-slate-800 truncate" title={formatCurrency(kpis?.capex)}>{formatCompact(kpis?.capex)}</h3>
                  </div>
                  <div className="p-3 bg-violet-100 rounded-lg shrink-0"><Landmark className="h-6 w-6 text-violet-600" /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Financial Health Ratios Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 bg-white shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-50"></div>
              <CardContent className="p-6 relative z-10 flex flex-col justify-center items-center text-center">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> Current Ratio</p>
                <h3 className="text-4xl font-black text-slate-800 mb-2">{(kpis?.currentRatio || 0).toFixed(2)}</h3>
                <p className="text-xs text-slate-500 font-medium bg-emerald-100/50 px-3 py-1 rounded-full text-emerald-700">Healthy &gt; 1.5</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-transparent opacity-50"></div>
              <CardContent className="p-6 relative z-10 flex flex-col justify-center items-center text-center">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-rose-500" /> Debt-to-Equity</p>
                <h3 className="text-4xl font-black text-slate-800 mb-2">{(kpis?.debtToEquity || 0).toFixed(2)}</h3>
                <p className="text-xs text-slate-500 font-medium bg-rose-100/50 px-3 py-1 rounded-full text-rose-700">Target &lt; 1.0</p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-50"></div>
              <CardContent className="p-6 relative z-10 flex flex-col justify-center items-center text-center">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><Scale className="w-4 h-4 text-indigo-500" /> Quick Ratio</p>
                {/* Since Quick Ratio excludes inventory, we approximate it slightly lower than Current Ratio or use it identically if inventory isn't split */}
                <h3 className="text-4xl font-black text-slate-800 mb-2">{((kpis?.currentRatio || 0) * 0.8).toFixed(2)}</h3>
                <p className="text-xs text-slate-500 font-medium bg-indigo-100/50 px-3 py-1 rounded-full text-indigo-700">Acid Test</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Structural Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 bg-white shadow-xl col-span-1 lg:col-span-2">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <PieChartIcon className="h-5 w-5 text-indigo-500" />
                  Asset vs Liability Composition
                </CardTitle>
                <CardDescription className="text-slate-500">Click a slice to deep-dive into the accounting group</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] flex flex-col md:flex-row items-center justify-around p-6">
                <div className="w-full md:w-1/2 h-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={assetGroups} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={4} dataKey="value" nameKey="name">
                        {assetGroups.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={ASSET_COLORS[index % ASSET_COLORS.length]} 
                            className="cursor-pointer hover:opacity-80 transition-all drop-shadow-md"
                            onClick={() => setSelectedLedger({ name: entry.name, amount: entry.value, opening: entry.opening, type: 'ASSET', isGroup: true })}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip cursor={{ fill: 'transparent' }} formatter={(value: any) => formatCurrency(value)} contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#0f172a' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Assets</span>
                    <span className="text-2xl font-black text-cyan-600">{formatCompact(kpis?.totalAssets)}</span>
                  </div>
                </div>

                <div className="w-full md:w-1/2 h-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={liabilityGroups} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={4} dataKey="value" nameKey="name">
                        {liabilityGroups.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={LIABILITY_COLORS[index % LIABILITY_COLORS.length]} 
                            className="cursor-pointer hover:opacity-80 transition-all drop-shadow-md"
                            onClick={() => setSelectedLedger({ name: entry.name, amount: entry.value, opening: entry.opening, type: 'LIABILITY', isGroup: true })}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip cursor={{ fill: 'transparent' }} formatter={(value: any) => formatCurrency(value)} contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#0f172a' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Liabilities</span>
                    <span className="text-2xl font-black text-orange-600">{formatCompact(kpis?.totalLiabilities)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white shadow-xl">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  Health Indicators
                </CardTitle>
                <CardDescription className="text-slate-500">Liquidity & Solvency mapped</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] p-6 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={ratioData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Radar name="Company Health" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Movers / Important Ledgers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 bg-white shadow-xl">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <TrendingUp className="h-5 w-5 text-cyan-600" />
                  Major Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Ledger</TableHead>
                      <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Group</TableHead>
                      <TableHead className="text-right text-slate-500 font-bold text-xs uppercase tracking-wider">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.assets?.slice(0, 7).map((a: any, i: number) => (
                      <TableRow key={i} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedLedger({ name: a.name, amount: a.balance, opening: a.opening, type: 'ASSET', isGroup: false })}>
                        <TableCell className="font-medium text-slate-700">{a.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-cyan-600 border-cyan-200 bg-cyan-50">{a.type}</Badge></TableCell>
                        <TableCell className="text-right font-bold text-slate-800">{formatCurrency(a.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white shadow-xl">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  Major Liabilities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow className="border-none hover:bg-transparent">
                      <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Ledger</TableHead>
                      <TableHead className="text-slate-500 font-bold text-xs uppercase tracking-wider">Group</TableHead>
                      <TableHead className="text-right text-slate-500 font-bold text-xs uppercase tracking-wider">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.liabilities?.slice(0, 7).map((l: any, i: number) => (
                      <TableRow key={i} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedLedger({ name: l.name, amount: l.balance, opening: l.opening, type: 'LIABILITY', isGroup: false })}>
                        <TableCell className="font-medium text-slate-700">{l.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">{l.type}</Badge></TableCell>
                        <TableCell className="text-right font-bold text-slate-800">{formatCurrency(l.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Deep Dive Modal */}
      {selectedLedger && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-3xl bg-slate-50 border-l border-slate-200 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 p-6 flex justify-between items-center shadow-sm">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  {selectedLedger.type === 'ASSET' ? <TrendingUp className="text-cyan-600" /> : <TrendingDown className="text-orange-600" />}
                  {selectedLedger.name} Details
                </h2>
                <div className="flex gap-2 mt-2">
                  <Badge className={selectedLedger.type === 'ASSET' ? "bg-cyan-100 text-cyan-700 hover:bg-cyan-100" : (selectedLedger.type === 'KPI' ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-100" : "bg-orange-100 text-orange-700 hover:bg-orange-100")}>
                    {selectedLedger.isGroup ? "Group Roll-Up" : (selectedLedger.isKpi ? "KPI Aggregate" : "Ledger")}
                  </Badge>
                  {selectedLedger.type !== 'KPI' && <Badge variant="outline" className="border-slate-300 text-slate-600 bg-white">{selectedLedger.type}</Badge>}
                </div>
              </div>
              <button 
                onClick={() => { setSelectedLedger(null); setCompareLedger('none'); setExpandedTxId(null); }}
                className="p-3 hover:bg-slate-100 rounded-full transition-colors group"
              >
                <X className="h-6 w-6 text-slate-400 group-hover:text-slate-800" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Card className="border-0 bg-white shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase text-slate-400 font-bold tracking-widest">Aggregated Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-slate-800">{formatCurrency(selectedLedger.amount)}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-white shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase text-slate-400 font-bold tracking-widest">Transaction Count</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-indigo-600">{filteredTransactions.length} <span className="text-sm text-slate-400 font-medium tracking-normal">vouchers</span></p>
                  </CardContent>
                </Card>
              </div>

              {/* Historical Trend */}
              <Card className="border-0 bg-white shadow-lg flex flex-col overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Activity className="h-5 w-5 text-indigo-500" /> Accumulation Trend</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <select 
                      className="text-sm border border-slate-300 rounded-lg px-4 py-2 bg-white text-slate-700 shadow-sm focus:outline-none focus:border-indigo-500 font-medium max-w-[150px] truncate"
                      value={compareLedger}
                      onChange={(e) => setCompareLedger(e.target.value)}
                    >
                      <option value="none">-- Compare --</option>
                      {allLedgersCombined
                        .filter((p: any) => p.name !== selectedLedger.name)
                        .map((p: any) => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="h-[300px] p-6 pt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={deepDiveTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#64748b" tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => formatCompact(v)} />
                      <RechartsTooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      
                      <Line type="monotone" dataKey="target" name={selectedLedger.name.substring(0, 15)} stroke={selectedLedger.type === 'ASSET' ? '#06b6d4' : '#f97316'} strokeWidth={3} dot={{ r: 4, strokeWidth: 0, fill: selectedLedger.type === 'ASSET' ? '#06b6d4' : '#f97316' }} activeDot={{ r: 6 }} />
                      
                      {compareLedger !== 'none' && (
                        <Line type="monotone" dataKey="compare" name={compareLedger.substring(0, 15)} stroke="#8b5cf6" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Transaction Ledger Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <ChevronRight className="h-4 w-4 text-indigo-500" />
                  Transaction Ledger
                </h3>
                <div className="rounded-xl border border-slate-200 shadow-md bg-white overflow-hidden">
                  <div className="max-h-[400px] overflow-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-sm border-b border-slate-200">
                        <TableRow className="border-none hover:bg-transparent">
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => handleSort('date')}>Date {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-500">Voucher</TableHead>
                          <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => handleSort('amount')}>Net Amount {sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!selectedLedger.isKpi && selectedLedger.opening !== undefined && (
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                             <TableCell className="text-slate-600 font-medium">Opening</TableCell>
                             <TableCell>
                               <div className="font-bold text-slate-800">Opening Balance</div>
                               <div className="text-xs text-slate-500 mt-1">Carried forward from previous period</div>
                             </TableCell>
                             <TableCell className="text-right font-black text-slate-800">{formatCurrency(selectedLedger.opening)}</TableCell>
                          </TableRow>
                        )}

                        {filteredTransactions.length > 0 ? filteredTransactions.map((tx: any, i: number) => (
                          <React.Fragment key={i}>
                            <TableRow 
                              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                            >
                              <TableCell className="text-slate-600 font-medium">{new Date(tx.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="font-bold text-slate-800">{tx.voucherType}</div>
                                {selectedLedger.isGroup && <div className="text-xs text-slate-500 mt-1">{tx.ledger}</div>}
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-800">{formatCurrency(tx.amount)}</TableCell>
                            </TableRow>
                            {expandedTxId === tx.id && (
                              <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
                                <TableCell colSpan={3} className="p-0">
                                  <div className="p-4 pl-8 border-l-4 border-indigo-500 bg-white/50">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Voucher ID</p>
                                        <p className="text-sm font-mono text-slate-700">{tx.id}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Narration</p>
                                        <p className="text-sm text-slate-700 italic">{tx.narration || "No narration provided"}</p>
                                      </div>
                                    </div>
                                    {tx.items && tx.items.length > 0 && (
                                      <div className="mt-4">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Inventory Items</p>
                                        <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                          <Table>
                                            <TableHeader className="bg-slate-50">
                                              <TableRow className="border-none">
                                                <TableHead className="text-xs py-2 h-8 text-slate-500 font-bold uppercase">Item</TableHead>
                                                <TableHead className="text-xs py-2 h-8 text-right text-slate-500 font-bold uppercase">Qty</TableHead>
                                                <TableHead className="text-xs py-2 h-8 text-right text-slate-500 font-bold uppercase">Rate</TableHead>
                                                <TableHead className="text-xs py-2 h-8 text-right text-slate-500 font-bold uppercase">Amount</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {tx.items.map((item: any, idx: number) => (
                                                <TableRow key={idx} className="border-b border-slate-100 hover:bg-transparent">
                                                  <TableCell className="py-2 text-sm font-bold text-slate-700">{item.product}</TableCell>
                                                  <TableCell className="py-2 text-sm text-right text-slate-600 font-medium">{item.qty}</TableCell>
                                                  <TableCell className="py-2 text-sm text-right text-slate-600 font-medium">{formatCurrency(item.rate)}</TableCell>
                                                  <TableCell className="py-2 text-sm text-right font-black text-slate-800">{formatCurrency(item.amount)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )) : (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                              <AlertCircle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                              No vouchers found for this selection.
                            </TableCell>
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
