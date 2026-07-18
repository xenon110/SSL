'use client';

import { useState } from 'react';
import { X, Sparkles, AlertCircle, BrainCircuit, Activity, RotateCw, CheckCircle2, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface KPI {
  label: string;
  value: string;
  subtitle: string;
  isPositive?: boolean;
}

interface MainChart {
  title: string;
  subtitle: string;
  metric1Name: string;
  metric2Name: string;
  labels: string[];
  metric1Data: number[];
  metric2Data: number[];
}

interface DualBarChart {
  title: string;
  subtitle: string;
  dataset1Name: string;
  dataset2Name: string;
  labels: string[];
  dataset1Data: number[];
  dataset2Data: number[];
}

interface HorizontalBar {
  title: string;
  subtitle: string;
  items: { name: string; value: number }[];
}

interface TableRow {
  name: string;
  rating: string;
  metric: string;
  remarks: string;
  isCritical?: boolean;
}

interface TableData {
  title: string;
  subtitle: string;
  headers: string[];
  rows: TableRow[];
}

interface Recommendation {
  id: number;
  text: string;
}

interface Rationale {
  title: string;
  content?: string;
  bullets?: string[];
}

interface AIAnalysis {
  pageTitle: string;
  snapshotDate: string;
  forecastHorizon: string;
  topKPIs: KPI[];
  mainChart: MainChart;
  barChart: DualBarChart;
  horizontalBarChart: HorizontalBar;
  table: TableData;
  recommendations: Recommendation[];
  logicRationale: Rationale[];
  error?: string;
  details?: string;
}

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  analysis: AIAnalysis | null;
}

const formatCurrency = (value: number) => {
  if (value === undefined || value === null) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: 'compact'
  }).format(value);
};

export function AIAnalysisModal({ isOpen, onClose, loading, analysis }: AIAnalysisModalProps) {
  const [isRationaleOpen, setIsRationaleOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#F8FAFC] animate-in fade-in duration-300 overflow-hidden font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 shrink-0 flex items-center justify-between shadow-sm z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1 transition-colors">
              ← Back to Dashboard
            </button>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
              {analysis?.pageTitle || "AI Predictions Report"}
            </h1>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" /> Gemini AI Active
            </span>
          </div>
          {analysis && (
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mt-2 tracking-wide uppercase">
              <span>Snapshot Cumulative Date: <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{analysis.snapshotDate}</span></span>
              <span className="text-slate-300">|</span>
              <span>Forecast Recovery Horizon: <span className="bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">{analysis.forecastHorizon}</span></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
            <RotateCw className="w-4 h-4" />
            Regenerate Forecast
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors border border-transparent hover:border-slate-200">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8FAFC]/80 backdrop-blur-sm z-50">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl relative mb-6">
              <div className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20"></div>
              <BrainCircuit className="h-12 w-12 text-indigo-600 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Analyzing Data & Generating Forecasts</h2>
            <p className="text-slate-500 font-medium">Please wait while Gemini processes the intelligence report...</p>
          </div>
        ) : analysis?.error ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <AlertCircle className="w-20 h-20 text-rose-500 mb-4" />
            <h3 className="text-3xl font-black text-slate-800">Analysis Failed</h3>
            <p className="text-slate-500 text-lg text-center max-w-2xl">{analysis.error}</p>
          </div>
        ) : analysis ? (
          <div className="max-w-[1600px] mx-auto p-8 space-y-8 animate-in slide-in-from-bottom-8 duration-700 pb-24">
            
            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {analysis.topKPIs?.map((kpi, idx) => (
                <Card key={idx} className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{kpi.label}</h4>
                    <p className={`text-3xl font-black mb-3 ${kpi.isPositive === true ? 'text-indigo-600' : kpi.isPositive === false ? 'text-rose-500' : 'text-amber-500'}`}>
                      {kpi.value}
                    </p>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{kpi.subtitle}</p>
                  </div>
                  <Activity className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-50 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
                </Card>
              ))}
            </div>

            {/* Main Area Chart */}
            {analysis.mainChart && (
              <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-xl">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      {analysis.mainChart.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{analysis.mainChart.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>{analysis.mainChart.metric1Name}</div>
                    <div className="flex items-center gap-1.5 text-rose-600"><div className="w-2 h-2 rounded-full bg-rose-500"></div>{analysis.mainChart.metric2Name}</div>
                    <div className="flex items-center gap-1.5 text-indigo-600"><div className="w-4 border-t-2 border-dashed border-indigo-500"></div>Net Surplus</div>
                  </div>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysis.mainChart.labels.map((l, i) => ({
                      name: l,
                      m1: analysis.mainChart.metric1Data[i],
                      m2: analysis.mainChart.metric2Data[i]
                    }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorM1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorM2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} tickFormatter={formatCurrency} />
                      <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="m1" stroke="#10b981" strokeWidth={2} fill="url(#colorM1)" activeDot={{ r: 6 }} />
                      <Area type="monotone" dataKey="m2" stroke="#f43f5e" strokeWidth={2} fill="url(#colorM2)" activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Side by Side Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Bar Chart */}
              {analysis.barChart && (
                <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-xl">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                    {analysis.barChart.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">{analysis.barChart.subtitle}</p>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysis.barChart.labels.map((l, i) => ({
                        name: l,
                        d1: analysis.barChart.dataset1Data[i],
                        d2: analysis.barChart.dataset2Data[i]
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} tickFormatter={formatCurrency} />
                        <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{ fill: '#f8fafc' }} />
                        <Legend iconType="square" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
                        <Bar dataKey="d1" name={analysis.barChart.dataset1Name} fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="d2" name={analysis.barChart.dataset2Name} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* Horizontal Bar Chart */}
              {analysis.horizontalBarChart && (
                <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-xl flex flex-col">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <Activity className="w-5 h-5 text-purple-500" />
                    {analysis.horizontalBarChart.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-6">{analysis.horizontalBarChart.subtitle}</p>
                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    {analysis.horizontalBarChart.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                          <span className="truncate pr-4">{item.name}</span>
                        </div>
                        <div className="h-10 w-full bg-slate-100 rounded overflow-hidden flex">
                          <div 
                            className={`h-full transition-all duration-1000 ease-out ${item.value > 80 ? 'bg-rose-500' : item.value > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max(item.value, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold text-slate-400 border-t border-slate-100 pt-2 mt-4">
                      <span>0</span>
                      <span>25</span>
                      <span>50</span>
                      <span>75</span>
                      <span>100</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Table */}
            {analysis.table && (
              <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-xl">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  {analysis.table.title}
                </h3>
                <p className="text-sm text-slate-500 mb-6">{analysis.table.subtitle}</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        {analysis.table.headers.map((h, i) => (
                          <th key={i} className="pb-4 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.table.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pr-4 font-bold text-slate-800">{row.name}</td>
                          <td className="py-4 pr-4">
                            <span className={`text-sm font-bold ${row.isCritical ? 'text-rose-500' : 'text-amber-500'}`}>
                              {row.rating}
                            </span>
                          </td>
                          <td className="py-4 pr-4 font-bold text-indigo-600">{row.metric}</td>
                          <td className="py-4 text-sm font-medium text-slate-600 leading-relaxed">{row.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Recommendations */}
            {analysis.recommendations && (
              <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-xl">
                <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5" />
                  Actionable Recommendations
                </h3>
                <p className="text-sm text-slate-500 mb-6">Optimizing cash inflow netting and protecting corporate treasury balances.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl p-5 flex items-start gap-4 hover:border-indigo-200 hover:shadow-md transition-all bg-slate-50/50">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0">
                        {rec.id}
                      </div>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed pt-1">{rec.text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-center">
                  <Button 
                    onClick={() => setIsRationaleOpen(true)}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold py-6 px-8 rounded-xl shadow-lg shadow-purple-600/20 text-lg transition-transform hover:scale-105"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Why this Prediction? (View AI Rationale)
                  </Button>
                </div>
              </Card>
            )}

          </div>
        ) : null}
      </div>

      {/* Logic Rationale Modal */}
      <Dialog open={isRationaleOpen} onOpenChange={setIsRationaleOpen}>
        <DialogContent className="max-w-3xl rounded-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-0 shadow-2xl">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7C3AED]" />
              AI Projections Logic
            </DialogTitle>
          </div>
          <div className="p-8 overflow-y-auto bg-white space-y-6">
            {analysis?.logicRationale?.map((rationale, idx) => (
              <div key={idx} className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <Activity className={`w-4 h-4 ${idx % 2 === 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                  {rationale.title}
                </h4>
                <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 shadow-sm">
                  {rationale.content && (
                    <p className="text-slate-600 font-medium leading-relaxed">{rationale.content}</p>
                  )}
                  {rationale.bullets && (
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                      {rationale.bullets.map((bullet, i) => (
                        <li key={i} className="text-slate-600 font-medium">{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-white flex justify-end shrink-0">
            <Button onClick={() => setIsRationaleOpen(false)} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold px-8 rounded-full">
              Understood, Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
