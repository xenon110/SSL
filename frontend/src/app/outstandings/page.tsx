"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowDownRight, ArrowUpRight, Clock, AlertTriangle, 
  X, Receipt, AlertCircle, RefreshCcw, HandCoins, Search, Sparkles,
  Activity, ShieldAlert, Filter, ChevronLeft, ChevronRight, Download, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export default function OutstandingsDashboard() {
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
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [selectedBucket, setSelectedBucket] = useState<{ bucket: string, parties: any[], type: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [recPage, setRecPage] = useState(1);
  const [payPage, setPayPage] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        let url = '/api/outstandings';
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
        if (params.toString()) url += '?' + params.toString();

        const res = await fetch(url);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to fetch outstandings:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [dateRange]);

  const predictionUrl = React.useMemo(() => {
    let url = '/outstandings/prediction';
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    if (params.toString()) url += '?' + params.toString();
    return url;
  }, [dateRange]);

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center min-h-screen text-slate-500"><RefreshCcw className="animate-spin mr-2" /> Loading Outstandings...</div>;
  }

  const { kpis, receivables, payables } = data || {};

  const renderAgeingChart = (parties: any[], color: string, type: string) => {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    parties.forEach(p => {
      buckets['0-30'] += p.buckets['0-30'] || 0;
      buckets['31-60'] += p.buckets['31-60'] || 0;
      buckets['61-90'] += p.buckets['61-90'] || 0;
      buckets['90+'] += p.buckets['90+'] || 0;
    });
    const chartData = [
      { name: '0-30 Days', value: buckets['0-30'] },
      { name: '31-60 Days', value: buckets['31-60'] },
      { name: '61-90 Days', value: buckets['61-90'] },
      { name: '90+ Days', value: buckets['90+'] }
    ];

    return (
      <div className="h-48 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} cursor={{ fill: '#f8fafc' }} />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              className="cursor-pointer"
              onClick={(data) => {
                if (!data || !data.name) return;
                const bucketKey = data.name.replace(' Days', '');
                const matchingParties = parties.filter(p => p.buckets[bucketKey] && p.buckets[bucketKey] > 0);
                setSelectedBucket({ bucket: bucketKey, parties: matchingParties, type });
              }}
            >
              {chartData.map((_, i) => <Cell key={i} fill={color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderPartyTable = (parties: any[], type: 'receivable' | 'payable') => {
    const isRec = type === 'receivable';
    const page = isRec ? recPage : payPage;
    const setPage = isRec ? setRecPage : setPayPage;
    
    // Filter parties by search term
    const filteredParties = parties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(filteredParties.length / pageSize));
    const paginatedParties = filteredParties.slice((page - 1) * pageSize, page * pageSize);

    return (
      <div className="flex flex-col">
        <div className="overflow-x-auto rounded-t-xl border border-slate-100 bg-white">
          <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-100">
              <TableHead className="font-semibold text-slate-600">Party</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Pending</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Overdue</TableHead>
              <TableHead className="text-right font-semibold text-slate-600">Oldest Bill</TableHead>
              {isRec && <TableHead className="text-right font-semibold text-slate-600">Limit Used</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedParties.map((p, i) => {
              const limitUsed = p.creditLimit > 0 ? (p.totalPending / p.creditLimit) * 100 : 0;
              const isOverLimit = limitUsed >= 100;
              const isNearLimit = limitUsed >= 80 && !isOverLimit;
              
              return (
                <TableRow 
                  key={i} 
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${p.totalOverdue > 0 ? 'bg-red-50/20' : ''}`}
                  onClick={() => setSelectedParty(p)}
                >
                  <TableCell>
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    {p.phone && <div className="text-xs text-slate-500 mt-1">{p.phone}</div>}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-700">
                    {formatCurrency(p.totalPending)}
                    {p.advances > 0 && <div className="text-xs text-emerald-600">(-{formatCurrency(p.advances)} Adv)</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.totalOverdue > 0 ? (
                      <span className="text-red-600 font-semibold">{formatCurrency(p.totalOverdue)}</span>
                    ) : <span className="text-slate-400">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.oldestBillDays > 0 ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{p.oldestBillDays}d</Badge>
                    ) : <span className="text-slate-400">-</span>}
                  </TableCell>
                  {isRec && (
                    <TableCell className="text-right">
                      {p.creditLimit > 0 ? (
                        <Badge variant="outline" className={`${
                          isOverLimit ? 'bg-red-100 text-red-700 border-red-300' :
                          isNearLimit ? 'bg-amber-100 text-amber-700 border-amber-300' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {limitUsed.toFixed(0)}%
                        </Badge>
                      ) : <span className="text-slate-400 text-xs">No limit</span>}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filteredParties.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No parties found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-t-0 border-slate-100 rounded-b-xl mt-auto">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, filteredParties.length)}</span> of <span className="font-medium">{filteredParties.length}</span>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="px-3 py-1 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              className="px-3 py-1 text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </div>
    );
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-indigo-600" />
            Outstandings
          </h1>
          <p className="text-slate-500 mt-1">
            Receivables vs Payables, Bill-wise Tracking
            {kpis?.asOnDate && <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">As on {format(new Date(kpis.asOnDate), 'dd MMM yyyy')}</span>}
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <a
            href={predictionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-lg shadow-md hover:scale-102 active:scale-98 transition-all duration-200"
          >
            <Sparkles className="h-4 w-4 text-white animate-pulse" />
            AI Future Prediction
          </a>
          <div className="bg-white/50 dark:bg-slate-900/50 p-1 rounded-lg border shadow-sm backdrop-blur-sm">
            <DateRangePicker value={dateRange} onDateChange={setDateRange} />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search party by name..." 
              className="pl-9 bg-white border-slate-200 shadow-sm rounded-lg h-10" 
              value={searchTerm} 
              onChange={e => {
                setSearchTerm(e.target.value);
                setRecPage(1);
                setPayPage(1);
              }} 
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">Total Receivables</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(kpis?.totalReceivables || 0)}</h3>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">Overdue Receivables</p>
            <h3 className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(kpis?.overdueReceivables || 0)}</h3>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">Total Payables</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-2">{formatCurrency(kpis?.totalPayables || 0)}</h3>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">Overdue Payables</p>
            <h3 className="text-2xl font-bold text-orange-600 mt-2">{formatCurrency(kpis?.overduePayables || 0)}</h3>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-indigo-600 text-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-indigo-200">Net Position (Rec - Pay)</p>
            <h3 className="text-2xl font-bold mt-2">{formatCurrency(kpis?.netPosition || 0)}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Receivables Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-emerald-500">
            <ArrowDownRight className="h-6 w-6 text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-800">Accounts Receivable</h2>
          </div>
          
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm text-slate-500">Ageing Analysis (Overdue)</CardTitle>
            </CardHeader>
            <CardContent>
              {renderAgeingChart(receivables || [], '#10b981', 'Receivables')}
            </CardContent>
          </Card>

          {renderPartyTable(receivables || [], 'receivable')}
        </div>

        {/* Payables Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-rose-500">
            <ArrowUpRight className="h-6 w-6 text-rose-500" />
            <h2 className="text-xl font-bold text-slate-800">Accounts Payable</h2>
          </div>
          
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm text-slate-500">Ageing Analysis (Overdue)</CardTitle>
            </CardHeader>
            <CardContent>
              {renderAgeingChart(payables || [], '#f43f5e', 'Payables')}
            </CardContent>
          </Card>

          {renderPartyTable(payables || [], 'payable')}
        </div>
      </div>

      {/* Drill-down Modal */}
      {selectedParty && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-slate-200 animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between px-8 py-6 border-b bg-slate-50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedParty.group === 'receivable' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedParty.name}</h3>
                  <p className="text-slate-500 font-medium">
                    Bill-wise Details • {selectedParty.phone || 'No Phone'} • {selectedParty.email || 'No Email'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedParty(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/50 p-6 custom-scrollbar">
              <Table className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-slate-600">Bill Date</TableHead>
                    <TableHead className="font-semibold text-slate-600">Reference / Type</TableHead>
                    <TableHead className="font-semibold text-slate-600">Due Date</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Pending Amount</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedParty.bills.map((b: any, idx: number) => {
                    const isAdvance = b.bill_type === 'advance' || Number(b.pending_amount) < 0;
                    const val = Math.abs(Number(b.pending_amount));
                    return (
                      <TableRow key={idx} className={`hover:bg-slate-50 ${b.overdueDays > 0 ? 'bg-red-50/30' : ''}`}>
                        <TableCell className="font-medium text-slate-700">{format(new Date(b.bill_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-800">{b.bill_ref}</div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{b.bill_type.replace('_', ' ')}</div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {b.due_date ? format(new Date(b.due_date), 'dd MMM yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800">
                          {formatCurrency(val)} {isAdvance ? '(Cr)' : '(Dr)'}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdvance ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Advance</Badge>
                          ) : b.overdueDays > 0 ? (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 gap-1">
                              <AlertCircle className="w-3 h-3" /> Overdue by {b.overdueDays}d
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                              <Clock className="w-3 h-3 mr-1 inline" /> Not Due
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Selected Bucket Modal */}
      {selectedBucket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${selectedBucket.type === 'Receivables' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <Clock className={`h-6 w-6 ${selectedBucket.type === 'Receivables' ? 'text-emerald-700' : 'text-red-700'}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedBucket.type} - {selectedBucket.bucket} Days Overdue
                  </h2>
                  <p className="text-slate-500 font-medium">
                    Parties with outstanding amounts in this bucket
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedBucket(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/50 p-6 custom-scrollbar">
              <Table className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-slate-600">Party Name</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Amount in Bucket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBucket.parties.map((p: any, idx: number) => {
                    const amt = p.buckets[selectedBucket.bucket];
                    return (
                      <TableRow key={idx} className="hover:bg-slate-50">
                        <TableCell className="font-semibold text-slate-800">{p.name}</TableCell>
                        <TableCell className="text-right font-bold text-slate-800">
                          {formatCurrency(amt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {selectedBucket.parties.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-slate-500">No parties found in this bucket</TableCell>
                    </TableRow>
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
