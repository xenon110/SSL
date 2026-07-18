"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Activity, TrendingUp, AlertCircle, RefreshCw, CheckCircle2, Package, Sparkles, ShieldAlert, BarChart3, HelpCircle, Layers, Users, TrendingDown, ArrowUpRight, Clock, HandCoins } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';
import { Badge } from "@/components/ui/badge";

export default function OutstandingsPrediction() {
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

      const params = new URLSearchParams();
      if (startDateStr) params.append('startDate', startDateStr);
      if (endDateStr) params.append('endDate', endDateStr);
      
      const outstandingsUrl = '/api/outstandings' + (params.toString() ? '?' + params.toString() : '');
      const aiUrl = '/api/outstandings/ai' + (params.toString() ? '?' + params.toString() : '');

      // Fetch historical outstandings KPIs
      const histRes = await fetch(outstandingsUrl);
      if (!histRes.ok) throw new Error('Failed to retrieve historical accounts outstandings.');
      const histData = await histRes.json();
      setHistoricalData(histData);

      // Fetch AI projections
      const aiRes = await fetch(aiUrl);
      if (!aiRes.ok) {
        const errJson = await aiRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate AI collection forecasts.');
      }
      const aiData = await aiRes.json();
      setData(aiData);
    } catch (err: any) {
      console.error("Outstandings prediction fetch error:", err);
      setError(err.message || 'An unexpected error occurred while generating credit collection forecasts.');
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

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-2">Gemini AI Estimating Credit Defaults...</h3>
          <p className="text-sm text-slate-400 max-w-sm">Evaluating Sundry Debtors aging velocity and calculating dunning dso predictions.</p>
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
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              AI Credit & Collection Predictions
            </h2>
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200">
              <Sparkles className="h-3.5 w-3.5 mr-1 animate-pulse" />
              {data?.isFallback ? "Predictive Model Active" : "Gemini AI Active"}
            </Badge>
          </div>
          {/* Active Date Range Indicator */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Snapshot Cumulative Date:</span>
            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-850 text-[10px] text-slate-700 dark:text-slate-300">
              Up To {endDateStr ? new Date(endDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
            </Badge>
            <span className="text-slate-300">|</span>
            <span>Forecast Recovery Horizon:</span>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-100 text-[10px]">
              {data?.predictedCollectionTrend?.map((t: any) => t.month).join(', ') || 'Next 3 Months'}
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
          <div className="absolute top-0 right-0 p-4 opacity-5"><HandCoins className="w-20 h-20 text-indigo-500" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-slate-400">Expected Recovery cash</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-indigo-600 tabular-nums">
              {formatCurrency(data?.summaryKpis?.expectedRecoveryAmt || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Projected debtor collections over the next 90 days.</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldAlert className="w-20 h-20 text-rose-500" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-slate-400">Est. Bad Debt Write-offs</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-rose-500 tabular-nums">
              {formatCurrency(data?.summaryKpis?.estimatedBadDebtRisk || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Forecasted unrecoverable debt based on aging buckets.</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Clock className="w-20 h-20 text-amber-500" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-slate-400">Predicted Target DSO</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-amber-600">
              {data?.summaryKpis?.projectedDso || 0} Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Days Sales Outstanding expected with optimized follow-ups.</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="w-20 h-20 text-emerald-500" /></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold tracking-wider text-slate-400">Recovery Efficiency</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-emerald-600">
              {data?.summaryKpis?.efficiencyScore || 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Performance rating of billing collection workflows.</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart 1: Cash flow Netting prediction curve */}
      <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 w-full">
        <CardHeader className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" /> Treasury Cash Recovery vs Outflow Forecast
            </CardTitle>
            <CardDescription className="text-xs">Projected debtor collections (inflow) vs creditor payment plans (outflow) over the next 90 days.</CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Inflow</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-550 bg-rose-500"></span> Outflow</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-indigo-500 border-dashed bg-indigo-100"></span> Net Surplus</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.predictedCollectionTrend || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis dataKey="month" className="text-[10px] text-slate-400 font-semibold" tickLine={false} />
                <YAxis className="text-[10px] text-slate-400 font-medium" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 10000000).toFixed(1)}Cr`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontFamily: 'inherit' }}
                  formatter={(value: any, name: any) => [formatCurrencyPrecise(value), name === 'projectedCollection' ? 'Debtor Collection' : (name === 'projectedOutflow' ? 'Supplier Payment' : 'Net Cash Netting')]}
                />
                <Area type="monotone" dataKey="projectedCollection" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInflow)" />
                <Area type="monotone" dataKey="projectedOutflow" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorOutflow)" />
                <Area type="monotone" dataKey="cashNet" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Grid containing two advanced charts side-by-side */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 2: Ageing Reduction Projection (Current vs Predicted) */}
        <Card className="border-0 shadow-xl bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" /> Predicted Overdue Ageing Reduction
            </CardTitle>
            <CardDescription className="text-xs">Visualizing how active credit limits dunning terms will shrink unpaid debt buckets.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.ageingReduction || []} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="bucket" className="text-[10px] text-slate-400 font-semibold" tickLine={false} />
                  <YAxis className="text-[9px] text-slate-400" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), '']} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="current" name="Current Aging Balances" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="predicted" name="Predicted Aging Balances" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Debtor Credit Risk Index scores */}
        <Card className="border-0 shadow-xl bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" /> Top Customer Credit Risk Profile
            </CardTitle>
            <CardDescription className="text-xs">Assessing delinquency risk index values (0-100) based on oldest outstanding bills.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data?.debtorRiskList || []} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis type="number" className="text-[9px] text-slate-400" tickLine={false} axisLine={false} domain={[0, 100]} />
                  <YAxis dataKey="debtor" type="category" className="text-[9px] text-slate-400 font-bold" width={100} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value}/100`, 'Risk Index']} />
                  <Bar dataKey="riskScore" name="Risk Index Rating" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {(data?.debtorRiskList || []).map((entry: any, index: number) => {
                       const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6"];
                       return <Cell key={`cell-${index}`} fill={entry.riskScore > 75 ? "#f43f5e" : (entry.riskScore > 40 ? "#fbbf24" : "#10b981")} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debtor Credit Risk profile Table */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" /> Debtors Credit Risk Breakdown
          </CardTitle>
          <CardDescription className="text-xs">Predicted collection recovery timeline and remarks for major accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="text-left p-3">Debtor Ledger</th>
                  <th className="text-right p-3">Collection Risk Rating</th>
                  <th className="text-right p-3">Est. Recovery Delay</th>
                  <th className="text-left p-3 pl-8">Dunning Status Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-600 dark:text-slate-300">
                {(data?.debtorRiskList || []).map((d: any, idx: number) => {
                  const getRiskBadge = (score: number) => {
                    if (score > 70) return <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100 text-[10px]">Critical Default Risk</Badge>;
                    if (score > 40) return <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 text-[10px]">Moderate Concern</Badge>;
                    return <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 text-[10px]">Low Credit Risk</Badge>;
                  };
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{d.debtor}</td>
                      <td className="p-3 text-right">{getRiskBadge(d.riskScore)}</td>
                      <td className="p-3 text-right font-bold text-indigo-600">~{d.expectedRecoveryDays} Days</td>
                      <td className="p-3 text-left pl-8 text-slate-500 font-semibold">{d.comment}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Actionable Strategic Recommendations */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <CheckCircle2 className="h-5 w-5 text-indigo-600" /> Actionable Cash Recovery Recommendations
          </CardTitle>
          <CardDescription className="text-xs">Optimizing cash inflow netting and protecting corporate treasury balances.</CardDescription>
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
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
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
                AI Collection Projections Logic
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
                  1. Forecasting Cash Recovery Basis
                </h4>
                <p className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border text-slate-700 dark:text-slate-300 font-medium">
                  {data?.collectionForecast}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                  2. Debtors Ageing Concerns & Default Risk
                </h4>
                <p className="bg-slate-50 dark:bg-slate-855 p-3 rounded-lg border text-slate-700 dark:text-slate-300 font-medium">
                  {data?.creditRiskAssessment}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  3. Collection Velocity & DSO Logic
                </h4>
                <ul className="pl-4 list-disc space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                  {(data?.rationales || []).map((hl: string, idx: number) => (
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
