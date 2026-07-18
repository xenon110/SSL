'use client';

import { useEffect, useState } from "react";
import { GenericDashboardView } from "@/components/layout/GenericDashboardView";

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/compliance");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load compliance:", err);
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
      title="GST & Compliance" 
      data={data || { cgst_payable: 0, sgst_payable: 0, igst_payable: 0, itc_available: 0, net_liability: 0 }} 
    />
  );
}
