"use client";

import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Public routes that don't require authentication check
    const publicRoutes = ['/', '/login', '/portal'];
    if (publicRoutes.includes(pathname)) {
      setCheckingAuth(false);
      return;
    }

    // Check session for protected dashboard routes (/sales, /executive, /inventory, /home, etc.)
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        // Check for session in Supabase or fallback auth-token cookie
        const hasAuthToken = document.cookie.split(';').some((item) => item.trim().startsWith('auth-token='));

        if (!session && !hasAuthToken) {
          // Redirect unauthenticated users to login
          router.replace('/login');
          return;
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, [pathname, router]);

  if (pathname === '/login' || pathname === '/' || pathname === '/portal') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {children}
      </div>
    );
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-400 text-xs tracking-wider uppercase font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="p-4 sm:ml-20">
        <Topbar />
        <main className="p-4 rounded-lg mt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
