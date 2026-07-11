"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import React from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/' || pathname === '/portal') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="p-4 sm:ml-64">
        <Topbar />
        <main className="p-4 rounded-lg mt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
