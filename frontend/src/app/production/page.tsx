"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Factory, Package, TrendingUp, X, Layers, Settings, Hammer, ChevronRight, ChevronDown, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function ProductionDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        let url = '/api/production';
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('startDate', dateRange.from.toISOString().split('T')[0]);
        if (dateRange?.to) params.append('endDate', dateRange.to.toISOString().split('T')[0]);
        if (params.toString()) url += '?' + params.toString();

        const res = await fetch(url);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to fetch production data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [dateRange]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  const formatCompact = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 1, notation: "compact" }).format(amount);
  const formatNumber = (num: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
  const formatQty = (val: number, unit: string) =>
    `${Number(val).toFixed(2)} ${unit || ''}`.trim();

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const { kpis, insights, trend, detailedTransactions, groupSummary } = data || {};

  const getFilteredTransactions = () => {
    if (!detailedTransactions) return [];
    return detailedTransactions;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between px-8 py-6 bg-white border-b sticky top-0 z-20">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Factory className="h-8 w-8 text-amber-600" />
            Manufacturing & Production
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Live production metrics from Tally Stock Summary</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
          <DateRangePicker onDateChange={setDateRange} />
        </div>
      </div>

      {(isLoading || !data) ? (
        <div className="flex flex-1 items-center justify-center p-8 space-y-4 flex-col">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
          <p className="text-slate-500 font-medium">Extracting live production data...</p>
        </div>
      ) : (
        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card 
              className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer"
              onClick={() => setSelectedMetric('Produced')}
            >
              <CardContent className="p-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-20 translate-x-4 -translate-y-4"><Package className="w-32 h-32" /></div>
                <p className="text-amber-100 text-sm font-semibold uppercase tracking-wider mb-2">Total Production Value</p>
                <h3 className="text-4xl font-black truncate" title={formatCurrency(kpis?.totalProductionValue || 0)}>{formatCompact(kpis?.totalProductionValue || 0)}</h3>
                <p className="text-amber-200 mt-2 text-sm font-medium">{formatNumber(kpis?.totalUnitsProduced || 0)} Units Dispatched</p>
              </CardContent>
            </Card>

            <Card 
              className="border-0 shadow-lg bg-white hover:shadow-xl transition-all cursor-pointer"
              onClick={() => setSelectedMetric('Consumed')}
            >
              <CardContent className="p-6">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Raw Material Cost</p>
                <h3 className="text-3xl font-black text-rose-600 truncate" title={formatCurrency(kpis?.totalRawMaterialCost || 0)}>{formatCompact(kpis?.totalRawMaterialCost || 0)}</h3>
                <p className="text-slate-500 mt-2 text-sm">Total input costs consumed</p>
              </CardContent>
            </Card>

            <Card 
              className="border-0 shadow-lg bg-white hover:shadow-xl transition-all border-l-4 border-l-emerald-500 cursor-pointer"
              onClick={() => setSelectedMetric('Margin')}
            >
              <CardContent className="p-6">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Est. Value Add</p>
                <h3 className={`text-3xl font-black truncate ${kpis?.manufacturingMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} title={formatCurrency(kpis?.manufacturingMargin || 0)}>
                  {formatCompact(kpis?.manufacturingMargin || 0)}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    Production Margin
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-slate-900 text-white hover:shadow-xl transition-all relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-2 translate-y-2"><Settings className="w-24 h-24" /></div>
              <CardContent className="p-6 relative z-10">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Production Yield (Qty)</p>
                <h3 className="text-3xl font-black text-white truncate">
                  {(kpis?.yieldPercentage || 0).toFixed(1)}%
                </h3>
                <p className="text-slate-400 mt-2 text-sm">Output Qty / Input Qty</p>
              </CardContent>
            </Card>
          </div>

          {/* STOCK SUMMARY STYLE TABLE - Group breakdown of Inwards & Outwards */}
          <Card className="border-0 shadow-xl bg-white overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Stock Summary — Group Wise Movement
              </CardTitle>
              <CardDescription className="text-blue-200">Inwards & Outwards by Stock Group (same as Tally Stock Summary)</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader className="bg-blue-50 sticky top-0">
                  <TableRow className="border-b-2 border-blue-200">
                    <TableHead className="py-3 font-semibold text-blue-900 w-[30%]">Particulars</TableHead>
                    <TableHead className="py-3 text-right font-semibold text-green-700 border-l border-blue-100">Inward Qty</TableHead>
                    <TableHead className="py-3 text-right font-semibold text-green-700">Inward Value</TableHead>
                    <TableHead className="py-3 text-right font-semibold text-red-700 border-l border-blue-100">Outward Qty</TableHead>
                    <TableHead className="py-3 text-right font-semibold text-red-700">Outward Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(groupSummary || []).map((group: any) => (
                    <React.Fragment key={group.name}>
                      {/* Group Row */}
                      <TableRow 
                        className="cursor-pointer hover:bg-gray-100 bg-white transition-colors border-b font-semibold"
                        onClick={() => toggleGroup(group.name)}
                      >
                        <TableCell className="py-3 flex items-center gap-2 text-gray-900">
                          {expandedGroups[group.name] ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                          <Package className="h-4 w-4 text-blue-600 opacity-70" />
                          {group.name}
                        </TableCell>
                        <TableCell className="text-right text-green-700 border-l border-gray-100">{formatNumber(group.inQty)}</TableCell>
                        <TableCell className="text-right text-green-700 font-bold">{formatCurrency(group.inVal)}</TableCell>
                        <TableCell className="text-right text-red-700 border-l border-gray-100">{formatNumber(group.outQty)}</TableCell>
                        <TableCell className="text-right text-red-700 font-bold">{formatCurrency(group.outVal)}</TableCell>
                      </TableRow>

                      {/* Item Rows */}
                      {expandedGroups[group.name] && group.items.map((item: any) => (
                        <TableRow key={item.name} className="hover:bg-blue-50/50 transition-colors bg-white">
                          <TableCell className="pl-12 py-2 text-gray-600">{item.name}</TableCell>
                          <TableCell className="text-right text-green-600 border-l border-gray-50">{item.inQty > 0 ? formatQty(item.inQty, item.unit) : ''}</TableCell>
                          <TableCell className="text-right text-green-600">{item.inVal > 0 ? formatCurrency(item.inVal) : ''}</TableCell>
                          <TableCell className="text-right text-red-600 border-l border-gray-50">{item.outQty > 0 ? formatQty(item.outQty, item.unit) : ''}</TableCell>
                          <TableCell className="text-right text-red-600">{item.outVal > 0 ? formatCurrency(item.outVal) : ''}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Grand Total */}
                  <TableRow className="bg-amber-100 hover:bg-amber-100 border-t-2 border-amber-300 font-bold">
                    <TableCell className="py-4 text-amber-900 uppercase tracking-wider">Grand Total</TableCell>
                    <TableCell className="text-right text-amber-900 border-l border-amber-200">
                      {formatNumber((groupSummary || []).reduce((s: number, g: any) => s + g.inQty, 0))}
                    </TableCell>
                    <TableCell className="text-right text-amber-900">
                      {formatCurrency((groupSummary || []).reduce((s: number, g: any) => s + g.inVal, 0))}
                    </TableCell>
                    <TableCell className="text-right text-amber-900 border-l border-amber-200">
                      {formatNumber((groupSummary || []).reduce((s: number, g: any) => s + g.outQty, 0))}
                    </TableCell>
                    <TableCell className="text-right text-amber-900">
                      {formatCurrency((groupSummary || []).reduce((s: number, g: any) => s + g.outVal, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-0 shadow-xl bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                  Production Volume Trend
                </CardTitle>
                <CardDescription>Value of finished goods dispatched vs raw materials consumed</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="prodFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rmFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="producedValue" name="Finished Goods Value" fill="url(#prodFill)" stroke="#f59e0b" strokeWidth={3} />
                    <Area type="monotone" dataKey="rawMaterialCost" name="Raw Material Cost" fill="url(#rmFill)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-white flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-500" />
                  Top Finished Goods
                </CardTitle>
                <CardDescription>Highest value items dispatched</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-0 mt-4">
                <div className="divide-y divide-slate-100 px-6 max-h-[340px] overflow-y-auto custom-scrollbar">
                  {insights?.topProducts?.map((p: any, i: number) => (
                    <div key={i} className="py-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500">{formatQty(p.qty, p.unit)}</p>
                      </div>
                      <p className="font-bold text-amber-600">{formatCompact(p.value)}</p>
                    </div>
                  ))}
                  {(!insights?.topProducts || insights.topProducts.length === 0) && (
                    <div className="py-8 text-center text-slate-500 text-sm">No finished goods found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card className="border-0 shadow-xl bg-white flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-rose-500" />
                  Top Raw Materials Consumed
                </CardTitle>
                <CardDescription>Highest cost inputs to production</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights?.topRawMaterials?.slice(0, 10) || []} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" fontSize={12} stroke="#94a3b8" tickFormatter={(v) => formatCompact(v)} />
                    <YAxis dataKey="name" type="category" width={150} fontSize={11} fontWeight={500} tickFormatter={(v: string) => v.length > 20 ? v.substring(0, 18) + '...' : v} tick={{ fill: '#475569' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="value" name="Material Cost" radius={[0, 4, 4, 0]} barSize={20}>
                      {(insights?.topRawMaterials || []).map((rm: any, i: number) => (
                        <Cell key={i} fill="#f43f5e" className="hover:opacity-80 transition-opacity cursor-pointer" onClick={() => setSelectedItem(rm.name)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

        </div>
      )}

      {/* DRILL DOWN MODAL */}
      {selectedMetric && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden ring-1 ring-slate-200 animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Factory className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Production Log</h3>
                  <p className="text-slate-500 font-medium">Detailed Stock Journals & Manufacturing Vouchers</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMetric(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
              <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-600">Date</TableHead>
                      <TableHead className="font-semibold text-slate-600">Voucher Type</TableHead>
                      <TableHead className="font-semibold text-slate-600">Voucher No.</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600">Finished Goods Value</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600">Raw Material Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredTransactions().map((tx: any, idx: number) => {
                      let prodValue = 0;
                      let rmValue = 0;
                      (tx.voucher_inventory || []).forEach((inv: any) => {
                         if (inv.is_inward) prodValue += Number(inv.amount) || 0;
                         else rmValue += Number(inv.amount) || 0;
                      });
                      
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                          <TableCell className="font-medium text-slate-700">{format(new Date(tx.date), "dd MMM yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {tx.voucher_type_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600">{tx.voucher_number || '-'}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            {formatCurrency(prodValue)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-rose-600">
                            {formatCurrency(rmValue)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {getFilteredTransactions().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                          <Hammer className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-lg font-semibold text-slate-600">No Production Entries</p>
                          <p className="text-sm">We couldn't find any Stock Journals or Manufacturing Journals in this period.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ITEM DRILL DOWN MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-200 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-8 py-6 border-b bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedItem}</h3>
                  <p className="text-slate-500 font-medium">Consumption Detailed Ledger</p>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50/50 p-6 custom-scrollbar">
              <Card className="border-0 shadow-sm rounded-2xl overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-600">Date</TableHead>
                      <TableHead className="font-semibold text-slate-600">Voucher Type</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600">Quantity</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600">Value (Cost)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const ledger: any[] = [];
                      (detailedTransactions || []).forEach((tx: any) => {
                        (tx.voucher_inventory || []).forEach((inv: any) => {
                          if (inv.stock_item_name === selectedItem && !inv.is_inward) {
                            ledger.push({
                              date: tx.date,
                              vType: tx.voucher_type_name,
                              qty: Math.abs(Number(inv.actual_qty || inv.billed_qty) || 0),
                              val: Math.abs(Number(inv.amount) || 0)
                            });
                          }
                        });
                      });
                      
                      return ledger.map((item: any, idx: number) => (
                        <TableRow key={idx} className="hover:bg-slate-50 border-b border-slate-50 transition-colors">
                          <TableCell className="font-medium text-slate-700">{format(new Date(item.date), "dd MMM yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                              {item.vType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-600">{formatNumber(item.qty)}</TableCell>
                          <TableCell className="text-right font-bold text-rose-600">{formatCurrency(item.val)}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
