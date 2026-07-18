"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { format, subDays, subMonths, startOfMonth, endOfMonth, subYears } from "date-fns";
import { 
  ArrowDownRight, ArrowUpRight, ArrowRightLeft, AlertTriangle, 
  RefreshCcw, Info, Lightbulb, Sparkles, TrendingUp,
  ShoppingCart, Activity, Banknote
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area, Legend
} from 'recharts';

export default function CompareDashboard() {
  const [granularity, setGranularity] = useState('Month');
  const [aStart, setAStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [aEnd, setAEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [bStart, setBStart] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [bEnd, setBEnd] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [normalize, setNormalize] = useState(false);
  const [company, setCompany] = useState('SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)');

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const params = new URLSearchParams({ aStart, aEnd, bStart, bEnd, company });
      const res = await fetch(`/api/compare?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Determine if periods are unequal length
    const dA = new Date(aEnd).getTime() - new Date(aStart).getTime();
    const dB = new Date(bEnd).getTime() - new Date(bStart).getTime();
    if (Math.abs(dA - dB) > 86400000) { // more than 1 day difference
      setNormalize(true);
    }
  }, [aStart, aEnd, bStart, bEnd]);

  const handleFetch = () => fetchData();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getMetric = (key: string, statsObj: any, days: number, isSnapshot = false) => {
    const val = statsObj[key] || 0;
    if (normalize && !isSnapshot) {
      return val / days;
    }
    return val;
  };

  const renderKPI = (title: string, factorKey: string, isSnapshot = false) => {
    if (!data) return null;
    const { periodA, periodB, deltas } = data;
    
    const valA = getMetric(factorKey, periodA.stats, periodA.days, isSnapshot);
    const valB = getMetric(factorKey, periodB.stats, periodB.days, isSnapshot);
    const absDiff = valA - valB;
    const percDiff = valB === 0 ? 0 : (absDiff / Math.abs(valB)) * 100;
    
    const isPositive = absDiff >= 0;

    const icons: any = {
      'K3': <TrendingUp className="h-5 w-5 text-emerald-500" />,
      'K6': <ShoppingCart className="h-5 w-5 text-rose-500" />,
      'K15': <Activity className="h-5 w-5 text-indigo-500" />,
      'K16': <ArrowDownRight className="h-5 w-5 text-emerald-500" />,
      'K18': <Banknote className="h-5 w-5 text-blue-500" />,
      'K23': <AlertTriangle className="h-5 w-5 text-amber-500" />
    };

    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-100 transition-opacity group-hover:opacity-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-white opacity-0 transition-opacity group-hover:opacity-100" />
        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-slate-500">{title} {normalize && !isSnapshot ? '(Per Day)' : ''}</p>
            {icons[factorKey]}
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(valA)}</h3>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
             <span className="text-slate-400 font-medium">vs {formatCurrency(valB)}</span>
             <Badge variant="outline" className={`border-0 ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {isPositive ? '+' : ''}{percDiff.toFixed(1)}%
             </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderWaterfall = () => {
    if (!data) return null;
    const { periodA, periodB } = data;
    const pb = periodB.stats;
    const pa = periodA.stats;

    const dSales = pa.K3 - pb.K3;
    const dCOGS = -(pa.K14 - pb.K14); // COGS increase is negative profit
    const dDirectExp = -(pa.K10 - pb.K10);
    const dIndirectExp = -(pa.K11 - pb.K11);
    const dOtherIncome = (pa.K8 + pa.K9) - (pb.K8 + pb.K9);
    
    const waterfallData = [
      { name: 'Profit B', value: pb.K15, isTotal: true },
      { name: 'Δ Sales', value: dSales },
      { name: 'Δ COGS', value: dCOGS },
      { name: 'Δ D.Exp', value: dDirectExp },
      { name: 'Δ I.Exp', value: dIndirectExp },
      { name: 'Δ Other Inc', value: dOtherIncome },
      { name: 'Profit A', value: pa.K15, isTotal: true }
    ];

    let running = 0;
    const chartData = waterfallData.map((item, idx) => {
      if (item.isTotal) {
        running = item.value;
        return { name: item.name, Total: item.value, value: item.value };
      }
      const start = running;
      running += item.value;
      return { 
        name: item.name, 
        Start: Math.min(start, running), 
        End: Math.max(start, running), 
        Change: item.value,
        isPositive: item.value >= 0
      };
    });

    return (
      <Card className="col-span-full border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex justify-between">
            Net Profit Walk
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Change" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  if (entry.Total !== undefined) return null;
                  return <Cell key={`cell-${index}`} fill={entry.isPositive ? '#10b981' : '#f43f5e'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderDivergence = (title: string, topDrivers: any[]) => {
    if (!topDrivers || topDrivers.length === 0) return null;
    return (
      <Card className="border-0 shadow-md h-full">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
           <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={topDrivers.map(d => ({ name: d[0], value: d[1] }))} margin={{ left: 80, right: 20, top: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" fontSize={11} stroke="#94a3b8" tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
              <YAxis type="category" dataKey="name" width={80} fontSize={10} stroke="#94a3b8" />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <ReferenceLine x={0} stroke="#cbd5e1" />
              <Bar dataKey="value" radius={4}>
                {topDrivers.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry[1] >= 0 ? '#10b981' : '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderTrendChart = () => {
    if (!data) return null;
    const { periodA, periodB } = data;
    
    // Combine arrays side-by-side
    const maxDays = Math.max(periodA.days, periodB.days);
    const trendData = Array.from({ length: maxDays }).map((_, i) => ({
      day: `Day ${i + 1}`,
      periodA: periodA.trend[i] || 0,
      periodB: periodB.trend[i] || 0,
    }));

    return (
      <Card className="col-span-full border-0 shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex justify-between items-center text-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Sales Velocity Overlay (Day-by-Day)
            </div>
            <span className="text-xs font-normal text-slate-500">Period A vs Period B</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" fontSize={11} stroke="#94a3b8" tickCount={10} minTickGap={30} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" name="Period B" dataKey="periodB" stroke="#94a3b8" fillOpacity={1} fill="url(#colorB)" strokeWidth={2} />
              <Area type="monotone" name="Period A" dataKey="periodA" stroke="#6366f1" fillOpacity={1} fill="url(#colorA)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-8 space-y-6 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ArrowRightLeft className="h-8 w-8 text-indigo-600" />
            Compare
          </h1>
          <p className="text-slate-500 mt-1">Cross-period factors, statistics, and insights</p>
        </div>
        
        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
          <div className="flex flex-col px-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Period A</span>
            <div className="flex gap-2 mt-1">
              <Input type="date" className="h-8 text-sm" value={aStart} onChange={e => setAStart(e.target.value)} />
              <Input type="date" className="h-8 text-sm" value={aEnd} onChange={e => setAEnd(e.target.value)} />
            </div>
          </div>
          <div className="w-px h-10 bg-slate-200 hidden md:block"></div>
          <div className="flex flex-col px-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Period B</span>
            <div className="flex gap-2 mt-1">
              <Input type="date" className="h-8 text-sm" value={bStart} onChange={e => setBStart(e.target.value)} />
              <Input type="date" className="h-8 text-sm" value={bEnd} onChange={e => setBEnd(e.target.value)} />
            </div>
          </div>
          <div className="w-px h-10 bg-slate-200 hidden lg:block"></div>
          <div className="flex items-center gap-2 px-2">
            <Switch checked={normalize} onCheckedChange={setNormalize} id="normalize-mode" />
            <label htmlFor="normalize-mode" className="text-sm font-medium text-slate-700">Per-Day Normalized</label>
          </div>
          <Button onClick={handleFetch} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 h-9">
            {isLoading ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            Compare
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-lg flex items-center border border-rose-200">
          <AlertTriangle className="h-5 w-5 mr-3" />
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Insights Panel */}
          {data.insights && data.insights.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-indigo-900">Deterministic Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.insights.map((insight: any, i: number) => (
                  <div key={i} className={`p-4 rounded-lg bg-white border ${insight.type === 'warning' ? 'border-amber-200 shadow-amber-100/50' : insight.type === 'negative' ? 'border-rose-200 shadow-rose-100/50' : 'border-emerald-200 shadow-emerald-100/50'} shadow-sm`}>
                    <div className="flex items-start gap-3">
                      {insight.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" /> : 
                       insight.type === 'negative' ? <ArrowDownRight className="h-5 w-5 text-rose-500 mt-0.5" /> :
                       <ArrowUpRight className="h-5 w-5 text-emerald-500 mt-0.5" />}
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{insight.metric}</h4>
                        <p className="text-xs text-slate-500 mt-1 mb-2 font-mono">{insight.rule}</p>
                        <p className="text-sm text-slate-700 leading-snug">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderKPI('Net Sales', 'K3', false)}
            {renderKPI('Total Purchases', 'K6', false)}
            {renderKPI('Net Profit (Approx)', 'K15', false)}
            {renderKPI('Cash Inflow', 'K16', false)}
            {renderKPI('Cash & Bank (Closing)', 'K18', true)}
            {renderKPI('Receivables Out', 'K23', true)}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderWaterfall()}
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {renderTrendChart()}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderDivergence('Top Product Movers (Sales)', data.periodA.drivers.topSalesProd)}
            {renderDivergence('Top Expense Drivers', data.periodA.drivers.topExpenses)}
          </div>
        </div>
      )}
    </div>
  );
}
