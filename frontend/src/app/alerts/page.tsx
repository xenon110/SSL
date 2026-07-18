'use client';

import { useEffect, useState } from "react";
import { GenericDashboardView } from "@/components/layout/GenericDashboardView";

export default function Page() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/alerts");
        if (res.ok) {
          const json = await res.json();
          setAlerts(json);
        }
      } catch (err) {
        console.error("Failed to load alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <GenericDashboardView 
      title="Alerts & Notifications" 
      data={{ activeAlerts: alerts }} 
    />
  );
}
