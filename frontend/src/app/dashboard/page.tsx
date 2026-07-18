'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, Scale, Percent, Wallet, ArrowDownRight, ArrowUpRight, TrendingUp, Package, Search, ChevronRight, ChevronDown, FileText, X, AlertTriangle, Landmark, HandCoins, ArrowRight, ShieldAlert
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DrillDownType = 'opening' | 'inwards' | 'outwards' | 'closing' | 'consumption' | 'grossProfit' | null;

function getPrimaryStockGroup(parentGroup: string, itemName: string): string {
  const cleanGroup = (parentGroup || '').trim();
  const lowerGroup = cleanGroup.toLowerCase();
  
  if (lowerGroup.includes('raw material')) return 'Raw Material';
  if (lowerGroup.includes('finished goods') || lowerGroup.includes('finished item')) return 'Finished Goods';
  if (lowerGroup.includes('co product') || lowerGroup.includes('by product') || lowerGroup.includes('coproduct') || lowerGroup.includes('byproduct')) return 'Co Product / By Product';
  if (lowerGroup.includes('store') || lowerGroup.includes('spare') || lowerGroup.includes('part') || lowerGroup.includes('tool')) return 'Store & Spares Parts';
  
  const lowerName = itemName.toLowerCase();
  if (lowerName.includes('coal') || lowerName.includes('ore') || lowerName.includes('dolomite') || lowerName.includes('scrap') || lowerName.includes('fine') || lowerName.includes('pellet') || lowerName.includes('char')) {
    return 'Raw Material';
  }
  if (lowerName.includes('sponge') || lowerName.includes('billet') || lowerName.includes('steel') || lowerName.includes('slab')) {
    return 'Finished Goods';
  }
  if (lowerName.includes('dolochar') || lowerName.includes('fly ash') || lowerName.includes('ash') || lowerName.includes('gas') || lowerName.includes('dust')) {
    return 'Co Product / By Product';
  }
  if (lowerName.includes('bearing') || lowerName.includes('motor') || lowerName.includes('belt') || lowerName.includes('cable') || lowerName.includes('wire') || lowerName.includes('valve') || lowerName.includes('switch') || lowerName.includes('bolt') || lowerName.includes('nut')) {
    return 'Store & Spares Parts';
  }
  
  return 'Primary';
}

export default function StockSummaryDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const d = new Date();
    // Default to full financial year
    const fyStart = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
    return {
      from: new Date(fyStart, 3, 1),
      to: new Date(fyStart + 1, 2, 31)
    };
  });

  const [data, setData] = useState<any>(null);
  const [outstandings, setOutstandings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  // Drill-down states (Level 3 slide-out drawers)
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDownType>(null);

  // Fetch Inventory and Outstandings together
  useEffect(() => {
    async function fetchLiveData() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (dateRange?.from) queryParams.append('startDate', dateRange.from.toISOString());
        if (dateRange?.to) queryParams.append('endDate', dateRange.to.toISOString());

        const [invRes, outRes] = await Promise.all([
          fetch(`/api/inventory?${queryParams.toString()}`),
          fetch(`/api/outstandings?${queryParams.toString()}`)
        ]);

        if (invRes.ok) {
          const apiData = await invRes.json();
          setData(apiData);
          
          // Pre-expand groups by default
          const expanded: Record<string, boolean> = {};
          (apiData.allProducts || []).forEach((p: any) => {
            const group = getPrimaryStockGroup(p.parentGroup, p.name);
            expanded[group] = true;
          });
          setExpandedGroups(expanded);
        }

        if (outRes.ok) {
          const outData = await outRes.json();
          setOutstandings(outData);
        }
      } catch (error) {
        console.error("Error fetching live inventory data:", error);
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
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);

  const formatCompact = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 1, notation: "compact" }).format(val || 0);

  const formatQty = (val: number, unit: string) =>
    `${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;

  const formatRate = (val: number) =>
    Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatPerc = (val: number) =>
    `${Number(val).toFixed(1)}%`;

  // Build Hierarchy using Tally Primary Stock Groups mapping
  const hierarchy = useMemo(() => {
    if (!data?.allProducts) return [];
    const groups: Record<string, any> = {};
    data.allProducts.forEach((p: any) => {
      const g = getPrimaryStockGroup(p.parentGroup, p.name);
      
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !g.toLowerCase().includes(search.toLowerCase())) return;
      
      if (!groups[g]) {
        groups[g] = { 
          name: g, 
          items: [], 
          openingQty: 0, 
          openingVal: 0, 
          inQty: 0, 
          inVal: 0, 
          outQty: 0, 
          outVal: 0, 
          closingQty: 0, 
          closingVal: 0, 
          grossValue: 0, 
          consumption: 0, 
          grossProfit: 0 
        };
      }
      groups[g].items.push(p);
      groups[g].openingQty += p.openingQty; 
      groups[g].openingVal += p.openingVal;
      groups[g].inQty += p.inQty; 
      groups[g].inVal += p.inVal;
      groups[g].outQty += p.outQty; 
      groups[g].outVal += p.outVal;
      groups[g].closingQty += p.closingQty; 
      groups[g].closingVal += p.closingVal;
      groups[g].grossValue += p.grossValue || 0;
      groups[g].consumption += p.consumption || 0;
      groups[g].grossProfit += p.grossProfit || 0;
    });
    return Object.values(groups).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [data, search]);

  const grandTotal = useMemo(() => {
    let t = { openingVal: 0, inVal: 0, outVal: 0, closingVal: 0, grossValue: 0, consumption: 0, grossProfit: 0 };
    hierarchy.forEach((g: any) => {
      t.openingVal += g.openingVal; 
      t.inVal += g.inVal; 
      t.outVal += g.outVal; 
      t.closingVal += g.closingVal;
      t.grossValue += g.grossValue; 
      t.consumption += g.consumption; 
      t.grossProfit += g.grossProfit;
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
      case 'inwards': return filtered.filter((p: any) => p.inVal !== 0).sort((a: any, b: any) => b.inVal - a.inVal);
      case 'outwards': return filtered.filter((p: any) => p.outVal !== 0).sort((a: any, b: any) => b.outVal - a.outVal);
      case 'closing': return filtered.filter((p: any) => p.closingVal !== 0).sort((a: any, b: any) => b.closingVal - a.closingVal);
      case 'consumption': return filtered.filter((p: any) => p.consumption !== 0).sort((a: any, b: any) => b.consumption - a.consumption);
      case 'grossProfit': return filtered.filter((p: any) => p.grossProfit !== 0).sort((a: any, b: any) => b.grossProfit - a.grossProfit);
      default: return [];
    }
  }, [drillDown, data]);

  const drillDownTitle: Record<string, string> = {
    opening: 'Opening Stock Inventory Breakdown',
    inwards: 'Total Inwards (Purchase/Receipt) Breakdown',
    outwards: 'Total Outwards (Sale/Delivery) Breakdown',
    closing: 'Closing Stock Inventory Breakdown',
    consumption: 'Consumption (COGS) Breakdown',
    grossProfit: 'Gross Profit Breakdown',
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-[500px] items-center justify-center flex-col gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="text-sm font-semibold text-slate-500 tracking-wider">Loading Tally Stock Summary...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-[1700px] mx-auto bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-indigo-700">
            Stock Summary Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time inventory valuation and movement registers — synced from Tally
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search items or groups..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 bg-white border-slate-200" 
            />
          </div>
          <DateRangePicker 
            value={dateRange}
            onDateChange={setDateRange} 
            className="w-[280px]" 
          />
        </div>
      </div>

      {/* Mini Outstandings Panel */}
      {outstandings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <a href="/receivable" className="block group">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-white border-l-4 border-l-emerald-500 group-hover:-translate-y-0.5">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Receivables</p>
                  <h3 className="text-2xl font-black text-slate-800">{formatCompact(outstandings.kpis.totalReceivables)}</h3>
                </div>
                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg"><HandCoins className="h-5 w-5" /></div>
              </CardContent>
            </Card>
          </a>
          
          <a href="/payable" className="block group">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-white border-l-4 border-l-rose-500 group-hover:-translate-y-0.5">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Payables</p>
                  <h3 className="text-2xl font-black text-slate-800">{formatCompact(outstandings.kpis.totalPayables)}</h3>
                </div>
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg"><HandCoins className="h-5 w-5" /></div>
              </CardContent>
            </Card>
          </a>

          <a href="/receivable" className="block group">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-white border-l-4 border-l-red-500 group-hover:-translate-y-0.5">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Overdue Receivables</p>
                  <h3 className="text-2xl font-black text-red-600">{formatCompact(outstandings.kpis.overdueReceivables)}</h3>
                </div>
                <div className="p-2.5 bg-red-100 text-red-600 rounded-lg"><AlertTriangle className="h-5 w-5" /></div>
              </CardContent>
            </Card>
          </a>

          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Liquidity Position</p>
                <h3 className="text-2xl font-black">{formatCompact(0 - outstandings.kpis.totalPayables)}</h3>
              </div>
              <div className="p-2.5 bg-indigo-400/40 text-indigo-100 rounded-lg"><Wallet className="h-5 w-5" /></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Cards Row 1 */}
      {data?.kpis && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-xl transition-all cursor-pointer bg-white border-l-4 border-l-slate-400 hover:-translate-y-0.5" onClick={() => setDrillDown('opening')}>
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Opening Balance</p>
                <h3 className="text-2xl font-black text-slate-800">{formatMoney(data.kpis.openingValue)}</h3>
              </div>
              <div className="p-2.5 bg-slate-100 text-slate-500 rounded-lg"><Wallet className="h-5 w-5" /></div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all cursor-pointer bg-white border-l-4 border-l-green-500 hover:-translate-y-0.5" onClick={() => setDrillDown('inwards')}>
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Inwards</p>
                <h3 className="text-2xl font-black text-green-700">{formatMoney(data.kpis.inwardValue)}</h3>
              </div>
              <div className="p-2.5 bg-green-50 text-green-600 rounded-lg"><ArrowDownRight className="h-5 w-5" /></div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all cursor-pointer bg-white border-l-4 border-l-red-500 hover:-translate-y-0.5" onClick={() => setDrillDown('outwards')}>
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Outwards</p>
                <h3 className="text-2xl font-black text-red-700">{formatMoney(data.kpis.outwardValue)}</h3>
              </div>
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg"><ArrowUpRight className="h-5 w-5" /></div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all cursor-pointer bg-white border-l-4 border-l-blue-500 hover:-translate-y-0.5" onClick={() => setDrillDown('closing')}>
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Closing Balance</p>
                <h3 className="text-2xl font-black text-blue-800">{formatMoney(data.kpis.closingValue)}</h3>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Scale className="h-5 w-5" /></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Cards Row 2 */}
      {data?.kpis && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="hover:shadow-xl transition-all cursor-pointer bg-white border-l-4 border-l-orange-500 hover:-translate-y-0.5" onClick={() => setDrillDown('consumption')}>
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Consumption (COGS)</p>
                <h3 className="text-2xl font-black text-orange-700">{formatMoney(data.kpis.consumption)}</h3>
              </div>
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg"><DollarSign className="h-5 w-5" /></div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-emerald-500 to-green-600 text-white hover:-translate-y-0.5" onClick={() => setDrillDown('grossProfit')}>
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Gross Profit</p>
                <h3 className="text-2xl font-black">{formatMoney(data.kpis.grossProfit)}</h3>
              </div>
              <div className="p-2.5 bg-emerald-400/40 text-emerald-100 rounded-lg"><TrendingUp className="h-5 w-5" /></div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Gross Margin %</p>
                <h3 className="text-2xl font-black text-amber-400">{formatPerc(data.kpis.profitPerc)}</h3>
              </div>
              <div className="p-2.5 bg-slate-800 text-amber-400 rounded-lg"><Percent className="h-5 w-5" /></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Hierarchical Stock Summary Table */}
      <Card className="shadow-xl border-0 overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 p-6">
          <CardTitle className="text-lg font-black text-slate-800">Hierarchical Stock summary</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table className="w-full text-sm min-w-[1200px]">
            <TableHeader className="bg-slate-800">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-white font-bold py-4 bg-slate-800">Particulars (Stock Groups & Items)</TableHead>
                <TableHead className="text-white font-bold text-center bg-slate-800 border-l border-slate-700" colSpan={2}>Opening Balance</TableHead>
                <TableHead className="text-white font-bold text-center bg-slate-800 border-l border-slate-700" colSpan={2}>Inwards</TableHead>
                <TableHead className="text-white font-bold text-center bg-slate-800 border-l border-slate-700" colSpan={2}>Outwards</TableHead>
                <TableHead className="text-white font-bold text-center bg-slate-800 border-l border-slate-700" colSpan={2}>Closing Balance</TableHead>
              </TableRow>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="py-2 text-slate-600 font-bold"></TableHead>
                {['Qty', 'Value'].map((h, i) => <TableHead key={`op-${i}`} className="py-2 text-right text-xs font-bold text-slate-600 border-l border-slate-100">{h}</TableHead>)}
                {['Qty', 'Value'].map((h, i) => <TableHead key={`in-${i}`} className="py-2 text-right text-xs font-bold text-slate-600 border-l border-slate-100">{h}</TableHead>)}
                {['Qty', 'Value'].map((h, i) => <TableHead key={`out-${i}`} className="py-2 text-right text-xs font-bold text-slate-600 border-l border-slate-100">{h}</TableHead>)}
                {['Qty', 'Value'].map((h, i) => <TableHead key={`cl-${i}`} className="py-2 text-right text-xs font-bold text-slate-600 border-l border-slate-100">{h}</TableHead>)}
              </TableRow>
            </TableHeader>

            <TableBody>
              {hierarchy.map((group: any) => {
                const isExpanded = !!expandedGroups[group.name];
                return (
                  <React.Fragment key={group.name}>
                    {/* Level 1: Group Row */}
                    <TableRow 
                      className="cursor-pointer hover:bg-slate-100/50 bg-slate-50/50 transition-colors border-b border-slate-200 font-bold" 
                      onClick={() => toggleGroup(group.name)}
                    >
                      <TableCell className="font-bold text-indigo-950 flex items-center gap-2 py-3.5 pl-4">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-indigo-600 shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                        )}
                        <Package className="h-4.5 w-4.5 text-indigo-500 opacity-80" />
                        {group.name}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-600 border-l border-slate-100">{formatQty(group.openingQty, '')}</TableCell>
                      <TableCell className="text-right font-bold text-slate-800">{formatMoney(group.openingVal)}</TableCell>
                      <TableCell className="text-right font-semibold text-green-700 border-l border-slate-100">{formatQty(group.inQty, '')}</TableCell>
                      <TableCell className="text-right font-bold text-green-700">{formatMoney(group.inVal)}</TableCell>
                      <TableCell className="text-right font-semibold text-red-700 border-l border-slate-100">{formatQty(group.outQty, '')}</TableCell>
                      <TableCell className="text-right font-bold text-red-700">{formatMoney(group.outVal)}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-900 border-l border-slate-100">{formatQty(group.closingQty, '')}</TableCell>
                      <TableCell className="text-right font-bold text-blue-900">{formatMoney(group.closingVal)}</TableCell>
                    </TableRow>

                    {/* Level 2: Items expanded inline */}
                    {isExpanded && group.items.map((item: any) => (
                      <TableRow 
                        key={item.name} 
                        className="hover:bg-indigo-50/30 transition-colors bg-white cursor-pointer group border-b border-slate-100" 
                        onClick={() => setSelectedItem(item.name)}
                      >
                        <TableCell className="pl-14 py-3 text-slate-700 group-hover:text-indigo-600 group-hover:font-semibold transition-colors flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-indigo-400 opacity-60" />
                            {item.name}
                          </span>
                          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 mr-4" />
                        </TableCell>
                        <TableCell className="text-right text-slate-500 border-l border-slate-100">{item.openingQty !== 0 ? formatQty(item.openingQty, item.baseUnits) : '-'}</TableCell>
                        <TableCell className="text-right text-slate-700">{item.openingVal !== 0 ? formatMoney(item.openingVal) : '-'}</TableCell>
                        <TableCell className="text-right text-green-600 border-l border-slate-100">{item.inQty !== 0 ? formatQty(item.inQty, item.baseUnits) : '-'}</TableCell>
                        <TableCell className="text-right text-green-700">{item.inVal !== 0 ? formatMoney(item.inVal) : '-'}</TableCell>
                        <TableCell className="text-right text-red-600 border-l border-slate-100">{item.outQty !== 0 ? formatQty(item.outQty, item.baseUnits) : '-'}</TableCell>
                        <TableCell className="text-right text-red-700">{item.outVal !== 0 ? formatMoney(item.outVal) : '-'}</TableCell>
                        <TableCell className="text-right text-blue-800 border-l border-slate-100">{item.closingQty !== 0 ? formatQty(item.closingQty, item.baseUnits) : '-'}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-900">{item.closingVal !== 0 ? formatMoney(item.closingVal) : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Grand Total */}
              <TableRow className="bg-amber-50 hover:bg-amber-50 border-t-2 border-amber-200">
                <TableCell className="font-black text-amber-950 py-4 pl-4 uppercase tracking-wider text-sm">Grand Total</TableCell>
                <TableCell className="border-l border-amber-100"></TableCell>
                <TableCell className="text-right font-black text-amber-950">{formatMoney(grandTotal.openingVal)}</TableCell>
                <TableCell className="border-l border-amber-100"></TableCell>
                <TableCell className="text-right font-black text-green-800">{formatMoney(grandTotal.inVal)}</TableCell>
                <TableCell className="border-l border-amber-100"></TableCell>
                <TableCell className="text-right font-black text-red-800">{formatMoney(grandTotal.outVal)}</TableCell>
                <TableCell className="border-l border-amber-100"></TableCell>
                <TableCell className="text-right font-black text-blue-900">{formatMoney(grandTotal.closingVal)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Level 3: Stock Item Transactions Slide-Over Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedItem(null)} 
          />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-3xl transform bg-white shadow-2xl transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
              {/* Drawer Header */}
              <div className="sticky top-0 z-20 bg-slate-50 border-b p-6 flex justify-between items-center shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <FileText className="text-indigo-600 h-6 w-6" />
                    Item Ledger Register
                  </h2>
                  <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-wide">
                    {selectedItem}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="p-3 hover:bg-slate-200 rounded-full transition-colors group bg-white border border-slate-200 shadow-sm"
                >
                  <X className="h-5 w-5 text-slate-500 group-hover:text-slate-800" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-130px)]">
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700 text-xs">Date</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Type</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Voucher No.</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs">Party / Ledger</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-right">Quantity</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-right">Rate</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemVouchers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-semibold">
                            No transactions found for this item.
                          </TableCell>
                        </TableRow>
                      ) : (
                        itemVouchers.map((v: any, idx: number) => (
                          <TableRow key={idx} className="border-b last:border-0 hover:bg-slate-50">
                            <TableCell className="text-xs font-semibold text-slate-600">
                              {new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge 
                                variant={v.type === 'INWARD' ? 'default' : 'secondary'} 
                                className={v.type === 'INWARD' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                              >
                                {v.voucherType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-500">{v.id}</TableCell>
                            <TableCell className="text-xs font-bold text-slate-800">{v.party}</TableCell>
                            <TableCell className={`text-xs font-bold text-right ${v.type === 'INWARD' ? 'text-green-700' : 'text-red-700'}`}>
                              {v.qty}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-500 text-right">{formatRate(v.rate)}</TableCell>
                            <TableCell className="text-xs font-bold text-slate-800 text-right">{formatMoney(v.amount)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Card Drill-down Slide-Over Drawer */}
      {drillDown && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setDrillDown(null)} 
          />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-3xl transform bg-white shadow-2xl transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
              {/* Drawer Header */}
              <div className="sticky top-0 z-20 bg-slate-50 border-b p-6 flex justify-between items-center shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <FileText className="text-indigo-600 h-6 w-6" />
                    {drillDownTitle[drillDown] || 'Details'}
                  </h2>
                  <p className="text-slate-500 font-semibold text-xs mt-1 uppercase tracking-wide">
                    All contributing stock items
                  </p>
                </div>
                <button 
                  onClick={() => setDrillDown(null)}
                  className="p-3 hover:bg-slate-200 rounded-full transition-colors group bg-white border border-slate-200 shadow-sm"
                >
                  <X className="h-5 w-5 text-slate-500 group-hover:text-slate-800" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-130px)]">
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700 text-xs">Stock Item</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-right">Quantity</TableHead>
                        <TableHead className="font-bold text-slate-700 text-xs text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drillDownData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-slate-400 font-semibold">
                            No active items found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        drillDownData.map((item: any, idx: number) => {
                          let qty = 0;
                          let value = 0;
                          if (drillDown === 'opening') { qty = item.openingQty; value = item.openingVal; }
                          else if (drillDown === 'inwards') { qty = item.inQty; value = item.inVal; }
                          else if (drillDown === 'outwards') { qty = item.outQty; value = item.outVal; }
                          else if (drillDown === 'closing') { qty = item.closingQty; value = item.closingVal; }
                          else if (drillDown === 'consumption') { qty = item.outQty; value = item.consumption; }
                          else if (drillDown === 'grossProfit') { qty = item.outQty; value = item.grossProfit; }

                          return (
                            <TableRow key={idx} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedItem(item.name); setDrillDown(null); }}>
                              <TableCell className="text-xs font-bold text-slate-800">{item.name}</TableCell>
                              <TableCell className="text-xs font-bold text-slate-800 text-right">{formatQty(qty, item.baseUnits)}</TableCell>
                              <TableCell className="text-xs font-bold text-indigo-600 text-right">{formatMoney(value)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
