"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Package, Search, FileText, ArrowDownRight, ArrowUpRight, Wallet, Scale, TrendingUp, Percent, X, DollarSign, HandCoins, AlertTriangle } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type DrillDownType = 'opening' | 'inwards' | 'outwards' | 'closing' | 'consumption' | 'grossProfit' | null;

export default function StockSummaryDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drillDown, setDrillDown] = useState<DrillDownType>(null);
  const [outstandings, setOutstandings] = useState<any>(null);

  useEffect(() => {
    async function fetchOutstandings() {
      try {
        const res = await fetch('/api/outstandings');
        const json = await res.json();
        setOutstandings(json.kpis);
      } catch (err) {
        console.error("Failed to fetch outstandings", err);
      }
    }
    fetchOutstandings();
  }, []);

  useEffect(() => {
    async function fetchLiveData() {
      try {
        setIsLoading(true);
        let url = '/api/inventory';
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('startDate', dateRange.from.toISOString().split('T')[0]);
        if (dateRange?.to) params.append('endDate', dateRange.to.toISOString().split('T')[0]);
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

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
  const formatCompact = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 1, notation: "compact" }).format(val || 0);
  const formatQty = (val: number, unit: string) =>
    `${Number(val).toFixed(2)} ${unit}`;
  const formatRate = (val: number) =>
    Number(val).toFixed(2);
  const formatPerc = (val: number) =>
    `${Number(val).toFixed(2)}%`;

  // Build Hierarchy
  const hierarchy = useMemo(() => {
    if (!data?.allProducts) return [];
    const groups: Record<string, any> = {};
    data.allProducts.forEach((p: any) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.parentGroup || '').toLowerCase().includes(search.toLowerCase())) return;
      const g = p.parentGroup || 'Uncategorized';
      if (!groups[g]) {
        groups[g] = { name: g, items: [], openingQty: 0, openingVal: 0, inQty: 0, inVal: 0, outQty: 0, outVal: 0, closingQty: 0, closingVal: 0, grossValue: 0, consumption: 0, grossProfit: 0 };
      }
      groups[g].items.push(p);
      groups[g].openingQty += p.openingQty; groups[g].openingVal += p.openingVal;
      groups[g].inQty += p.inQty; groups[g].inVal += p.inVal;
      groups[g].outQty += p.outQty; groups[g].outVal += p.outVal;
      groups[g].closingQty += p.closingQty; groups[g].closingVal += p.closingVal;
      groups[g].grossValue += p.grossValue || 0;
      groups[g].consumption += p.consumption || 0;
      groups[g].grossProfit += p.grossProfit || 0;
    });
    return Object.values(groups).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [data, search]);

  const grandTotal = useMemo(() => {
    let t = { openingVal: 0, inVal: 0, outVal: 0, closingVal: 0, grossValue: 0, consumption: 0, grossProfit: 0 };
    hierarchy.forEach((g: any) => {
      t.openingVal += g.openingVal; t.inVal += g.inVal; t.outVal += g.outVal; t.closingVal += g.closingVal;
      t.grossValue += g.grossValue; t.consumption += g.consumption; t.grossProfit += g.grossProfit;
    });
    return t;
  }, [hierarchy]);

  const itemVouchers = useMemo(() => {
    if (!selectedItem || !data?.detailedLedger) return [];
    return data.detailedLedger.filter((v: any) => v.product === selectedItem);
  }, [selectedItem, data]);

  // Drill-down data: filter products based on which card was clicked
  const drillDownData = useMemo(() => {
    if (!drillDown || !data?.allProducts) return [];
    let filtered = [...data.allProducts];
    switch (drillDown) {
      case 'opening': return filtered.filter((p: any) => p.openingVal !== 0).sort((a: any, b: any) => b.openingVal - a.openingVal);
      case 'inwards': return filtered.filter((p: any) => p.inVal > 0).sort((a: any, b: any) => b.inVal - a.inVal);
      case 'outwards': return filtered.filter((p: any) => p.outVal > 0).sort((a: any, b: any) => b.outVal - a.outVal);
      case 'closing': return filtered.filter((p: any) => p.closingVal !== 0).sort((a: any, b: any) => b.closingVal - a.closingVal);
      case 'consumption': return filtered.filter((p: any) => p.consumption > 0).sort((a: any, b: any) => b.consumption - a.consumption);
      case 'grossProfit': return filtered.filter((p: any) => p.grossProfit !== 0).sort((a: any, b: any) => b.grossProfit - a.grossProfit);
      default: return [];
    }
  }, [drillDown, data]);

  const drillDownTitle: Record<string, string> = {
    opening: 'Opening Balance — Item Wise Breakdown',
    inwards: 'Total Inwards — Item Wise Breakdown',
    outwards: 'Total Outwards — Item Wise Breakdown',
    closing: 'Closing Balance — Item Wise Breakdown',
    consumption: 'Consumption (Cost of Goods) — Item Wise',
    grossProfit: 'Gross Profit — Item Wise Breakdown',
  };

  if (isLoading && !data) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Stock Summary...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Stock Summary</h1>
          <p className="text-gray-500 mt-1">Real-time inventory valuation and movement — synced from Tally</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input placeholder="Search items or groups..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <DateRangePicker 
            onDateChange={setDateRange} 
            className="w-[280px]" 
          />
        </div>
      </div>

      {/* Outstandings & Liquidity KPIs */}
      {outstandings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <a href="/outstandings" className="block">
            <Card className="hover:shadow-lg transition-all cursor-pointer bg-white border-l-4 border-l-emerald-500 hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Receivables</CardTitle>
                <HandCoins className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{formatCompact(outstandings.totalReceivables)}</div>
                <p className="text-xs text-emerald-600 mt-1">Click to view Details</p>
              </CardContent>
            </Card>
          </a>
          <a href="/outstandings" className="block">
            <Card className="hover:shadow-lg transition-all cursor-pointer bg-white border-l-4 border-l-rose-500 hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Payables</CardTitle>
                <HandCoins className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{formatCompact(outstandings.totalPayables)}</div>
                <p className="text-xs text-rose-600 mt-1">Click to view Details</p>
              </CardContent>
            </Card>
          </a>
          <a href="/outstandings" className="block">
            <Card className="hover:shadow-lg transition-all cursor-pointer bg-white border-l-4 border-l-red-500 hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Overdue Receivables</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{formatCompact(outstandings.overdueReceivables)}</div>
                <p className="text-xs text-red-600 mt-1">Requires follow-up</p>
              </CardContent>
            </Card>
          </a>
          <a href="/outstandings" className="block">
            <Card className="hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-indigo-500 to-blue-600 text-white hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100">Liquidity Position</CardTitle>
                <Wallet className="h-4 w-4 text-indigo-100" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCompact(0 /* Cash+Bank */ - outstandings.totalPayables)}</div>
                <p className="text-xs text-indigo-200 mt-1">Cash + Bank − Payables</p>
              </CardContent>
            </Card>
          </a>
        </div>
      )}

      {/* KPI Cards Row 1: Core metrics from Tally */}
      {data?.kpis && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-all cursor-pointer bg-white border-l-4 border-l-gray-400 hover:-translate-y-0.5" onClick={() => setDrillDown('opening')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Opening Balance</CardTitle>
              <Wallet className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCompact(data.kpis.openingValue)}</div>
              <p className="text-xs text-gray-500 mt-1">Click for item-wise breakdown</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer bg-white border-l-4 border-l-green-500 hover:-translate-y-0.5" onClick={() => setDrillDown('inwards')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Inwards</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCompact(data.kpis.inwardValue)}</div>
              <p className="text-xs text-green-600 mt-1">Goods received / purchased</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer bg-white border-l-4 border-l-red-500 hover:-translate-y-0.5" onClick={() => setDrillDown('outwards')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Outwards</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCompact(data.kpis.outwardValue)}</div>
              <p className="text-xs text-red-600 mt-1">Goods dispatched / sold</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer bg-white border-l-4 border-l-blue-500 hover:-translate-y-0.5" onClick={() => setDrillDown('closing')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Closing Balance</CardTitle>
              <Scale className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCompact(data.kpis.closingValue)}</div>
              <p className="text-xs text-blue-600 mt-1">Current inventory value</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Cards Row 2: Profitability metrics */}
      {data?.kpis && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-all cursor-pointer bg-white border-l-4 border-l-orange-500 hover:-translate-y-0.5" onClick={() => setDrillDown('consumption')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Consumption (COGS)</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">{formatCompact(data.kpis.consumption)}</div>
              <p className="text-xs text-orange-600 mt-1">Cost of goods sold (weighted avg cost)</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-emerald-500 to-green-600 text-white hover:-translate-y-0.5" onClick={() => setDrillDown('grossProfit')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCompact(data.kpis.grossProfit)}</div>
              <p className="text-xs text-emerald-200 mt-1">Outward Value − Consumption</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer bg-slate-900 text-white hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Gross Profit %</CardTitle>
              <Percent className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{formatPerc(data.kpis.profitPerc)}</div>
              <p className="text-xs text-slate-400 mt-1">Overall profit margin on outwards</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Stock Summary Table */}
      <Card className="shadow-md border-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader className="bg-blue-900 sticky top-0 z-10">
              <TableRow className="border-b-blue-800">
                <TableHead className="text-white font-semibold py-4 w-[20%] bg-blue-900">Particulars</TableHead>
                <TableHead className="text-white font-semibold text-center border-l border-blue-800 bg-blue-900" colSpan={3}>Opening Balance</TableHead>
                <TableHead className="text-white font-semibold text-center border-l border-blue-800 bg-blue-900" colSpan={3}>Inwards</TableHead>
                <TableHead className="text-white font-semibold text-center border-l border-blue-800 bg-blue-900" colSpan={7}>Outwards</TableHead>
                <TableHead className="text-white font-semibold text-center border-l border-blue-800 bg-blue-900" colSpan={3}>Closing Balance</TableHead>
              </TableRow>
              <TableRow className="bg-blue-50 border-b-2 border-blue-200">
                <TableHead className="py-2 text-blue-900"></TableHead>
                {['Quantity', 'Rate', 'Value'].map((h, i) => (
                  <TableHead key={`op-${i}`} className={`py-2 text-right text-xs font-semibold text-blue-800 ${i===0 ? 'border-l border-blue-200' : ''}`}>{h}</TableHead>
                ))}
                {['Quantity', 'Rate', 'Value'].map((h, i) => (
                  <TableHead key={`in-${i}`} className={`py-2 text-right text-xs font-semibold text-blue-800 ${i===0 ? 'border-l border-blue-200' : ''}`}>{h}</TableHead>
                ))}
                {['Quantity', 'Rate', 'Value', 'Gross Value', 'Consumption', 'Gross Profit', 'Perc %'].map((h, i) => (
                  <TableHead key={`out-${i}`} className={`py-2 text-right text-xs font-semibold text-blue-800 ${i===0 ? 'border-l border-blue-200' : ''}`}>{h}</TableHead>
                ))}
                {['Quantity', 'Rate', 'Value'].map((h, i) => (
                  <TableHead key={`cl-${i}`} className={`py-2 text-right text-xs font-semibold text-blue-800 ${i===0 ? 'border-l border-blue-200' : ''}`}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {hierarchy.map((group: any) => {
                const groupProfitPerc = group.grossValue > 0 ? ((group.grossProfit / group.grossValue) * 100) : 0;
                return (
                  <React.Fragment key={group.name}>
                    <TableRow className="cursor-pointer hover:bg-gray-100 bg-white transition-colors border-b" onClick={() => toggleGroup(group.name)}>
                      <TableCell className="font-bold text-gray-900 flex items-center gap-2 py-3">
                        {expandedGroups[group.name] ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        <Package className="h-4 w-4 text-blue-600 opacity-70" />
                        {group.name}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-600 border-l border-gray-100">{formatQty(group.openingQty, '')}</TableCell>
                      <TableCell className="text-right text-gray-400">-</TableCell>
                      <TableCell className="text-right font-bold text-gray-800">{formatMoney(group.openingVal)}</TableCell>
                      <TableCell className="text-right font-medium text-green-700 border-l border-gray-100">{formatQty(group.inQty, '')}</TableCell>
                      <TableCell className="text-right text-gray-400">-</TableCell>
                      <TableCell className="text-right font-bold text-green-700">{formatMoney(group.inVal)}</TableCell>
                      <TableCell className="text-right font-medium text-red-700 border-l border-gray-100">{formatQty(group.outQty, '')}</TableCell>
                      <TableCell className="text-right text-gray-400">-</TableCell>
                      <TableCell className="text-right font-bold text-red-700">{formatMoney(group.outVal)}</TableCell>
                      <TableCell className="text-right font-bold text-red-700">{formatMoney(group.grossValue)}</TableCell>
                      <TableCell className="text-right font-medium text-orange-700">{formatMoney(group.consumption)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">{formatMoney(group.grossProfit)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">{formatPerc(groupProfitPerc)}</TableCell>
                      <TableCell className="text-right font-medium text-blue-800 border-l border-gray-100">{formatQty(group.closingQty, '')}</TableCell>
                      <TableCell className="text-right text-gray-400">-</TableCell>
                      <TableCell className="text-right font-bold text-blue-800">{formatMoney(group.closingVal)}</TableCell>
                    </TableRow>

                    {expandedGroups[group.name] && group.items.map((item: any) => (
                      <TableRow key={item.name} className="hover:bg-blue-50/50 transition-colors bg-white cursor-pointer group" onClick={() => setSelectedItem(item.name)}>
                        <TableCell className="pl-12 py-2 text-gray-700 group-hover:text-blue-700 group-hover:font-medium transition-colors">{item.name}</TableCell>
                        <TableCell className="text-right text-gray-600 border-l border-gray-100">{item.openingQty !== 0 ? formatQty(item.openingQty, item.baseUnits) : ''}</TableCell>
                        <TableCell className="text-right text-gray-500 text-xs">{item.openingRate !== 0 ? formatRate(item.openingRate) : ''}</TableCell>
                        <TableCell className="text-right text-gray-700">{item.openingVal !== 0 ? formatMoney(item.openingVal) : ''}</TableCell>
                        <TableCell className="text-right text-green-700 border-l border-gray-100">{item.inQty !== 0 ? formatQty(item.inQty, item.baseUnits) : ''}</TableCell>
                        <TableCell className="text-right text-green-600/70 text-xs">{item.inRate !== 0 ? formatRate(item.inRate) : ''}</TableCell>
                        <TableCell className="text-right text-green-700">{item.inVal !== 0 ? formatMoney(item.inVal) : ''}</TableCell>
                        <TableCell className="text-right text-red-700 border-l border-gray-100">{item.outQty !== 0 ? formatQty(item.outQty, item.baseUnits) : ''}</TableCell>
                        <TableCell className="text-right text-red-600/70 text-xs">{item.outRate !== 0 ? formatRate(item.outRate) : ''}</TableCell>
                        <TableCell className="text-right text-red-700">{item.outVal !== 0 ? formatMoney(item.outVal) : ''}</TableCell>
                        <TableCell className="text-right text-red-700 font-medium">{item.grossValue > 0 ? formatMoney(item.grossValue) : ''}</TableCell>
                        <TableCell className="text-right text-orange-600">{item.consumption > 0 ? formatMoney(item.consumption) : ''}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-700">{item.grossProfit !== 0 ? formatMoney(item.grossProfit) : ''}</TableCell>
                        <TableCell className="text-right text-emerald-600 text-xs">{item.outVal > 0 ? formatPerc(item.profitPerc) : ''}</TableCell>
                        <TableCell className="text-right font-medium text-blue-800 border-l border-gray-100">{item.closingQty !== 0 ? formatQty(item.closingQty, item.baseUnits) : ''}</TableCell>
                        <TableCell className="text-right text-blue-600/70 text-xs">{item.closingRate !== 0 ? formatRate(item.closingRate) : ''}</TableCell>
                        <TableCell className="text-right font-medium text-blue-900">{item.closingVal !== 0 ? formatMoney(item.closingVal) : ''}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Grand Total */}
              <TableRow className="bg-amber-100 hover:bg-amber-100 border-t-2 border-amber-300">
                <TableCell className="font-bold text-amber-900 py-4 uppercase tracking-wider text-sm">Grand Total</TableCell>
                <TableCell className="border-l border-amber-200"></TableCell><TableCell></TableCell>
                <TableCell className="text-right font-bold text-amber-900">{formatMoney(grandTotal.openingVal)}</TableCell>
                <TableCell className="border-l border-amber-200"></TableCell><TableCell></TableCell>
                <TableCell className="text-right font-bold text-amber-900">{formatMoney(grandTotal.inVal)}</TableCell>
                <TableCell className="border-l border-amber-200"></TableCell><TableCell></TableCell>
                <TableCell className="text-right font-bold text-amber-900">{formatMoney(grandTotal.outVal)}</TableCell>
                <TableCell className="text-right font-bold text-amber-900">{formatMoney(grandTotal.grossValue)}</TableCell>
                <TableCell className="text-right font-bold text-amber-900">{formatMoney(grandTotal.consumption)}</TableCell>
                <TableCell className="text-right font-bold text-emerald-800">{formatMoney(grandTotal.grossProfit)}</TableCell>
                <TableCell className="text-right font-bold text-emerald-800">{grandTotal.grossValue > 0 ? formatPerc((grandTotal.grossProfit / grandTotal.grossValue) * 100) : '0%'}</TableCell>
                <TableCell className="border-l border-amber-200"></TableCell><TableCell></TableCell>
                <TableCell className="text-right font-bold text-amber-900 text-base">{formatMoney(grandTotal.closingVal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ITEM VOUCHER DRILL DOWN MODAL */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden bg-white rounded-xl shadow-2xl border-0">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 text-white">
            <DialogTitle className="text-2xl font-bold tracking-tight">{selectedItem}</DialogTitle>
            <DialogDescription className="text-blue-100 mt-1 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Item Voucher Detailed Ledger
            </DialogDescription>
          </div>
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            <Card className="border-0 shadow-sm">
              <Table>
                <TableHeader className="bg-gray-100/80 sticky top-0">
                  <TableRow>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead>Voucher Type</TableHead>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>Party / Ledger</TableHead>
                    <TableHead className="text-right">Inward Qty</TableHead>
                    <TableHead className="text-right">Outward Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemVouchers.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-500">No transactions found for this item.</TableCell></TableRow>
                  ) : (
                    itemVouchers.map((v: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell className="font-medium text-gray-700">{new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</TableCell>
                        <TableCell>
                          <Badge variant={v.type === 'INWARD' ? 'default' : 'secondary'} className={v.type === 'INWARD' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{v.voucherType}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">{v.id}</TableCell>
                        <TableCell className="font-medium">{v.party}</TableCell>
                        <TableCell className="text-right font-medium text-green-700">{v.type === 'INWARD' ? v.qty : ''}</TableCell>
                        <TableCell className="text-right font-medium text-red-700">{v.type === 'OUTWARD' ? v.qty : ''}</TableCell>
                        <TableCell className="text-right text-gray-500">{formatRate(v.rate)}</TableCell>
                        <TableCell className="text-right font-medium text-gray-900">{formatMoney(v.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI CARD DRILL DOWN MODAL */}
      {drillDown && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-200">
            <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
              <div>
                <h3 className="text-xl font-bold tracking-tight">{drillDownTitle[drillDown] || 'Details'}</h3>
                <p className="text-blue-200 text-sm mt-0.5">All items contributing to this metric</p>
              </div>
              <button onClick={() => setDrillDown(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              <Table>
                <TableHeader className="bg-gray-100 sticky top-0">
                  <TableRow>
                    <TableHead className="font-semibold">Stock Item</TableHead>
                    <TableHead className="font-semibold">Group</TableHead>
                    <TableHead className="text-right font-semibold">Quantity</TableHead>
                    <TableHead className="text-right font-semibold">Rate</TableHead>
                    <TableHead className="text-right font-semibold">Value</TableHead>
                    {(drillDown === 'outwards' || drillDown === 'grossProfit' || drillDown === 'consumption') && (
                      <>
                        <TableHead className="text-right font-semibold">Consumption</TableHead>
                        <TableHead className="text-right font-semibold">Gross Profit</TableHead>
                        <TableHead className="text-right font-semibold">Perc %</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownData.map((item: any, idx: number) => {
                    let qty = 0, rate = 0, val = 0;
                    switch (drillDown) {
                      case 'opening': qty = item.openingQty; rate = item.openingRate; val = item.openingVal; break;
                      case 'inwards': qty = item.inQty; rate = item.inRate; val = item.inVal; break;
                      case 'outwards': qty = item.outQty; rate = item.outRate; val = item.outVal; break;
                      case 'closing': qty = item.closingQty; rate = item.closingRate; val = item.closingVal; break;
                      case 'consumption': qty = item.outQty; rate = item.outRate; val = item.consumption; break;
                      case 'grossProfit': qty = item.outQty; rate = item.outRate; val = item.grossProfit; break;
                    }
                    return (
                      <TableRow key={idx} className="hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => { setDrillDown(null); setSelectedItem(item.name); }}>
                        <TableCell className="font-medium text-gray-800">{item.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{item.parentGroup}</Badge></TableCell>
                        <TableCell className="text-right text-gray-600">{qty !== 0 ? formatQty(qty, item.baseUnits) : '-'}</TableCell>
                        <TableCell className="text-right text-gray-500 text-xs">{rate !== 0 ? formatRate(rate) : '-'}</TableCell>
                        <TableCell className="text-right font-bold text-gray-900">{formatMoney(val)}</TableCell>
                        {(drillDown === 'outwards' || drillDown === 'grossProfit' || drillDown === 'consumption') && (
                          <>
                            <TableCell className="text-right font-medium text-orange-700">{formatMoney(item.consumption)}</TableCell>
                            <TableCell className={`text-right font-bold ${item.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatMoney(item.grossProfit)}</TableCell>
                            <TableCell className={`text-right text-sm ${item.profitPerc >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{item.outVal > 0 ? formatPerc(item.profitPerc) : '-'}</TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                  {drillDownData.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-gray-500">No items found for this metric.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
