"use client";

import React, { useEffect, useState } from "react";
import { GenericDashboardView, GenericDashboardSkeleton } from "@/components/layout/GenericDashboardView";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BudgetPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/universal-metrics?type=budget');
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

  if (isLoading) return <GenericDashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <div className="bg-red-50 p-6 rounded-2xl max-w-md border border-red-100 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Live Data Yet</h3>
          <p className="text-slate-600 mb-6 text-sm">
            {error || "Your Tally sync agent hasn't pushed the data to the database yet. Please ensure the sync script is running."}
          </p>
          <Button onClick={fetchMetrics} className="bg-indigo-600 hover:bg-indigo-700">
            <RefreshCw className="w-4 h-4 mr-2" /> Check Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <GenericDashboardView title="Budget vs Actual" data={data} />
    </div>
  );
}
