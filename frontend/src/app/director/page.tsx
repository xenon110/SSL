"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AlertTriangle, RefreshCw, BrainCircuit, TrendingUp, TrendingDown, Database, DollarSign, Calendar as CalendarIcon, Briefcase, Target, Shield, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DirectorPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/universal-metrics?type=director');
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch data");
      }
      
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse bg-[#fafbfc] min-h-screen">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[450px] mt-6">
          <div className="bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6 bg-[#fafbfc]">
        <div className="bg-red-50 p-6 rounded-3xl max-w-md border border-red-100 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Live Data Yet</h3>
          <p className="text-slate-600 mb-6 text-sm">{error}</p>
          <Button onClick={fetchMetrics} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
            <RefreshCw className="w-4 h-4 mr-2" /> Check Again
          </Button>
        </div>
      </div>
    );
  }

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatShortCurrency = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    if (abs >= 10000000) return `₹${sign}${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `₹${sign}${(abs / 100000).toFixed(2)} L`;
    return `₹${sign}${abs.toLocaleString('en-IN')}`;
  };

  // Data Extraction
  const ebitda = data["EBITDA"] || 0;
  const netProfit = data["Net Profit"] || 0;
  const debtEquity = data["Debt-Equity Ratio"] || 0;
  const netWorth = data["Net Worth"] || 0;
  
  const capStruct = data["Capital Structure"] || {};
  const totalEquity = capStruct["Total Equity"] || 0;
  const totalDebt = capStruct["Total Debt"] || 0;

  const profOverview = data["Profitability Overview"] || {};

  // Chart Data
  const capPieData = [
    { name: "Total Equity", value: Math.abs(totalEquity), realValue: totalEquity, color: "#6366f1" },
    { name: "Total Debt", value: Math.abs(totalDebt), realValue: totalDebt, color: "#f43f5e" }
  ].filter(d => d.value > 0);

  const profBarData = [
    { name: "Gross Profit", value: profOverview["Gross Profit"] || 0, color: "#10b981" },
    { name: "EBITDA", value: profOverview["EBITDA"] || 0, color: "#f59e0b" },
    { name: "Net Profit", value: profOverview["Net Profit"] || 0, color: "#3b82f6" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-[#fafbfc] min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-600/20">
              <BrainCircuit className="h-7 w-7" />
            </div>
            Director Decision Panel
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20"></span>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Live Executive Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl shadow-sm">
          <CalendarIcon className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-700">FY 2024 - 2025</span>
        </div>
      </div>

      {/* Top 4 KPI Cards - Premium Dark/Glass Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* EBITDA */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-50 rounded-full blur-3xl group-hover:bg-amber-100 transition-colors"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Operating Perf.</p>
              <h3 className="text-sm font-extrabold text-slate-800">EBITDA</h3>
            </div>
            <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-1 relative z-10">{formatCurrency(ebitda)}</h2>
        </div>

        {/* Net Profit */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-50 rounded-full blur-3xl group-hover:bg-emerald-100 transition-colors"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bottom Line</p>
              <h3 className="text-sm font-extrabold text-slate-800">Net Profit</h3>
            </div>
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <h2 className={`text-3xl font-black mb-1 relative z-10 ${netProfit < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatCurrency(netProfit)}
          </h2>
        </div>

        {/* Debt Equity */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-rose-50 rounded-full blur-3xl group-hover:bg-rose-100 transition-colors"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Risk Metric</p>
              <h3 className="text-sm font-extrabold text-slate-800">Debt-Equity Ratio</h3>
            </div>
            <div className="bg-rose-100 text-rose-600 p-3 rounded-2xl">
              <Shield className="h-5 w-5" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-1 relative z-10">{debtEquity}</h2>
        </div>

        {/* Net Worth */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800 rounded-[2rem] p-6 shadow-xl shadow-indigo-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">Company Value</p>
              <h3 className="text-sm font-extrabold text-white">Net Worth</h3>
            </div>
            <div className="bg-white/10 backdrop-blur-md text-white p-3 rounded-2xl border border-white/10">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white mb-1 relative z-10">{formatCurrency(netWorth)}</h2>
        </div>

      </div>

      {/* Deep Dive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        
        {/* Capital Structure */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Capital Structure</h3>
                <p className="text-sm font-medium text-slate-500">Debt vs Equity Distribution</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="h-[280px] w-full md:w-1/2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={capPieData}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                  >
                    {capPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: any, props: any) => [formatShortCurrency(props.payload.realValue), name]}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Cap</span>
                <span className="text-xl font-black text-slate-900">{formatShortCurrency(totalEquity + totalDebt)}</span>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 space-y-6">
              {capPieData.map((item, i) => {
                const pct = (totalEquity + totalDebt) > 0 ? ((item.value / (Math.abs(totalEquity) + Math.abs(totalDebt))) * 100).toFixed(1) : "0";
                return (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        <p className="text-lg font-black" style={{ color: item.color }}>{pct}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-slate-900">{formatShortCurrency(item.realValue)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Profitability Overview */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Profitability Funnel</h3>
                <p className="text-sm font-medium text-slate-500">Gross to Net Analysis</p>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profBarData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} tickFormatter={(v) => formatShortCurrency(v)} />
                <Tooltip 
                  formatter={(val: any) => [formatCurrency(val), "Amount"]}
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={50}>
                  {profBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value < 0 ? '#f43f5e' : entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
