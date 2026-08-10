import React, { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, TrendingUp, DollarSign, AlertCircle, PieChart as PieChartIcon, BarChart3, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#0ea5e9', '#14b8a6', '#ec4899'];

interface GenericDashboardViewProps {
  title: string;
  data: Record<string, any>;
}

export function GenericDashboardView({ title, data }: GenericDashboardViewProps) {
  // Separate scalar values (numbers/strings) from arrays
  const metrics: { key: string; value: string | number }[] = [];
  const lists: { key: string; items: any[] }[] = [];
  const objects: { key: string; value: Record<string, any> }[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      lists.push({ key, items: value });
    } else if (typeof value === "object" && value !== null) {
      objects.push({ key, value });
    } else {
      metrics.push({ key, value });
    }
  });

  const formatKey = (str: string) => {
    return str
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/_/g, " ");
  };

  const formatValue = (val: any) => {
    if (typeof val === "number") {
      // Basic formatting for numbers
      return val.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        style: val > 1000 ? "currency" : "decimal",
        currency: "INR",
      }).replace("₹", "₹ ");
    }
    return val;
  };

  // Automatically build chart data from numeric metrics
  const chartData = useMemo(() => {
    return metrics
      .filter((m) => typeof m.value === 'number' && m.value > 0)
      .filter((m) => !m.key.toLowerCase().includes('total')) // exclude totals so they don't skew the chart
      .map((m) => ({
        name: formatKey(m.key),
        value: m.value as number,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // top 10 items for readability
  }, [metrics]);

  // Helper to pick an icon based on the key
  const getIconForMetric = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('revenue') || k.includes('sales') || k.includes('profit')) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (k.includes('expense') || k.includes('cost') || k.includes('payable')) return <DollarSign className="h-4 w-4 text-rose-500" />;
    if (k.includes('customer') || k.includes('user')) return <Users className="h-4 w-4 text-blue-500" />;
    if (k.includes('alert') || k.includes('due') || k.includes('shortage')) return <AlertCircle className="h-4 w-4 text-amber-500" />;
    if (k.includes('ratio') || k.includes('margin') || k.includes('%')) return <PieChartIcon className="h-4 w-4 text-indigo-500" />;
    return <Activity className="h-4 w-4 text-slate-400" />;
  };

  // Helper to format the value visually (e.g. badges for alerts)
  const renderValue = (val: any, key: string) => {
    if (typeof val === 'string' && val.includes('🟡')) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 mt-1 px-3 py-1 text-sm">{val}</Badge>;
    }
    if (typeof val === 'string' && (val.includes('%') || val.includes('Days'))) {
      return <span className="text-indigo-600 dark:text-indigo-400">{val}</span>;
    }
    return formatValue(val);
  };

  return (
    <div className="flex-1 space-y-6 pb-8 px-2 animate-in fade-in duration-700">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
            {title}
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Intelligence Board
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-both">
        
        {/* Metrics Row */}
        {metrics.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, i) => {
              const Icon = getIconForMetric(metric.key);
              
              const gradients = [
                "from-blue-500 to-indigo-600 shadow-blue-500/20",
                "from-emerald-400 to-teal-600 shadow-emerald-500/20",
                "from-rose-400 to-pink-600 shadow-rose-500/20",
                "from-amber-400 to-orange-600 shadow-amber-500/20",
                "from-purple-500 to-fuchsia-600 shadow-purple-500/20",
                "from-cyan-400 to-blue-600 shadow-cyan-500/20",
              ];
              const gradient = gradients[i % gradients.length];
              
              return (
                <Card 
                  key={metric.key}
                  className={`relative overflow-hidden border-0 shadow-lg bg-gradient-to-br ${gradient} text-white transition-all hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] duration-300 group`}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-white/80 group-hover:text-white transition-colors">
                      {formatKey(metric.key)}
                    </CardTitle>
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm text-white">
                      {/* Override Icon color to white */}
                      {React.cloneElement(Icon as React.ReactElement<any>, { className: "h-5 w-5 text-white" })}
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 pt-2">
                    <div className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                      {renderValue(metric.value, metric.key)}
                    </div>
                  </CardContent>
                  
                  {/* Decorative background element */}
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-500"></div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Visualizations Area */}
        {chartData.length > 2 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 mt-8">
            {/* Smarter Pie Chart */}
            <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl transition-all hover:shadow-2xl">
              <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-indigo-500" />
                  Key Metrics Distribution
                </CardTitle>
                <CardDescription>Visual breakdown of top scalar values</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        // Only take the top 5 positive values to prevent label overlapping
                        data={chartData.filter(d => d.value > 0).slice(0, 5)} 
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => percent > 0.02 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                        labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                      >
                        {chartData.filter(d => d.value > 0).slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => formatValue(value)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Smarter Bar Chart */}
            <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl transition-all hover:shadow-2xl">
              <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Performance & Analysis (Positive vs Negative)
                </CardTitle>
                <CardDescription>Comparison of all key metrics</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                        axisLine={false} 
                        tickLine={false} 
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => {
                          const absVal = Math.abs(val);
                          const sign = val < 0 ? '-' : '';
                          if (absVal >= 10000000) return `${sign}₹${(absVal / 10000000).toFixed(1)}Cr`;
                          if (absVal >= 100000) return `${sign}₹${(absVal / 100000).toFixed(1)}L`;
                          if (absVal >= 1000) return `${sign}₹${(absVal / 1000).toFixed(1)}K`;
                          return `${sign}${absVal}`;
                        }} 
                      />
                      <RechartsTooltip 
                        formatter={(value: any) => formatValue(value)}
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                        {chartData.map((entry, index) => {
                          // Green for positive, Red for negative
                          const color = entry.value >= 0 ? '#10b981' : '#f43f5e';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Nested Objects (e.g. breakdown tables converted to charts) */}
        {objects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {objects.map((obj) => {
              // Convert object to array for Recharts and take top 15 to avoid squishing
              const objChartData = Object.entries(obj.value)
                .map(([k, v]) => ({ name: formatKey(k), value: Number(v) || 0 }))
                .filter(item => item.value !== 0)
                .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                .slice(0, 15); // Top 15 is best for readability
                
              const isSmallBreakdown = objChartData.length <= 5;
              const dynamicHeight = Math.max(220, objChartData.length * 35 + 40);
                
              return (
                <Card key={obj.key} className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl transition-all hover:shadow-2xl flex flex-col">
                  <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 pb-3 pt-4 px-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      {isSmallBreakdown ? <PieChartIcon className="h-4 w-4 text-indigo-500" /> : <BarChart3 className="h-4 w-4 text-indigo-500" />}
                      {formatKey(obj.key)} {objChartData.length > 5 ? "(Top 15)" : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 flex flex-col justify-center">
                    <div style={{ height: isSmallBreakdown ? 220 : dynamicHeight, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        {isSmallBreakdown ? (
                           <PieChart>
                             <Pie
                               data={objChartData.filter(d => d.value > 0)}
                               cx="50%"
                               cy="50%"
                               innerRadius={50}
                               outerRadius={75}
                               paddingAngle={5}
                               dataKey="value"
                               label={({ name, percent }) => percent > 0.01 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                               labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                             >
                               {objChartData.filter(d => d.value > 0).map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                               ))}
                             </Pie>
                             <RechartsTooltip 
                               formatter={(value: any) => formatValue(value)}
                               contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                             />
                           </PieChart>
                        ) : (
                          <BarChart data={objChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} 
                              axisLine={false} 
                              tickLine={false} 
                              width={120}
                              interval={0}
                            />
                            <RechartsTooltip 
                              formatter={(value: any) => formatValue(value)}
                              cursor={{ fill: '#f1f5f9' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                              {objChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Lists / Data Tables */}
        {lists.length > 0 && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {lists.map((list) => {
              if (list.items.length === 0) return null;
              const columns = Object.keys(list.items[0]);

              return (
                <Card key={list.key} className="col-span-1 border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden transition-all hover:shadow-2xl">
                  <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50 pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-indigo-500" />
                      {formatKey(list.key)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80">
                          <TableRow>
                            {columns.map((col) => (
                              <TableHead key={col} className="text-xs font-semibold text-slate-500">{formatKey(col)}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {list.items.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              {columns.map((col) => (
                                <TableCell key={col} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {formatValue(item[col])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function GenericDashboardSkeleton() {
  return (
    <div className="flex-1 space-y-6 pb-8 px-2 p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg mb-2"></div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* KPI Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/50 relative overflow-hidden">
               <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 mt-8">
          <div className="h-[380px] bg-slate-200 dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/50"></div>
          <div className="h-[380px] bg-slate-200 dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/50"></div>
        </div>
      </div>
    </div>
  );
}
