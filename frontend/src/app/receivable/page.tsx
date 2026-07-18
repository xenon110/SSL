'use client';

import React, { useEffect, useState, useMemo } from "react";
import { 
  Building2, Landmark, Wallet, AlertTriangle, FileText, X, Search, ChevronRight, ChevronDown, Phone, Mail, Clock, ShieldAlert, ArrowRight, TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function Page() {
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Expanded state for Groups (Level 1)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // Selected Customer (Level 3 Drawer)
  const [selectedParty, setSelectedParty] = useState<any | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/outstandings");
        if (res.ok) {
          const json = await res.json();
          setRawData(json);
          
          // Pre-expand groups by default
          const initialExpanded: Record<string, boolean> = {};
          (json.receivables || []).forEach((r: any) => {
            if (r.parentGroup) initialExpanded[r.parentGroup] = true;
          });
          setExpandedGroups(initialExpanded);
        }
      } catch (err) {
        console.error("Failed to load receivables:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const formatCompact = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 1, notation: "compact" }).format(val || 0);

  const formatPercent = (val: number) =>
    `${Number(val).toFixed(1)}%`;

  // Aggregate Receivables data by Parent Group
  const groupedData = useMemo(() => {
    if (!rawData?.receivables) return [];
    
    const groups: Record<string, any> = {};
    rawData.receivables.forEach((r: any) => {
      // Search filter
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                            (r.parentGroup || "").toLowerCase().includes(search.toLowerCase());
      if (search && !matchesSearch) return;

      const groupName = r.parentGroup || "Sundry Debtors";
      if (!groups[groupName]) {
        groups[groupName] = {
          name: groupName,
          totalPending: 0,
          totalOverdue: 0,
          parties: [],
          buckets: { 'Not Due': 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
        };
      }

      groups[groupName].parties.push(r);
      groups[groupName].totalPending += r.totalPending;
      groups[groupName].totalOverdue += r.totalOverdue;
      
      // Accumulate buckets
      Object.keys(groups[groupName].buckets).forEach(bKey => {
        groups[groupName].buckets[bKey] += (r.buckets[bKey] || 0);
      });
    });

    return Object.values(groups).sort((a: any, b: any) => b.totalPending - a.totalPending);
  }, [rawData, search]);

  const totalOutstanding = rawData?.kpis?.totalReceivables || 0;
  const overdueOutstanding = rawData?.kpis?.overdueReceivables || 0;
  const overduePercent = totalOutstanding > 0 ? (overdueOutstanding / totalOutstanding) * 100 : 0;

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center flex-col gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="text-sm font-semibold text-slate-500 tracking-wider">Loading Accounts Receivable Register...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-[1700px] mx-auto bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-600">
            Accounts Receivable Ledger
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Hierarchical drill-down of outstanding balances — synced live from Tally
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search customers or groups..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white border-slate-200 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-0 shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-50"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Outstanding</p>
                <h3 className="text-3xl font-black text-slate-800">{formatMoney(totalOutstanding)}</h3>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600"><Landmark className="h-6 w-6" /></div>
            </div>
            <p className="text-xs text-indigo-600 font-semibold mt-4">Total active accounts pending</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-transparent opacity-50"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Overdue Outstanding</p>
                <h3 className="text-3xl font-black text-rose-600">{formatMoney(overdueOutstanding)}</h3>
              </div>
              <div className="p-3 bg-rose-100 rounded-xl text-rose-600"><AlertTriangle className="h-6 w-6" /></div>
            </div>
            <p className="text-xs text-rose-600 font-semibold mt-4">Required follow-ups / collection efforts</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-50"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Overdue Ratio</p>
                <h3 className="text-3xl font-black text-amber-600">{formatPercent(overduePercent)}</h3>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl text-amber-600"><Clock className="h-6 w-6" /></div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 overflow-hidden">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${overduePercent}%` }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 border-0 shadow-lg text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">DSO (Days Sales Outstanding)</p>
                <h3 className="text-4xl font-black">45 Days</h3>
              </div>
              <div className="p-3 bg-indigo-500/30 rounded-xl text-indigo-100"><TrendingUp className="h-6 w-6" /></div>
            </div>
            <p className="text-xs text-indigo-100/80 font-semibold mt-4">Industry benchmark: 35 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tree Grid */}
      <Card className="border-0 shadow-xl bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 p-6">
          <CardTitle className="text-lg font-black text-slate-800">Hierarchical Outstanding Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-10"></TableHead>
                <TableHead className="font-bold text-slate-700 text-sm">Customer / Group Name</TableHead>
                <TableHead className="font-bold text-slate-700 text-sm text-right">Credit Limit</TableHead>
                <TableHead className="font-bold text-slate-700 text-sm text-center">Credit Days</TableHead>
                <TableHead className="font-bold text-slate-700 text-sm text-right">Total Outstanding</TableHead>
                <TableHead className="font-bold text-slate-700 text-sm text-right text-rose-600">Overdue Amount</TableHead>
                <TableHead className="font-bold text-slate-700 text-sm text-center">Oldest Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                    No active accounts found matching search filters.
                  </TableCell>
                </TableRow>
              ) : (
                groupedData.map((group: any) => {
                  const isExpanded = !!expandedGroups[group.name];
                  return (
                    <React.Fragment key={group.name}>
                      {/* Level 1: Group Row */}
                      <TableRow 
                        onClick={() => toggleGroup(group.name)}
                        className="cursor-pointer bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors border-b border-slate-100 font-semibold"
                      >
                        <TableCell className="p-4 text-center">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-indigo-600 transition-transform" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-400 transition-transform" />
                          )}
                        </TableCell>
                        <TableCell className="text-indigo-900 font-bold text-base flex items-center gap-2">
                          <Building2 className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                          {group.name}
                          <Badge variant="outline" className="ml-2 text-indigo-600 border-indigo-200 bg-indigo-50/50">
                            {group.parties.length} accounts
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-slate-400 font-medium">—</TableCell>
                        <TableCell className="text-center text-slate-400 font-medium">—</TableCell>
                        <TableCell className="text-right font-black text-slate-800 text-base">
                          {formatMoney(group.totalPending)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-600 text-base">
                          {formatMoney(group.totalOverdue)}
                        </TableCell>
                        <TableCell className="text-center text-slate-400 font-medium">—</TableCell>
                      </TableRow>

                      {/* Level 2: Customers under this Group */}
                      {isExpanded && group.parties.map((party: any) => (
                        <TableRow 
                          key={party.name}
                          onClick={() => setSelectedParty(party)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 group"
                        >
                          <TableCell></TableCell>
                          <TableCell className="pl-6 py-3.5 font-bold text-slate-700 group-hover:text-indigo-600 flex items-center justify-between">
                            <span className="truncate max-w-sm">{party.name}</span>
                            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 mr-4 shrink-0" />
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-600">
                            {party.creditLimit > 0 ? formatMoney(party.creditLimit) : "No Limit"}
                          </TableCell>
                          <TableCell className="text-center font-medium text-slate-600">
                            {party.creditDays > 0 ? `${party.creditDays} days` : "0 days"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-800">
                            {formatMoney(party.totalPending)}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${party.totalOverdue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {party.totalOverdue > 0 ? formatMoney(party.totalOverdue) : "₹0"}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {party.totalOverdue > 0 ? (
                              <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50/50 font-bold">
                                {party.oldestBillDays} days
                              </Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Level 3: Pending Bills Slide-Over Drawer */}
      {selectedParty && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedParty(null)} 
          />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-3xl transform bg-white shadow-2xl transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
              {/* Drawer Header */}
              <div className="sticky top-0 z-20 bg-slate-50 border-b p-6 flex justify-between items-center shadow-sm">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <FileText className="text-indigo-600 h-6 w-6" />
                    Pending Bill Register
                  </h2>
                  <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-wide">
                    {selectedParty.name}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedParty(null)}
                  className="p-3 hover:bg-slate-200 rounded-full transition-colors group bg-white border border-slate-200 shadow-sm"
                >
                  <X className="h-5 w-5 text-slate-500 group-hover:text-slate-800" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-130px)]">
                {/* Customer Contact & Terms */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Credit Policy</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">Days Limit:</span>
                      <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">{selectedParty.creditDays || 0} days</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">Amount Limit:</span>
                      <span className="text-sm font-bold text-indigo-600">
                        {selectedParty.creditLimit > 0 ? formatMoney(selectedParty.creditLimit) : "Unlimited"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 border-l border-slate-200 pl-4">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Contact Info</p>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{selectedParty.phone || "No phone listed"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{selectedParty.email || "No email listed"}</span>
                    </div>
                  </div>
                </div>

                {/* Aging Summary Card */}
                <div className="bg-white border border-slate-100 shadow-md rounded-xl p-6">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">Aging Breakdown</h4>
                  <div className="grid grid-cols-5 gap-3 text-center">
                    {Object.entries(selectedParty.buckets).map(([bucket, amount]: any) => (
                      <div key={bucket} className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{bucket}</p>
                        <p className={`text-sm font-black mt-1 ${Number(amount) > 0 && bucket !== 'Not Due' ? 'text-rose-600' : 'text-slate-800'}`}>
                          {formatCompact(amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table of Bills */}
                <div className="space-y-3">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Outstanding Bills</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700 text-xs">Date</TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs">Bill Ref</TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs">Type</TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs text-right">Amount</TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs text-right text-rose-600">Overdue Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedParty.bills.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-slate-400 font-semibold">
                              No outstanding bills on account.
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedParty.bills.map((bill: any, idx: number) => (
                            <TableRow key={idx} className="border-b last:border-0 hover:bg-slate-50">
                              <TableCell className="text-xs font-semibold text-slate-600">{bill.bill_date}</TableCell>
                              <TableCell className="text-xs font-bold text-slate-800 select-all">{bill.bill_name}</TableCell>
                              <TableCell className="text-xs font-medium uppercase">
                                <Badge variant="outline" className={`text-[10px] ${
                                  bill.bill_type === 'advance' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}>
                                  {bill.bill_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-bold text-slate-800 text-right">
                                {formatMoney(bill.pending_amount)}
                              </TableCell>
                              <TableCell className={`text-xs font-bold text-right ${bill.overdueDays > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                {bill.overdueDays > 0 ? (
                                  <span className="flex items-center justify-end gap-1 font-black">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    {bill.overdueDays} days
                                  </span>
                                ) : (
                                  "Not Due"
                                )}
                              </TableCell>
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
        </div>
      )}
    </div>
  );
}
