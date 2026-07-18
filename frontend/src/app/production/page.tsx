"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Factory, Package, TrendingUp, X, Layers, Settings, Hammer, ChevronRight, ChevronDown, ArrowDownRight, ArrowUpRight, Activity, PieChart, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend, LabelList, PieChart as RechartsPieChart, Pie } from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AIAnalysisModal } from "@/components/ui/AIAnalysisModal";

export default function ProductionDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const d = new Date();
    const currentMonth = d.getMonth();
    const fyStartYear = currentMonth < 3 ? d.getFullYear() - 1 : d.getFullYear();
    return {
      from: new Date(fyStartYear, 3, 1),
      to: new Date(fyStartYear + 1, 2, 31)
    };
  });
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Formula Modal State
  const [activeFormula, setActiveFormula] = useState<{ title: string, formula: string, tallyPath: string, explanation: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        let url = '/api/production';
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
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

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const fetchAIAnalysis = async () => {
    setAiModalOpen(true);
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'production', data })
      });
      const result = await res.json();
      setAiAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
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
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchAIAnalysis}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all font-bold"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            AI Analysis
          </button>
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
            <DateRangePicker value={dateRange} onDateChange={setDateRange} />
          </div>
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
              className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer relative group"
              onClick={() => setSelectedMetric('Co Product / By Product')}
            >
              <CardContent className="p-6 relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute right-0 top-0 opacity-20 translate-x-4 -translate-y-4"><Package className="w-32 h-32" /></div>
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-amber-100 text-sm font-semibold uppercase tracking-wider mb-2">Co Product / By Product</p>
                  </div>
                  <h3 className="text-4xl font-black truncate" title={formatCurrency(data?.closingStockSummary?.['Co Product / By Product']?.value || 0)}>
                    {formatCurrency(data?.closingStockSummary?.['Co Product / By Product']?.value || 0)}
                  </h3>
                </div>
                <p className="text-amber-200 mt-2 text-sm font-medium">Closing Stock Value</p>
              </CardContent>
            </Card>

            <Card 
              className="border-0 shadow-lg bg-white hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => setSelectedMetric('Finished Goods')}
            >
              <CardContent className="p-6 h-full flex flex-col justify-between border-l-4 border-indigo-500">
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Finished Goods</p>
                  </div>
                  <h3 className="text-3xl font-black text-indigo-600 truncate" title={formatCurrency(data?.closingStockSummary?.['Finished Goods']?.value || 0)}>
                    {formatCurrency(data?.closingStockSummary?.['Finished Goods']?.value || 0)}
                  </h3>
                </div>
                <p className="text-slate-500 mt-2 text-sm">Closing Stock Value</p>
              </CardContent>
            </Card>

            <Card 
              className="border-0 shadow-lg bg-white hover:shadow-xl transition-all cursor-pointer group border-l-4 border-emerald-500"
              onClick={() => setSelectedMetric('Raw Material')}
            >
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Raw Material</p>
                  </div>
                  <h3 className="text-3xl font-black text-emerald-600 truncate" title={formatCurrency(data?.closingStockSummary?.['Raw Material']?.value || 0)}>
                    {formatCurrency(data?.closingStockSummary?.['Raw Material']?.value || 0)}
                  </h3>
                </div>
                <p className="text-slate-500 mt-2 text-sm">Closing Stock Value</p>
              </CardContent>
            </Card>

            <Card 
              className="border-0 shadow-lg bg-slate-900 text-white hover:shadow-xl transition-all relative overflow-hidden group cursor-pointer"
              onClick={() => setSelectedMetric('Store & Spares Parts')}
            >
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-2 translate-y-2"><Settings className="w-24 h-24" /></div>
              <CardContent className="p-6 relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Store & Spares Parts</p>
                  </div>
                  <h3 className="text-3xl font-black text-white truncate" title={formatCurrency(data?.closingStockSummary?.['Store & Spares Parts']?.value || 0)}>
                    {formatCurrency(data?.closingStockSummary?.['Store & Spares Parts']?.value || 0)}
                  </h3>
                </div>
                <p className="text-slate-400 mt-2 text-sm">Closing Stock Value</p>
              </CardContent>
            </Card>
          </div>

          {/* MAIN DASHBOARD INSIGHTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* OVERALL DISTRIBUTION PIE CHART */}
            <Card className="border-0 shadow-xl bg-white flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-indigo-500" />
                  Overall Value Distribution
                </CardTitle>
                <CardDescription>Closing Stock Value by Group</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center min-h-[350px]">
                {(() => {
                  const groups = Object.keys(data?.closingStockSummary || {}).map(key => ({
                    name: key,
                    value: data.closingStockSummary[key].value
                  })).filter(g => g.value > 0);
                  
                  if (groups.length === 0) return <div className="text-center text-slate-400 italic">No data available</div>;

                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <RechartsTooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        <Pie
                          data={groups}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                        >
                          {groups.map((entry: any, index: number) => {
                            const colors = ['#6366f1', '#10b981', '#f59e0b', '#0f172a'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>

            {/* TOP 10 OVERALL ITEMS */}
            <Card className="lg:col-span-2 border-0 shadow-xl bg-white flex flex-col overflow-hidden">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Activity className="h-5 w-5 text-rose-500" />
                  Top 10 Highest Value Items
                </CardTitle>
                <CardDescription>Across all stock groups in Tally</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table className="w-full text-sm">
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b-2 border-slate-200">
                      <TableHead className="py-4 font-semibold text-slate-700 w-[50%]">Item Name</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-700">Stock Group</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-slate-700">Quantity</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-slate-700">Closing Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const allItems: any[] = [];
                      Object.keys(data?.closingStockSummary || {}).forEach(groupName => {
                        const items = data.closingStockSummary[groupName].items || [];
                        items.forEach((item: any) => {
                          allItems.push({ ...item, groupName });
                        });
                      });
                      
                      const topItems = allItems.sort((a, b) => b.value - a.value).slice(0, 10);
                      
                      if (topItems.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center text-slate-400 italic">No items found in Stock Summary</TableCell>
                          </TableRow>
                        );
                      }
                      
                      return topItems.map((item: any, idx: number) => {
                        let badgeColor = 'bg-slate-100 text-slate-700';
                        if (item.groupName === 'Finished Goods') badgeColor = 'bg-indigo-100 text-indigo-700 border-indigo-200';
                        if (item.groupName === 'Raw Material') badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                        if (item.groupName === 'Co Product / By Product') badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                        
                        return (
                          <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                            <TableCell className="py-4 font-semibold text-slate-700">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-500">
                                  {idx + 1}
                                </div>
                                {item.name}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge variant="outline" className={`${badgeColor}`}>
                                {item.groupName}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 text-right font-medium text-slate-600">
                              {formatNumber(item.qty)} <span className="text-[10px] text-slate-400">{item.unit}</span>
                            </TableCell>
                            <TableCell className="py-4 text-right font-bold text-rose-600">
                              {formatCurrency(item.value)}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
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
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                    {selectedMetric} Insights
                  </h3>
                  <p className="text-slate-500 font-medium">Visual Analytics & KPI Breakdown</p>
                </div>
              </div>
              <button onClick={() => setSelectedMetric(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50/50 p-6 custom-scrollbar">
              {(() => {
                const groupData = data?.closingStockSummary?.[selectedMetric];
                const items = groupData?.items || [];
                const sortedItems = [...items].sort((a, b) => b.value - a.value);
                
                let themeColor = 'text-blue-500';
                let icon = <Package className="w-5 h-5 text-blue-500" />;
                if (selectedMetric === 'Finished Goods') { themeColor = 'text-indigo-500'; icon = <Package className="w-5 h-5 text-indigo-500" />; }
                if (selectedMetric === 'Raw Material') { themeColor = 'text-emerald-500'; icon = <Layers className="w-5 h-5 text-emerald-500" />; }
                if (selectedMetric === 'Co Product / By Product') { themeColor = 'text-amber-500'; icon = <Activity className="w-5 h-5 text-amber-500" />; }
                if (selectedMetric === 'Store & Spares Parts') { themeColor = 'text-slate-700'; icon = <Settings className="w-5 h-5 text-slate-700" />; }

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2 border-0 shadow-sm bg-white flex flex-col">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <PieChart className={`w-5 h-5 ${themeColor}`} /> {selectedMetric} Value Distribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[288px] flex items-center justify-center">
                          {sortedItems.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                              <RechartsPieChart>
                                <RechartsTooltip formatter={(value: any) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                <Pie
                                  data={sortedItems.slice(0, 10)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={70}
                                  outerRadius={90}
                                  paddingAngle={5}
                                  dataKey="value"
                                  nameKey="name"
                                >
                                  {sortedItems.slice(0, 10).map((entry: any, index: number) => {
                                    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9'];
                                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                  })}
                                </Pie>
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 italic">No items available</div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-sm bg-white flex flex-col">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">{icon} Top 3 Items</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-center">
                          <div className="space-y-4">
                            {sortedItems.slice(0, 3).map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center font-bold text-xs text-slate-600">
                                    #{idx + 1}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-700 transition-colors">{item.name}</p>
                                    <p className="text-xs text-slate-500 font-medium">{formatNumber(item.qty)} {item.unit}</p>
                                  </div>
                                </div>
                                <p className={`font-bold ${themeColor}`}>{formatCurrency(item.value)}</p>
                              </div>
                            ))}
                            {sortedItems.length === 0 && (
                              <div className="text-center text-slate-400 italic py-8">No items found</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="mt-6">
                      <Card className="border-0 shadow-sm bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">{icon} All Items Breakdown</CardTitle>
                        </CardHeader>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="font-semibold text-slate-600 text-xs">Item Name</TableHead>
                              <TableHead className="text-right font-semibold text-slate-600 text-xs">Quantity</TableHead>
                              <TableHead className="text-right font-semibold text-slate-600 text-xs">Closing Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedItems.map((item: any, idx: number) => (
                                <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                                  <TableCell className="font-semibold text-slate-700 text-xs py-3">{item.name}</TableCell>
                                  <TableCell className="text-right text-slate-600 font-medium text-xs py-3">
                                    {formatNumber(item.qty)} <span className="text-[10px] text-slate-400">{item.unit}</span>
                                  </TableCell>
                                  <TableCell className={`text-right font-bold text-xs py-3 ${themeColor}`}>
                                    {formatCurrency(item.value)}
                                  </TableCell>
                                </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}


      {/* FORMULA AUDIT MODAL */}
      {activeFormula && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setActiveFormula(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-200" />
                Formula Audit
              </h3>
              <button onClick={() => setActiveFormula(null)} className="text-indigo-200 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Metric</h4>
                <p className="text-slate-800 font-semibold text-lg">{activeFormula.title}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Calculation / Source</h4>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 font-mono text-sm text-indigo-700">
                  {activeFormula.formula}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tally Path Mapping</h4>
                <p className="text-slate-600 text-sm leading-relaxed flex items-start gap-2">
                  <ArrowUpRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  {activeFormula.tallyPath}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">What this tells you</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{activeFormula.explanation}</p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setActiveFormula(null)} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AIAnalysisModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)} 
        loading={aiLoading} 
        analysis={aiAnalysis} 
      />

    </div>
  );
}
