"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AlertTriangle, RefreshCw, Briefcase, TrendingUp, Shield, Database, Calendar as CalendarIcon, Download, DollarSign, Activity, CreditCard, Wallet } from "lucide-react";
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
      <div className="p-8 space-y-4 animate-pulse bg-slate-50 min-h-screen">
        <div className="h-8 w-48 bg-slate-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-28 bg-slate-200 rounded-lg border border-slate-200"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px] mt-4">
          <div className="bg-slate-200 rounded-lg border border-slate-200"></div>
          <div className="bg-slate-200 rounded-lg border border-slate-200"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6 bg-slate-50">
        <div className="bg-white p-6 rounded-lg max-w-md border border-slate-200 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-900 mb-2">No Live Data Yet</h3>
          <p className="text-slate-500 mb-6 text-sm">{error}</p>
          <Button onClick={fetchMetrics} className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
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
      maximumFractionDigits: 0
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
  const totalRevenue = data["Total Revenue"] || 0;
  const totalExpenses = data["Total Expenses"] || 0;
  const ebitda = data["EBITDA"] || 0;
  const netProfit = data["Net Profit"] || 0;
  const cashBalance = data["Cash Balance"] || 0;
  const workingCapital = data["Working Capital"] || 0;
  const receivables = data["Receivables"] || 0;
  const payables = data["Payables"] || 0;
  
  const capStruct = data["Capital Structure"] || {};
  const totalEquity = capStruct["Total Equity"] || 0;
  const totalDebt = capStruct["Total Debt"] || 0;

  const profOverview = data["Profitability Overview"] || {};

  // Chart Data (Professional Color Palette)
  const capPieData = [
    { name: "Total Equity", value: Math.abs(totalEquity), realValue: totalEquity, color: "#115e59" },
    { name: "Total Debt", value: Math.abs(totalDebt), realValue: totalDebt, color: "#0ea5e9" }
  ].filter(d => d.value > 0);

  const profBarData = [
    { name: "Gross Profit", value: profOverview["Gross Profit"] || 0, color: "#0f766e" },
    { name: "EBITDA", value: profOverview["EBITDA"] || 0, color: "#eab308" },
    { name: "Net Profit", value: profOverview["Net Profit"] || 0, color: "#0369a1" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto bg-slate-50 min-h-screen font-sans">
      
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Director Decision Panel</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Corporate Financial Overview • YTD</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-xs text-slate-600 font-medium">
            <CalendarIcon className="h-3.5 w-3.5" />
            FY 2024 - 2025
          </div>
          <button className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Now 8 dense cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-28 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600 rounded-l-lg"></div>
          <div className="flex justify-between items-start pl-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</h3>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <div className="pl-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {formatShortCurrency(totalRevenue)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Total Operating Income</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-28 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 rounded-l-lg"></div>
          <div className="flex justify-between items-start pl-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</h3>
            <CreditCard className="h-4 w-4 text-slate-400" />
          </div>
          <div className="pl-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {formatShortCurrency(totalExpenses)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Total Operating Costs</p>
          </div>
        </div>

        {/* EBITDA */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-28 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 rounded-l-lg"></div>
          <div className="flex justify-between items-start pl-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">EBITDA</h3>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </div>
          <div className="pl-2">
            <h2 className={`text-2xl font-bold tracking-tight ${ebitda < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatShortCurrency(ebitda)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Operating Profitability</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-28 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-sky-600 rounded-l-lg"></div>
          <div className="flex justify-between items-start pl-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Profit</h3>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="pl-2">
            <h2 className={`text-2xl font-bold tracking-tight ${netProfit < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatShortCurrency(netProfit)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Total Bottom Line</p>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-28 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-teal-600 rounded-l-lg"></div>
          <div className="flex justify-between items-start pl-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Balance</h3>
            <Wallet className="h-4 w-4 text-slate-400" />
          </div>
          <div className="pl-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {formatShortCurrency(cashBalance)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Total Cash & Bank</p>
          </div>
        </div>

        {/* Working Capital */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-28 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-lg"></div>
          <div className="flex justify-between items-start pl-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Working Capital</h3>
            <Shield className="h-4 w-4 text-slate-400" />
          </div>
          <div className="pl-2">
            <h2 className={`text-2xl font-bold tracking-tight ${workingCapital < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {formatShortCurrency(workingCapital)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Operational Liquidity</p>
          </div>
        </div>

        {/* Receivables */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-28 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500 rounded-l-lg"></div>
          <div className="flex justify-between items-start pl-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receivables</h3>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </div>
          <div className="pl-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {formatShortCurrency(receivables)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Pending Inward</p>
          </div>
        </div>

        {/* Payables */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-28 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 rounded-l-lg"></div>
          <div className="flex justify-between items-start pl-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payables</h3>
            <Database className="h-4 w-4 text-slate-400" />
          </div>
          <div className="pl-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {formatShortCurrency(payables)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Pending Outward</p>
          </div>
        </div>

      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Capital Structure */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Capital Structure Analysis</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col md:flex-row items-center gap-6">
            <div className="h-[220px] w-full md:w-1/2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={capPieData}
                    cx="50%" cy="50%"
                    innerRadius={65} outerRadius={85}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {capPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: any, props: any) => [formatCurrency(props.payload.realValue), name]}
                    contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total Capital</span>
                <span className="text-sm font-bold text-slate-800">{formatShortCurrency(totalEquity + totalDebt)}</span>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 flex flex-col justify-center gap-3">
              {capPieData.map((item, i) => {
                const pct = (totalEquity + totalDebt) > 0 ? ((item.value / (Math.abs(totalEquity) + Math.abs(totalDebt))) * 100).toFixed(1) : "0";
                return (
                  <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                      <span className="text-xs font-medium text-slate-600">{item.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold text-slate-800">{formatShortCurrency(item.realValue)}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Profitability Overview */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Profitability Waterfall</h3>
          </div>
          <div className="p-4 flex-1 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              {/* FIXED MARGINS SO Y-AXIS LABELS DON'T CUT OFF */}
              <BarChart data={profBarData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={true} stroke="#cbd5e1" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis width={60} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => formatShortCurrency(v)} />
                <Tooltip 
                  formatter={(val: any) => [formatCurrency(val), "Amount"]}
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="value" barSize={32}>
                  {profBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value < 0 ? '#e11d48' : entry.color} />
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
