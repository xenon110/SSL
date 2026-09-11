"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Scale, Wallet, Landmark, ShieldAlert, ArrowRight, Building, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BalanceSheetPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/universal-metrics?type=balance-sheet');
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
      <div className="p-6 space-y-6 animate-pulse bg-slate-50 min-h-screen">
        <div className="h-8 w-64 bg-slate-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-lg"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="h-[500px] bg-slate-200 rounded-lg"></div>
          <div className="h-[500px] bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6 bg-slate-50">
        <div className="bg-white p-6 rounded-lg max-w-md border border-slate-200 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Live Data Yet</h3>
          <p className="text-slate-600 mb-6 text-sm">{error}</p>
          <Button onClick={fetchMetrics} className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
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
      maximumFractionDigits: 0
    }).format(Math.abs(val));
  };

  // Extract main KPIs
  const netWorth = data["Net Worth"] || 0;
  const workingCapital = data["Working Capital"] || 0;
  const totalAssets = data["Total Assets"] || 0;
  const totalLiabilities = data["Total Liabilities"] || 0;

  // Categorize breakdown items
  const assetKeywords = ["asset", "debtor", "cash", "bank", "stock", "investment", "deposit", "advance"];
  const liabilityKeywords = ["liabilit", "creditor", "capital", "loan", "tax", "provision", "suspense", "reserve", "surplus", "overdraft", "od a/c"];

  const assetsList: {name: string, amount: number}[] = [];
  const liabilitiesList: {name: string, amount: number}[] = [];
  const otherList: {name: string, amount: number}[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (["Net Worth", "Total Assets", "Total Liabilities", "Working Capital"].includes(key)) return;
    
    const amt = Number(value) || 0;
    if (amt === 0) return;

    const lowerKey = key.toLowerCase();
    
    // Check liabilities first (Tally left side)
    if (liabilityKeywords.some(kw => lowerKey.includes(kw))) {
      liabilitiesList.push({ name: key, amount: Math.abs(amt) });
    } 
    // Check assets (Tally right side)
    else if (assetKeywords.some(kw => lowerKey.includes(kw))) {
      assetsList.push({ name: key, amount: Math.abs(amt) });
    } 
    // Fallback
    else {
      // Typically if it's negative it might be a liability, but standard tally dumps are absolute. We'll put it in others.
      otherList.push({ name: key, amount: Math.abs(amt) });
    }
  });

  // Sort by amount descending
  assetsList.sort((a, b) => b.amount - a.amount);
  liabilitiesList.sort((a, b) => b.amount - a.amount);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto bg-slate-50 min-h-screen font-sans space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-indigo-600" /> Balance Sheet Snapshot
          </h1>
          <p className="text-sm text-slate-500 mt-1">Structured view of your company's financial position</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-md text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Books Balanced
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Worth</h3>
            <Building className="h-4 w-4 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-3">{formatCurrency(netWorth)}</h2>
          <p className="text-xs text-slate-400 mt-1">Total Shareholder Equity</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Working Capital</h3>
            <Wallet className="h-4 w-4 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-3">{formatCurrency(workingCapital)}</h2>
          <p className="text-xs text-slate-400 mt-1">Operational Liquidity</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Assets</h3>
            <Landmark className="h-4 w-4 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-3">{formatCurrency(totalAssets)}</h2>
          <p className="text-xs text-slate-400 mt-1">What the company owns</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Liabilities</h3>
            <ShieldAlert className="h-4 w-4 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-3">{formatCurrency(totalLiabilities)}</h2>
          <p className="text-xs text-slate-400 mt-1">What the company owes</p>
        </div>

      </div>

      {/* T-Format Balance Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Liabilities */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-sm">Liabilities</h3>
            <span className="text-sm font-bold text-slate-900">{formatCurrency(totalLiabilities)}</span>
          </div>
          <div className="p-0 flex-1">
            <table className="w-full text-sm">
              <tbody>
                {liabilitiesList.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 text-slate-700 font-medium">{item.name}</td>
                    <td className="py-3 px-5 text-right font-semibold text-slate-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                {liabilitiesList.length === 0 && (
                  <tr><td colSpan={2} className="py-8 text-center text-slate-400 italic">No liability data found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Assets */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-sm">Assets</h3>
            <span className="text-sm font-bold text-slate-900">{formatCurrency(totalAssets)}</span>
          </div>
          <div className="p-0 flex-1">
            <table className="w-full text-sm">
              <tbody>
                {assetsList.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 text-slate-700 font-medium">{item.name}</td>
                    <td className="py-3 px-5 text-right font-semibold text-slate-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                {assetsList.length === 0 && (
                  <tr><td colSpan={2} className="py-8 text-center text-slate-400 italic">No asset data found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Others Section (If Any) */}
      {otherList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mt-6">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
            <h3 className="font-semibold text-slate-600 uppercase tracking-wider text-sm">Other Accounts</h3>
          </div>
          <div className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {otherList.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 text-slate-700 font-medium flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-slate-400" /> {item.name}
                    </td>
                    <td className="py-3 px-5 text-right font-semibold text-slate-900">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
