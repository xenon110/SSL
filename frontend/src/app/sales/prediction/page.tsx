"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Activity, TrendingUp, AlertCircle, MapPin, DollarSign, RefreshCw, CheckCircle2, Package, Sparkles, ShieldAlert, ArrowUpRight, BarChart3, HelpCircle, Layers } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';
import { Badge } from "@/components/ui/badge";

export default function SalesPrediction() {
  const [data, setData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);

  const [startDateStr, setStartDateStr] = useState<string | null>(null);
  const [endDateStr, setEndDateStr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setStartDateStr(searchParams.get('startDate'));
      setEndDateStr(searchParams.get('endDate'));
    }
  }, []);

  const fetchPredictionData = useCallback(async (force = false) => {
    try {
      if (force) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      // Construct API fetch urls passing the same date parameters
      const params = new URLSearchParams();
      if (startDateStr) params.append('startDate', startDateStr);
      if (endDateStr) params.append('endDate', endDateStr);
      
      const salesUrl = '/api/dashboard' + (params.toString() ? '?' + params.toString() : '');
      const aiUrl = '/api/sales/ai' + (params.toString() ? '?' + params.toString() : '');

      // Fetch historical sales metrics
      const histRes = await fetch(salesUrl);
      if (!histRes.ok) {
         const errText = await histRes.text().catch(() => 'No text');
         console.error('DEBUG HISTRES FAILED:', histRes.status, errText);
         throw new Error(`Failed to retrieve historical sales data. Status: ${histRes.status} Text: ${errText.substring(0, 50)}`);
      }
      const histData = await histRes.json();
      setHistoricalData(histData);

      // Fetch predictions from the AI endpoint
      const aiRes = await fetch(aiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(histData)
      });
      if (!aiRes.ok) {
        const errJson = await aiRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate AI predictions.');
      }
      const aiData = await aiRes.json();
      setData(aiData);
    } catch (err: any) {
      console.error("Prediction fetch error:", err);
      setError(err.message || 'An unexpected error occurred while generating projections.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [startDateStr, endDateStr]);

  useEffect(() => {
    fetchPredictionData();
  }, [fetchPredictionData]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);

  const formatCurrencyPrecise = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

  // Combine historical trend with AI forecasted months
  const chartData = useMemo(() => {
    if (!historicalData?.salesTrend || !data?.predictedTrend) return [];
    
    const historical = (historicalData.salesTrend || []).map((h: any) => ({
      name: h.month,
      "Historical Revenue": h.sales,
      "Forecasted Revenue": null,
      type: 'Historical'
    }));

    const forecast = (data.predictedTrend || []).map((f: any) => ({
      name: f.month,
      "Historical Revenue": null,
      "Forecasted Revenue": f.predictedSales,
      type: 'Forecast'
    }));

    // Connect the last historical data point to the first forecast data point for a continuous chart line
    const connectionPoint = historical.length > 0 ? [{
      name: historical[historical.length - 1].name,
      "Historical Revenue": historical[historical.length - 1]["Historical Revenue"],
      "Forecasted Revenue": historical[historical.length - 1]["Historical Revenue"],
      type: 'Historical'
    }] : [];

    return [...historical, ...connectionPoint, ...forecast];
  }, [historicalData, data]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-violet-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-2">Gemini AI Calculating Predictions...</h3>
          <p className="text-sm text-slate-400 max-w-sm">Generating trend projections, regional collections risk ratios, and product growth curves.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <button 
            onClick={() => window.close()} 
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-semibold mb-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2.5">
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              AI Sales Forecasting
            </h2>
            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border-violet-200">
              <Sparkles className="h-3.5 w-3.5 mr-1 animate-pulse" />
              {data?.isFallback ? "Predictive Model Active" : "Gemini AI Active"}
            </Badge>
          </div>
          {/* Active Date Range Indicator */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Historical Data Range:</span>
            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-850 text-[10px] text-slate-700 dark:text-slate-300">
              {startDateStr ? new Date(startDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'All Synced History'} 
              {" → "} 
              {endDateStr ? new Date(endDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
            </Badge>
            <span className="text-slate-300">|</span>
            <span>Predicting Period:</span>
            <Badge variant="outline" className="bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400 border-violet-100 text-[10px]">
              {data?.predictedTrend?.map((t: any) => t.month).join(', ') || 'Next 3 Months'}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPredictionData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 shadow-sm transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Recalculating...' : 'Regenerate Forecast'}
          </button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Predictive Engine Error</p>
              <p className="text-xs text-red-600/90 dark:text-red-400/90">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary KPI Projections */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><DollarSign className="w-20 h-20 text-violet-500" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-slate-400">Projected Next-Q Sales</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-indigo-600 tabular-nums">
              {formatCurrency(data?.summaryKpis?.nextQuarterSales || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Based on historical run-rates & regional growth forecasts.</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-20 h-20 text-emerald-500" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-slate-400">Forecast Growth</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-emerald-600 tabular-nums">
              +{data?.summaryKpis?.growthPercent || 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Projected expansion in active customer accounts.</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><AlertCircle className="w-20 h-20 text-rose-500" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-slate-400">Collection Risk Level</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-rose-500 flex items-center gap-1.5">
              {data?.summaryKpis?.riskLevel || 'Medium'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Evaluated from regional outstanding accounts balances.</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="w-20 h-20 text-amber-500" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-slate-400">Predicted Demand Peak</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-amber-600">
              {data?.summaryKpis?.peakMonth || 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Calculated seasonal buying cycles from ledger transactions.</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Projections Area Chart (Full Width, No Text Box) */}
      <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 w-full">
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" /> Live Revenue Trajectory (Historical vs AI Projections)
            </CardTitle>
            <CardDescription className="text-xs">Continuous area forecast showing actual synced ledger revenues transitioning into future monthly estimates.</CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500"></span> Historical</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-violet-500 border-dashed bg-violet-200"></span> Forecast (Dashed)</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="name" className="text-[10px] text-slate-400 font-medium" tickLine={false} />
                <YAxis className="text-[10px] text-slate-400 font-medium" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 10000000).toFixed(1)}Cr`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontFamily: 'inherit' }}
                  formatter={(value: any, name: any) => [formatCurrencyPrecise(value), name]}
                />
                <Area type="monotone" dataKey="Historical Revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHist)" />
                <Area type="monotone" dataKey="Forecasted Revenue" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorFore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Grid containing two advanced charts side-by-side */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 2: Regional Forecast comparison (Growth vs Risk) */}
        <Card className="border-0 shadow-xl bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" /> Regional Forecasted Growth vs collection Risk
            </CardTitle>
            <CardDescription className="text-xs">Est growth percentage mapped directly against outstanding receivables collection risk factors.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.regionalForecast || []} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="region" className="text-[9px] text-slate-400 font-semibold" tickLine={false} />
                  <YAxis className="text-[9px] text-slate-400" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [`${value}% / Score`, '']} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="predictedGrowth" name="Projected Growth %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="riskScore" name="Collection Risk Index" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Product Forecast Horizontal comparison */}
        <Card className="border-0 shadow-xl bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" /> Product Projections Demand Rate
            </CardTitle>
            <CardDescription className="text-xs">Projected next-quarter sales demand expansion rates by major product inventory lines.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data?.productPredictions || []} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis type="number" className="text-[9px] text-slate-400" tickLine={false} axisLine={false} />
                  <YAxis dataKey="product" type="category" className="text-[9px] text-slate-400 font-bold" width={100} tickLine={false} />
                  <Tooltip formatter={(value) => [`+${value}%`, 'Projected Growth']} />
                  <Bar dataKey="growthRate" name="Demand Growth Rate" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {(data?.productPredictions || []).map((entry: any, index: number) => {
                       const colors = ["#6366f1", "#10b981", "#f59e0b"];
                       return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Projections & Product Predictions Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Regional Forecast Table */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-500" /> Regional Forecast Breakdown
            </CardTitle>
            <CardDescription className="text-xs">Estimated regional performance growth rates and cash risk scores.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="text-left p-3">Region</th>
                    <th className="text-right p-3">Est Growth</th>
                    <th className="text-right p-3 font-semibold">Collection Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-600 dark:text-slate-300">
                  {(data?.regionalForecast || []).map((r: any, idx: number) => {
                    const getRiskBadge = (score: number) => {
                      if (score > 60) return <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100 text-[10px]">High Risk</Badge>;
                      if (score > 35) return <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 text-[10px]">Medium Risk</Badge>;
                      return <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 text-[10px]">Low Risk</Badge>;
                    };
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{r.region}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">+{r.predictedGrowth}%</td>
                        <td className="p-3 text-right">{getRiskBadge(r.riskScore)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Product Forecasts Table */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-500" /> Product Demand Predictions
            </CardTitle>
            <CardDescription className="text-xs">Growth trends and forecasted sales velocity ratings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="text-left p-3">Product Category</th>
                    <th className="text-left p-3">Trend Status</th>
                    <th className="text-right p-3 font-semibold">Est Demand Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-600 dark:text-slate-300">
                  {(data?.productPredictions || []).map((p: any, idx: number) => {
                    const getStatusColor = (status: string) => {
                      if (status.includes("High Growth")) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded font-bold border border-emerald-100";
                      if (status.includes("Declining")) return "text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded font-bold border border-red-100";
                      return "text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold";
                    };
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{p.product}</td>
                        <td className="p-3"><span className={getStatusColor(p.status)}>{p.status}</span></td>
                        <td className="p-3 text-right font-bold text-indigo-600">+{p.growthRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Strategic Recommendations */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <CheckCircle2 className="h-5 w-5 text-indigo-600" /> Actionable Management Recommendations
          </CardTitle>
          <CardDescription className="text-xs">Priority actions derived from risk-adjusted growth analysis to maximize collections and optimize cash-flow.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {(data?.recommendations || []).map((rec: string, idx: number) => (
            <div key={idx} className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/10 flex gap-3">
              <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center font-bold text-xs text-indigo-600 shrink-0">
                {idx + 1}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">{rec}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bottom Button to open AI Rationale Modal */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => setIsReasonModalOpen(true)}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
        >
          <HelpCircle className="h-5 w-5 text-white" />
          Why this Prediction? (View AI Rationale)
        </button>
      </div>

      {/* Reasoning Modal centered on screen */}
      {isReasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                AI Prediction Rationale & Data Logic
              </h3>
              <button 
                onClick={() => setIsReasonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  1. Forecasting Calculation Basis
                </h4>
                <p className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border text-slate-700 dark:text-slate-300 font-medium">
                  {data?.salesForecast}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  2. Outstanding Receivables & Return Risks
                </h4>
                <p className="bg-slate-50 dark:bg-slate-855 p-3 rounded-lg border text-slate-700 dark:text-slate-300 font-medium">
                  {data?.riskAssessment}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  3. Key Forecast Highlights
                </h4>
                <ul className="pl-4 list-disc space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                  {(data?.regionalHighlights || []).map((hl: string, idx: number) => (
                    <li key={idx}>{hl}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setIsReasonModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
              >
                Understood, Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
