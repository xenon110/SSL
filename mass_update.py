import os
import re

app_dir = r"c:\Users\yashs\Downloads\Tally\frontend\src\app"

template = """"use client";

import React, { useEffect, useState } from "react";
import { GenericDashboardView } from "@/components/layout/GenericDashboardView";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function {component_name}() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/universal-metrics?type={folder_name}');
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
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
        <p className="mt-4 text-lg font-medium text-slate-600 animate-pulse">Loading Live Intelligence...</p>
      </div>
    );
  }

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
      <GenericDashboardView title="{dashboard_title}" data={data} />
    </div>
  );
}
"""

skip_folders = ["api", "login", "portal", "sales", "revenue", "executive", "select-company", "settings"]

for folder in os.listdir(app_dir):
    if folder in skip_folders:
        continue
    
    page_path = os.path.join(app_dir, folder, "page.tsx")
    if os.path.exists(page_path):
        with open(page_path, "r", encoding="utf-8") as f:
            content = f.read()
            
            if "mockData" in content and "GenericDashboardView" in content:
                # Extract component name
                comp_match = re.search(r"export default function\s+([A-Za-z0-9_]+)\s*\(", content)
                comp_name = comp_match.group(1) if comp_match else "DashboardPage"
                
                # Extract title
                title_match = re.search(r'title="([^"]+)"', content)
                dash_title = title_match.group(1) if title_match else "Dashboard"
                
                new_content = template.replace("{component_name}", comp_name)
                new_content = new_content.replace("{folder_name}", folder)
                new_content = new_content.replace("{dashboard_title}", dash_title)
                
                with open(page_path, "w", encoding="utf-8") as out_f:
                    out_f.write(new_content)
                print(f"Updated {folder}/page.tsx")
