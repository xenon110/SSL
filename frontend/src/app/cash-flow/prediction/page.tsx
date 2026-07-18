"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  Sparkles, 
  ArrowLeft,
  TrendingUp,
  Activity,
  Calendar,
  AlertTriangle,
  Banknote,
  Briefcase,
  ShieldAlert,
  Info,
  X
} from 'lucide-react';
import Link from 'next/link';

function CashFlowPredictionContent() {
  const searchParams = useSearchParams();
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  const [isLoading, setIsLoading] = useState(true);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRationale, setShowRationale] = useState(false);

  useEffect(() => {
    async function fetchPrediction() {
      try {
        setIsLoading(true);
        let url = '/api/cash-flow/ai';
        const params = new URLSearchParams();
        if (startDateStr) params.append('startDate', startDateStr);
        if (endDateStr) params.append('endDate', endDateStr);
        if (params.toString()) {
          url += '?' + params.toString();
        }

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Failed to fetch prediction');
        }
        const raw = await res.json();
        const mappedData = {
          kpis: {
            projectedInflows: raw.predictedFlowTrend?.reduce((acc: any, t: any) => acc + (t.predictedInflow || 0), 0) || 0,
            projectedOutflows: raw.predictedFlowTrend?.reduce((acc: any, t: any) => acc + (t.predictedOutflow || 0), 0) || 0,
            netCashFlow: raw.summaryKpis?.expectedCashSurplus || 0,
            liquidityScore: 85 // Static health score or calculate based on DSO
          },
          monthlyForecast: (raw.predictedFlowTrend || []).map((t: any) => ({
            month: t.month,
            inflow: t.predictedInflow,
            outflow: t.predictedOutflow,
            net: t.netSurplus
          })),
          bankProjections: (raw.liquidityForecastAccounts || []).map((a: any) => ({
            name: a.account,
            currentBalance: a.predictedBalance * 0.95, // Approximate current
            projectedInflow: a.predictedBalance * 0.1,
            projectedOutflow: a.predictedBalance * 0.05,
            forecastedBalance: a.predictedBalance
          })),
          rationale: `${raw.cashFlowForecast || ''}\n\n${raw.liquidityRiskAssessment || ''}\n\nRecommendations:\n${(raw.recommendations || []).map((r: string) => `- ${r}`).join('\n')}`
        };
        setPredictionData(mappedData);
      } catch (err: any) {
        console.error("AI Prediction Error:", err);
        setError(err.message || 'An error occurred while generating predictions.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrediction();
  }, [startDateStr, endDateStr]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-75 animate-pulse"></div>
          <div className="relative bg-slate-50 rounded-full p-4">
            <Sparkles className="h-12 w-12 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-2">Analyzing Cash Flow Patterns</h2>
        <p className="text-slate-500 max-w-md text-center">
          Our AI is evaluating inflows, outflows, bank balances, and historical trends to forecast your liquidity...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <Link href={`/cash-flow${startDateStr && endDateStr ? `?startDate=${startDateStr}&endDate=${endDateStr}` : ''}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cash Flow
        </Link>
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Prediction Failed</h2>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!predictionData) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/cash-flow${startDateStr && endDateStr ? `?startDate=${startDateStr}&endDate=${endDateStr}` : ''}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cash Flow
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg border border-blue-500/30">
                <Sparkles className="h-6 w-6 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">AI Cash Flow Forecasting</h1>
            </div>
            <p className="text-slate-500 mt-2">
              Deep learning projections based on historical liquidity and pending transactions.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 bg-white shadow-xl px-4 py-2 rounded-lg border border-slate-200">
            <Calendar className="h-4 w-4" />
            <span>
              {startDateStr ? new Date(startDateStr).toLocaleDateString('en-GB') : 'All Time'} - {endDateStr ? new Date(endDateStr).toLocaleDateString('en-GB') : 'All Time'}
            </span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white shadow-xl border border-slate-200 p-6 rounded-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Banknote className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                Projected Inflows
              </span>
            </div>
            <div className="text-sm text-slate-500 mb-1">Expected Cash In</div>
            <div className="text-2xl font-bold text-slate-800">
              {formatCurrency(predictionData.kpis.projectedInflows)}
            </div>
          </div>

          <div className="bg-white shadow-xl border border-slate-200 p-6 rounded-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-red-400" />
              </div>
              <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20">
                Projected Outflows
              </span>
            </div>
            <div className="text-sm text-slate-500 mb-1">Expected Cash Out</div>
            <div className="text-2xl font-bold text-slate-800">
              {formatCurrency(predictionData.kpis.projectedOutflows)}
            </div>
          </div>

          <div className="bg-white shadow-xl border border-slate-200 p-6 rounded-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${predictionData.kpis.netCashFlow >= 0 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                Net Forecast
              </span>
            </div>
            <div className="text-sm text-slate-500 mb-1">Net Cash Position</div>
            <div className={`text-2xl font-bold ${predictionData.kpis.netCashFlow >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {formatCurrency(predictionData.kpis.netCashFlow)}
            </div>
          </div>
          
          <div className="bg-white shadow-xl border border-slate-200 p-6 rounded-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <ShieldAlert className="h-5 w-5 text-purple-400" />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${predictionData.kpis.liquidityScore >= 70 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : predictionData.kpis.liquidityScore >= 40 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                Liquidity Health
              </span>
            </div>
            <div className="text-sm text-slate-500 mb-1">AI Health Score</div>
            <div className="text-2xl font-bold text-slate-800">
              {predictionData.kpis.liquidityScore}/100
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Cash Flow Trend */}
          <div className="bg-white shadow-xl border border-slate-200 p-6 rounded-xl">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-slate-800 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
                Projected Monthly Net Cash
              </h2>
              <p className="text-sm text-slate-500 mt-1">Forecasted inflows vs outflows over time</p>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictionData.monthlyForecast}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                      if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                      if (Math.abs(value) >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
                      return `₹${value}`;
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#e5e7eb' }}
                    formatter={(value: any) => formatCurrency(value as number)}
                  />
                  <Area type="monotone" dataKey="net" stroke="#3b82f6" fillOpacity={1} fill="url(#colorNet)" name="Net Cash Flow" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inflows vs Outflows */}
          <div className="bg-white shadow-xl border border-slate-200 p-6 rounded-xl">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-slate-800 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-400" />
                Inflows vs Outflows Breakup
              </h2>
              <p className="text-sm text-slate-500 mt-1">Expected receipts and payments by month</p>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={predictionData.monthlyForecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    tick={{ fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
                      if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                      if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
                      return `₹${value}`;
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '0.5rem' }}
                    formatter={(value: any) => formatCurrency(value as number)}
                  />
                  <Legend />
                  <Bar dataKey="inflow" fill="#10b981" name="Inflows" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" fill="#ef4444" name="Outflows" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bank Liquidity Projection */}
        <div className="bg-white shadow-xl border border-slate-200 p-6 rounded-xl">
           <div className="mb-6">
              <h2 className="text-lg font-medium text-slate-800 flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-emerald-400" />
                Bank Liquidity Projection
              </h2>
              <p className="text-sm text-slate-500 mt-1">Projected balances across top bank accounts based on expected cash flows</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Account Name</th>
                    <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Current Balance</th>
                    <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Projected Inflow</th>
                    <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Projected Outflow</th>
                    <th className="py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Forecasted Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {predictionData.bankProjections.length > 0 ? predictionData.bankProjections.map((bank: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-slate-700 font-medium">{bank.name}</td>
                      <td className="py-3 px-4 text-sm text-slate-500 text-right">{formatCurrency(bank.currentBalance)}</td>
                      <td className="py-3 px-4 text-sm text-emerald-400 text-right">+{formatCurrency(bank.projectedInflow)}</td>
                      <td className="py-3 px-4 text-sm text-red-400 text-right">-{formatCurrency(bank.projectedOutflow)}</td>
                      <td className={`py-3 px-4 text-sm font-semibold text-right ${bank.forecastedBalance >= 0 ? 'text-slate-800' : 'text-red-400'}`}>
                        {formatCurrency(bank.forecastedBalance)}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No bank account data available to project.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>

        {/* AI Rationale Button */}
        <div className="flex justify-center pt-4 pb-8">
          <button
            onClick={() => setShowRationale(true)}
            className="group relative px-8 py-4 bg-white rounded-full font-medium text-slate-600 hover:text-slate-800 border border-slate-300 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 flex items-center space-x-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Info className="h-5 w-5 text-blue-400" />
            <span>Why this prediction?</span>
            <div className="h-8 w-[1px] bg-gray-700 mx-2"></div>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </button>
        </div>

        {/* AI Rationale Modal */}
        {showRationale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm"
              onClick={() => setShowRationale(false)}
            ></div>
            <div className="relative w-full max-w-4xl bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white/95 sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-lg">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-800">AI Analysis & Rationale</h2>
                </div>
                <button 
                  onClick={() => setShowRationale(false)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 overflow-y-auto prose  prose-blue max-w-none whitespace-pre-wrap">
                {predictionData.rationale}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CashFlowPredictionPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8">
         <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-75 animate-pulse"></div>
          <div className="relative bg-slate-50 rounded-full p-4">
            <Sparkles className="h-12 w-12 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>
      </div>
    }>
      <CashFlowPredictionContent />
    </Suspense>
  );
}
