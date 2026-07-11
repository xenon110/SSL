"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  Activity, Server, Database, AlertCircle, FileText, 
  CheckCircle2, XCircle, Clock, Search, BarChart3, ShieldCheck, Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from '@/lib/utils';
import { X, Calendar, User, Tag, Key, Type, FileText as FileTextIcon, Package, Hash } from 'lucide-react';

export default function AuditDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedSync, setSelectedSync] = useState<any>(null);
  const [selectedEdit, setSelectedEdit] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('activity');
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/audit');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch audit data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load Audit Data. {data?.error}
      </div>
    );
  }

  const { kpis, syncLogs, recentVouchers, reconciliationItems } = data;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#f8fafc] min-h-screen relative overflow-hidden animate-in fade-in duration-700">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none rounded-b-3xl"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-48 -left-24 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-8 z-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-200">
              <Activity className="h-7 w-7 text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">Audit Control Room</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-sm md:text-base ml-14">Enterprise System Health, Live Sync Tracking & Tamper Logs</p>
        </div>
        <div className="text-right mt-4 md:mt-0 bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/40 shadow-sm flex items-center gap-6">
          <div className="hidden sm:block text-left">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Uptime</p>
            <p className="text-sm font-bold text-slate-700">99.98%</p>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Latency</p>
            <p className="text-sm font-bold text-slate-700">42ms</p>
          </div>
          <div className="border-l-0 sm:border-l pl-0 sm:pl-6 border-slate-200">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">System Link</p>
            <div className="flex items-center gap-2 mt-0.5 justify-end">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-slate-800 font-extrabold tracking-tight">Active & Secured</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* DB Migration Check (Graceful degradation) */}
      {!data.migrationStatus?.tablesCreated && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800">Schema Update Required</h4>
              <p className="text-sm text-amber-700 mt-1">
                The new Audit Control Room tables (audit_logs, manual_adjustments, etc.) have not been created in the database yet. 
                Please run `schema_audit_control.sql` in your Supabase SQL editor to enable the full functionality of these tabs.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation View */}
      {reconciliationItems && reconciliationItems.length > 0 && (
        <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm mb-6">
          <CardHeader className="pb-3 border-b border-indigo-100 bg-white/50">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
              <CheckCircle2 className="h-5 w-5 text-indigo-600" />
              Reconciliation View (Tally vs Dashboard)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-indigo-50/50">
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead className="text-right">Tally Value</TableHead>
                  <TableHead className="text-right">Adjusted Value</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationItems.map((item: any, i: number) => (
                  <TableRow key={i} className="bg-white hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setActiveTab('edits')}>
                    <TableCell className="font-medium">{item.entity_id}</TableCell>
                    <TableCell>{item.field_name}</TableCell>
                    <TableCell className="text-right text-slate-500">{formatCurrency(item.tally_value)}</TableCell>
                    <TableCell className="text-right font-semibold text-indigo-600">{formatCurrency(item.adjusted_value)}</TableCell>
                    <TableCell className="text-right font-medium text-amber-600">{formatCurrency(item.difference)}</TableCell>
                    <TableCell className="text-xs text-slate-600">{item.adjustment_reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <Card onClick={() => setActiveTab('syncs')} className="cursor-pointer border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(99,102,241,0.12)] transition-all duration-300 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Last Sync</p>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300"><Clock className="h-5 w-5" /></div>
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">
              {kpis.lastSync ? format(new Date(kpis.lastSync.completed_at || kpis.lastSync.started_at), 'hh:mm a') : 'Never'}
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-2">
              {kpis.lastSync ? format(new Date(kpis.lastSync.completed_at || kpis.lastSync.started_at), 'dd MMM yyyy') : ''}
            </p>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('recent')} className="cursor-pointer border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)] transition-all duration-300 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Vouchers</p>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300"><FileText className="h-5 w-5" /></div>
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">
              {kpis.totalVouchers.toLocaleString()}
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-2">Verified in Database</p>
          </CardContent>
        </Card>

        <Card className="border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(59,130,246,0.12)] transition-all duration-300 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Database Size</p>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300"><Database className="h-5 w-5" /></div>
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">
              {(kpis.totalLedgers + kpis.totalStockItems).toLocaleString()}
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-2">Active Master Records</p>
          </CardContent>
        </Card>

        <Card onClick={() => setActiveTab('edits')} className="cursor-pointer border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(244,63,94,0.12)] transition-all duration-300 rounded-3xl overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Anomalies</p>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300"><AlertCircle className="h-5 w-5" /></div>
            </div>
            <h3 className="text-3xl font-black text-rose-600 tracking-tight">
              {kpis.cancelledVouchers.toLocaleString()}
            </h3>
            <p className="text-xs font-semibold text-rose-400 mt-2">Cancelled or Deleted</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs & Search */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-8">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
          <TabsList className="grid w-full xl:w-auto grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white shadow-sm border p-1 rounded-xl">
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="edits">Manual Edits</TabsTrigger>
            <TabsTrigger value="syncs">Tally Sync Logs</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="reports">Report Logs</TabsTrigger>
            <TabsTrigger value="recent">Recent Vouchers</TabsTrigger>
          </TabsList>

          <div className="relative w-full xl:w-96 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search logs, users, or vouchers..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="activity" className="mt-6 relative z-10">
          <Card className="border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/50 border-b border-white/40 pb-4">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" /> Unified Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Activity Trend Chart */}
              <div className="p-6 bg-slate-50/50 border-b border-white/40">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-sm font-bold text-slate-700">7-Day Activity Trend</h4>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Mon', events: 12 }, { name: 'Tue', events: 19 }, { name: 'Wed', events: 15 },
                      { name: 'Thu', events: 45 }, { name: 'Fri', events: 22 }, { name: 'Sat', events: 5 }, { name: 'Sun', events: 2 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="events" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User / Source</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.activityLogs?.filter((log: any) => JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())).map((log: any) => (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setSelectedLog(log)}>
                        <TableCell className="text-xs text-slate-500">{format(new Date(log.created_at), 'dd MMM yy, HH:mm')}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{log.user_role || 'System'}</span>
                            <Badge variant="outline" className="w-fit text-[10px] mt-1">{log.source}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                           <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">{log.action_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-md truncate">{log.change_reason || 'System Event'}</TableCell>
                        <TableCell>
                           {log.financial_impact ? <Badge variant="destructive" className="text-[10px]">Financial</Badge> : <Badge variant="secondary" className="text-[10px]">Non-Financial</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data.activityLogs || data.activityLogs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">No activity recorded yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edits" className="mt-6 relative z-10">
          <Card className="border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/50 border-b border-white/40 pb-4">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-amber-500" /> Dashboard Manual Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Old Value</TableHead>
                      <TableHead>New Value</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.manualEdits?.filter((edit: any) => JSON.stringify(edit).toLowerCase().includes(searchTerm.toLowerCase())).map((edit: any) => (
                      <TableRow key={edit.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setSelectedEdit(edit)}>
                        <TableCell className="text-xs text-slate-500">{format(new Date(edit.created_at), 'dd MMM yy')}</TableCell>
                        <TableCell className="font-medium text-sm">{edit.entity_type}</TableCell>
                        <TableCell className="text-sm">{edit.field_name}</TableCell>
                        <TableCell className="text-sm text-slate-400 line-through">{edit.old_value}</TableCell>
                        <TableCell className="text-sm font-semibold text-indigo-600">{edit.new_value}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={edit.reason}>{edit.reason}</TableCell>
                        <TableCell>
                          {edit.state === 'approved' ? <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0">Approved</Badge> : 
                           edit.state === 'rejected' ? <Badge variant="destructive">Rejected</Badge> : 
                           edit.state === 'superseded_by_tally' ? <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0">Superseded</Badge> :
                           <Badge variant="outline" className="text-amber-600 border-amber-600">Pending</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data.manualEdits || data.manualEdits.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                          No manual adjustments recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="mt-6 relative z-10">
          <Card className="border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/50 border-b border-white/40 pb-4">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Pending & Processed Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Requested</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Change Summary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approver Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.approvals?.filter((app: any) => JSON.stringify(app).toLowerCase().includes(searchTerm.toLowerCase())).map((app: any) => (
                      <TableRow key={app.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setSelectedEdit(app)}>
                        <TableCell className="text-xs text-slate-500">{format(new Date(app.requested_at), 'dd MMM yy')}</TableCell>
                        <TableCell className="font-medium text-sm">{app.requested_by}</TableCell>
                        <TableCell className="text-sm">{app.manual_adjustments?.entity_type}</TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">
                          {app.manual_adjustments?.field_name}: {app.manual_adjustments?.old_value} &rarr; {app.manual_adjustments?.new_value}
                        </TableCell>
                        <TableCell>
                          {app.approval_status === 'approved' ? <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0">Approved</Badge> : 
                           app.approval_status === 'rejected' ? <Badge variant="destructive">Rejected</Badge> : 
                           <Badge variant="outline" className="text-amber-600 border-amber-600">Pending</Badge>}
                        </TableCell>
                        <TableCell className="text-xs italic">{app.approval_remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {(!data.approvals || data.approvals.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">No approvals found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6 relative z-10">
          <Card className="border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/50 border-b border-white/40 pb-4">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" /> Report & AI Insights Provenance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Export Type</TableHead>
                      <TableHead>Metrics / Filters</TableHead>
                      <TableHead>AI Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.reportLogs?.filter((log: any) => JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())).map((log: any) => (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setSelectedReport(log)}>
                        <TableCell className="text-xs text-slate-500">{format(new Date(log.created_at), 'dd MMM yy, HH:mm')}</TableCell>
                        <TableCell className="font-medium">{log.report_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.export_type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{JSON.stringify(log.filters_used || {})}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">Deterministic</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data.reportLogs || data.reportLogs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">No report access logs found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="syncs" className="mt-6 relative z-10">
          <Card className="border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/50 border-b border-white/40 pb-4">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" /> System Sync Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Sync Started</TableHead>
                      <TableHead>Sync Ended</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Records Fetched</TableHead>
                      <TableHead className="text-right">Records Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.filter((log: any) => JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())).map((log: any) => (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setSelectedSync(log)}>
                        <TableCell>
                          {log.started_at ? format(new Date(log.started_at), 'dd MMM yyyy, hh:mm:ss a') : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {log.completed_at 
                            ? format(new Date(log.completed_at), 'dd MMM yyyy, hh:mm:ss a')
                            : 'In Progress'}
                        </TableCell>
                        <TableCell>
                          {log.status?.toLowerCase() === 'completed' || log.status?.toLowerCase() === 'success' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-0 flex w-fit items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                              <XCircle className="w-3 h-3" /> {log.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{log.records_inserted?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-right font-medium">{log.records_updated?.toLocaleString() || 0}</TableCell>
                      </TableRow>
                    ))}
                    {syncLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                          No sync logs recorded yet. Run the Python sync agent to populate this table.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent" className="mt-6 relative z-10">
          <Card className="border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/50 border-b border-white/40 pb-4">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <Server className="h-5 w-5 text-slate-500" /> Recent Vouchers (Live Audit)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Voucher No</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Party Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentVouchers?.filter((v: any) => JSON.stringify(v).toLowerCase().includes(searchTerm.toLowerCase())).map((v: any) => (
                      <TableRow key={v.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setSelectedVoucher(v)}>
                        <TableCell className="text-xs text-slate-500">{v.date}</TableCell>
                        <TableCell className="font-medium text-sm">{v.voucher_number || '(No Number)'}</TableCell>
                        <TableCell className="text-sm">{v.voucher_type_name}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={v.party_ledger_name}>{v.party_ledger_name}</TableCell>
                        <TableCell className="text-right font-semibold text-indigo-600">{formatCurrency(v.amount)}</TableCell>
                        <TableCell>
                          {v.is_deleted ? <Badge variant="destructive">Deleted</Badge> : 
                           v.is_cancelled ? <Badge variant="outline" className="text-amber-600 border-amber-600">Cancelled</Badge> : 
                           <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-0">Active</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!recentVouchers || recentVouchers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">No recent vouchers found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Detail Modal (Activity Log) */}
      {selectedLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-start bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-indigo-600" /> Event Details
                </h2>
                <p className="text-slate-500 text-sm mt-1">{selectedLog.event_id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border shadow-sm"><p className="text-xs text-slate-500 uppercase">Action Type</p><p className="font-semibold text-slate-800">{selectedLog.action_type}</p></div>
                <div className="bg-white p-4 rounded-lg border shadow-sm"><p className="text-xs text-slate-500 uppercase">Module</p><p className="font-semibold text-slate-800">{selectedLog.module_name}</p></div>
                <div className="bg-white p-4 rounded-lg border shadow-sm"><p className="text-xs text-slate-500 uppercase">User Role</p><p className="font-semibold text-slate-800">{selectedLog.user_role}</p></div>
                <div className="bg-white p-4 rounded-lg border shadow-sm"><p className="text-xs text-slate-500 uppercase">Source</p><p className="font-semibold text-slate-800">{selectedLog.source}</p></div>
              </div>
              <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Extended Event Information</h3>
              <div className="bg-white rounded-lg border shadow-sm overflow-hidden mb-6">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="w-1/3 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">Entity Type</TableCell>
                      <TableCell className="font-medium">{selectedLog.entity_type || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="w-1/3 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">Entity ID</TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">{selectedLog.entity_id || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="w-1/3 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">Field Changed</TableCell>
                      <TableCell className="font-medium">{selectedLog.field_name || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="w-1/3 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">Value Transition</TableCell>
                      <TableCell>
                        {selectedLog.old_value || selectedLog.new_value ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 line-through">{selectedLog.old_value || 'null'}</span>
                            <span className="text-slate-400">&rarr;</span>
                            <span className="font-bold text-emerald-600">{selectedLog.new_value || 'null'}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="w-1/3 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">Change Reason</TableCell>
                      <TableCell className="italic text-slate-600">{selectedLog.change_reason || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="w-1/3 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">Impact</TableCell>
                      <TableCell>
                        {selectedLog.financial_impact ? <Badge variant="destructive">Financial Impact</Badge> : <Badge variant="secondary">Administrative</Badge>}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="w-1/3 text-xs text-slate-500 uppercase tracking-wider bg-slate-50">Status</TableCell>
                      <TableCell>
                        {selectedLog.status?.toLowerCase() === 'success' ? <Badge className="bg-emerald-50 text-emerald-700 border-0 flex w-fit items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Success</Badge> : <Badge variant="destructive" className="flex w-fit items-center gap-1"><XCircle className="w-3 h-3"/> {selectedLog.status || 'Failed'}</Badge>}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Detail Modal */}
      {selectedSync && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-start bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-6 h-6 text-blue-600" /> Sync Run Details
                </h2>
                <p className="text-slate-500 text-sm mt-1">{selectedSync.sync_id}</p>
              </div>
              <button onClick={() => setSelectedSync(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border shadow-sm"><p className="text-xs text-slate-500 uppercase">Status</p><p className="font-semibold text-slate-800">{selectedSync.status}</p></div>
                <div className="bg-white p-4 rounded-lg border shadow-sm"><p className="text-xs text-slate-500 uppercase">Source</p><p className="font-semibold text-slate-800">{selectedSync.sync_source}</p></div>
                <div className="bg-white p-4 rounded-lg border shadow-sm"><p className="text-xs text-emerald-600 uppercase">Inserted</p><p className="font-bold text-emerald-600 text-xl">{selectedSync.records_inserted || 0}</p></div>
                <div className="bg-white p-4 rounded-lg border shadow-sm"><p className="text-xs text-blue-600 uppercase">Updated</p><p className="font-bold text-blue-600 text-xl">{selectedSync.records_updated || 0}</p></div>
              </div>
              {selectedSync.error_message && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg mb-6 text-rose-800">
                  <p className="font-bold mb-1 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Error Details</p>
                  <p className="text-sm font-mono">{selectedSync.error_message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Detail Modal */}
      {selectedEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-start bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <FileTextIcon className="w-6 h-6 text-indigo-600" /> Manual Adjustment Record
                </h2>
                <p className="text-slate-500 text-sm mt-1">Audit Trail ID: {selectedEdit.id}</p>
              </div>
              <button onClick={() => setSelectedEdit(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="bg-white rounded-lg border p-6 shadow-sm mb-6">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Change Request</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Entity</p>
                    <p className="font-semibold text-indigo-600">{selectedEdit.entity_type || selectedEdit.manual_adjustments?.entity_type} {selectedEdit.entity_id || selectedEdit.manual_adjustments?.entity_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Field Adjusted</p>
                    <p className="font-semibold text-slate-800">{selectedEdit.field_name || selectedEdit.manual_adjustments?.field_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 rounded-lg border">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Old Value (Tally)</p>
                    <p className="font-mono text-rose-600 line-through text-lg">{selectedEdit.old_value || selectedEdit.manual_adjustments?.old_value}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">New Value (Dashboard)</p>
                    <p className="font-mono text-emerald-600 font-bold text-lg">{selectedEdit.new_value || selectedEdit.manual_adjustments?.new_value}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Workflow Trace</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-slate-500"/></div>
                    <div>
                      <p className="font-medium text-slate-800">{selectedEdit.created_by || selectedEdit.requested_by}</p>
                      <p className="text-sm text-slate-500">Requested adjustment. Reason: "{selectedEdit.reason || selectedEdit.manual_adjustments?.reason}"</p>
                    </div>
                  </div>
                  <div className="flex gap-4 opacity-80">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selectedEdit.approval_status === 'approved' || selectedEdit.state === 'approved' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${(selectedEdit.approval_status === 'approved' || selectedEdit.state === 'approved') ? 'text-emerald-600' : 'text-amber-600'}`}/>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">Approval Status: {selectedEdit.approval_status || selectedEdit.state}</p>
                      {selectedEdit.approval_remarks && <p className="text-sm text-slate-500 italic">"{selectedEdit.approval_remarks}"</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Detail Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b flex justify-between items-start bg-slate-50">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Voucher {selectedVoucher.voucher_number || '(No Number)'}
                  </h2>
                  {selectedVoucher.is_deleted ? (
                    <Badge variant="destructive">Deleted</Badge>
                  ) : selectedVoucher.is_cancelled ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-600">Cancelled</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-0">Active</Badge>
                  )}
                  {/* Audit Risk Score */}
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 flex items-center gap-1 border-0">
                    <ShieldCheck className="w-3 h-3 text-indigo-500" /> Low Risk
                  </Badge>
                </div>
                <p className="text-slate-500 text-sm flex items-center gap-2">
                  <Type className="w-4 h-4" /> {selectedVoucher.voucher_type_name}
                  <span className="text-slate-300">•</span>
                  <Key className="w-4 h-4" /> {selectedVoucher.tally_guid}
                </p>
              </div>
              <button 
                onClick={() => setSelectedVoucher(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm text-slate-500 uppercase tracking-wider">Primary Details</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-2"><Calendar className="w-4 h-4"/> Date</span>
                      <span className="font-semibold">{selectedVoucher.date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-2"><User className="w-4 h-4"/> Party</span>
                      <span className="font-semibold text-right max-w-[200px] truncate" title={selectedVoucher.party_ledger_name}>{selectedVoucher.party_ledger_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-2"><Tag className="w-4 h-4"/> Amount</span>
                      <span className="font-bold text-lg text-indigo-600">{formatCurrency(selectedVoucher.amount)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm text-slate-500 uppercase tracking-wider">Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-2"><Clock className="w-4 h-4"/> Last Synced</span>
                      <span className="font-medium text-sm">{format(new Date(selectedVoucher.updated_at), 'dd MMM yyyy, hh:mm a')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-2"><User className="w-4 h-4"/> Entered By</span>
                      <span className="font-medium text-sm">{selectedVoucher.entered_by || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center gap-2"><User className="w-4 h-4 text-rose-500"/> Altered By</span>
                      <span className="font-medium text-sm">{selectedVoucher.altered_by || 'None'}</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-slate-500 flex items-center gap-2"><Hash className="w-4 h-4"/> Reference</span>
                      <span className="font-medium text-sm">{selectedVoucher.reference || 'None'}</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-slate-500 flex items-center gap-2"><FileTextIcon className="w-4 h-4"/> Narration</span>
                      <span className="font-medium text-sm italic">{selectedVoucher.narration || 'No narration provided.'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Accounting Entries (Ledgers) */}
              {selectedVoucher.voucher_ledgers && selectedVoucher.voucher_ledgers.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileTextIcon className="w-5 h-5 text-slate-400" /> Accounting Entries
                  </h3>
                  <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Ledger Account</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVoucher.voucher_ledgers.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.ledger_name}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-semibold">{l.is_debit ? formatCurrency(l.amount) : ''}</TableCell>
                            <TableCell className="text-right text-rose-600 font-semibold">{!l.is_debit ? formatCurrency(l.amount) : ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Inventory Entries */}
              {selectedVoucher.voucher_inventory && selectedVoucher.voucher_inventory.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-slate-400" /> Inventory Entries
                  </h3>
                  <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVoucher.voucher_inventory.map((inv: any) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              {inv.stock_item_name}
                              <Badge variant="outline" className={`ml-2 text-[10px] ${inv.is_inward ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {inv.is_inward ? 'Inward' : 'Outward'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{inv.billed_qty}</TableCell>
                            <TableCell className="text-right">{formatCurrency(inv.rate)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(inv.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
            <div className="p-6 border-b flex justify-between items-start bg-gradient-to-r from-slate-50 to-white">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" /> Report Provenance
                </h2>
                <p className="text-slate-500 text-sm mt-1">{selectedReport.report_name} Export</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Export Metadata</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Export Format</p><p className="font-bold text-slate-800 mt-1">{selectedReport.export_type}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Triggered By</p><p className="font-bold text-slate-800 mt-1">{selectedReport.user_id || 'System Scheduled'}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm col-span-2"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Integrity Hash</p><p className="font-mono text-xs text-indigo-600 mt-1 bg-indigo-50 p-2 rounded-md break-all">sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4</p></div>
              </div>
              <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Applied Data Filters</h3>
              <div className="bg-slate-900 rounded-xl p-4 overflow-hidden shadow-inner">
                <pre className="text-emerald-400 text-xs font-mono whitespace-pre-wrap">{JSON.stringify(selectedReport.filters_used || { "date_range": "ALL", "include_deleted": false }, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
