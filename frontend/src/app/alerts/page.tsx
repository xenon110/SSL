"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Activity, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AlertsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/universal-metrics?type=alerts');
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
      return <div className="p-8 flex justify-center items-center h-64"><RefreshCw className="animate-spin text-slate-400 w-8 h-8" /></div>;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <div className="bg-red-50 p-6 rounded-2xl max-w-md border border-red-100 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Live Data Yet</h3>
          <p className="text-slate-600 mb-6 text-sm">
            {error || "Your Tally sync agent hasn't pushed the data to the database yet."}
          </p>
          <Button onClick={fetchMetrics} className="bg-indigo-600 hover:bg-indigo-700">
            <RefreshCw className="w-4 h-4 mr-2" /> Check Again
          </Button>
        </div>
      </div>
    );
  }

  // Separate the alerts from the Key Indicators
  const keyIndicators = data["Key Indicators"] || {};
  const alertKeys = Object.keys(data).filter(k => k !== "Key Indicators");

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      
      <div className="flex justify-between items-end border-b pb-4">
          <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
                  <Activity className="w-8 h-8 text-indigo-600 mr-3" />
                  Live Business Alerts
              </h1>
              <p className="text-slate-500 mt-2 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
                  Monitoring Tally Data Stream
              </p>
          </div>
          <Button onClick={fetchMetrics} variant="outline" className="text-slate-600">
             <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {alertKeys.map((key) => {
            const val = String(data[key]);
            
            let bg = "bg-slate-100";
            let border = "border-slate-200";
            let titleText = "text-slate-500";
            let mainText = "text-slate-800";
            let Icon = Info;
            let iconBg = "bg-white/60";
            let iconColor = "text-slate-500";
            let shadow = "shadow-slate-200/50";
            
            if (val.includes("CRITICAL")) {
                bg = "bg-gradient-to-br from-red-500 to-rose-600";
                border = "border-red-600";
                titleText = "text-red-100/80";
                mainText = "text-white";
                Icon = XCircle;
                iconBg = "bg-white/20";
                iconColor = "text-white";
                shadow = "shadow-red-500/40 shadow-xl";
            } else if (val.includes("WARNING")) {
                bg = "bg-gradient-to-br from-amber-400 to-orange-500";
                border = "border-amber-500";
                titleText = "text-amber-100/80";
                mainText = "text-white";
                Icon = AlertTriangle;
                iconBg = "bg-white/20";
                iconColor = "text-white";
                shadow = "shadow-orange-500/40 shadow-xl";
            } else if (val.includes("HEALTHY")) {
                bg = "bg-gradient-to-br from-emerald-400 to-teal-500";
                border = "border-emerald-500";
                titleText = "text-emerald-50/80";
                mainText = "text-white";
                Icon = CheckCircle;
                iconBg = "bg-white/20";
                iconColor = "text-white";
                shadow = "shadow-emerald-500/40 shadow-xl";
            }

            let displayVal = val.replace(/^(CRITICAL:|WARNING:|HEALTHY:?)\s*/i, '').trim();
            if (!displayVal) displayVal = "Optimal Status";

            return (
                <div key={key} className={`p-6 rounded-2xl border ${bg} ${border} ${shadow} flex items-start space-x-4 transition-all hover:scale-105 duration-300`}>
                    <div className={`p-3 rounded-xl backdrop-blur-md ${iconBg} ${iconColor}`}>
                        <Icon className="w-7 h-7" />
                    </div>
                    <div>
                        <h4 className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${titleText}`}>{key}</h4>
                        <p className={`text-xl font-extrabold tracking-tight ${mainText}`}>
                           {displayVal}
                        </p>
                    </div>
                </div>
            )
        })}
      </div>

      {Object.keys(keyIndicators).length > 0 && (
          <div className="mt-12 bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40">
              <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center">
                 <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                 Underlying Financial Drivers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  {Object.entries(keyIndicators).map(([key, val]: any) => (
                      <div key={key} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                          <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">{key}</p>
                          <p className="text-3xl font-black text-slate-900 tracking-tight">
                             {typeof val === 'number' ? (
                                 key.toLowerCase().includes("ratio") ? `${val.toLocaleString()}x` : (val > 1000 || val < -1000 ? `₹${val.toLocaleString()}` : val.toLocaleString())
                             ) : val}
                          </p>
                      </div>
                  ))}
              </div>
          </div>
      )}

    </div>
  );
}
