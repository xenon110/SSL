"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowRight, BarChart3, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import BackgroundScene from "@/components/ui/aurora-section-hero";

export default function PortalLauncher() {
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const fullName = user.user_metadata?.full_name || "User";
          setUserName(fullName.split(" ")[0]); // Get first name
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-emerald-400 font-semibold">Loading Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Back Button */}
      <div className="absolute top-8 left-8 z-50">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-black/50 hover:bg-black/80 px-4 py-2 rounded-full border border-slate-800 backdrop-blur-md"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Back to Home</span>
        </button>
      </div>

      {/* Aurora Background */}
      <BackgroundScene beamCount={60} />

      <div className="z-10 w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
        {/* Welcome Section (Left Side) */}
        <div className="flex-1 text-center md:text-left animate-in fade-in slide-in-from-left-8 duration-700">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Welcome to,<br/>
            <span className="text-emerald-400">Samridhi Prime</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 font-medium max-w-md">
            Select an application module to continue to your secure workspace.
          </p>
        </div>

        {/* Apps Grid / Button (Right Side) */}
        <div className="flex-1 flex justify-center md:justify-end animate-in fade-in slide-in-from-right-8 duration-700 delay-150 w-full">
          {/* Main Tally Analytics App */}
          <Card 
            onClick={() => router.push("/login")}
            className="w-full max-w-sm group cursor-pointer border border-emerald-500/20 bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(0,255,127,0.1)] hover:shadow-[0_0_40px_rgba(0,255,127,0.3)] hover:-translate-y-2 transition-all duration-500 rounded-3xl overflow-hidden"
          >
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500 mb-6">
                <BarChart3 className="w-12 h-12 text-black" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Samridhi Prime</h2>
              <p className="text-sm text-slate-400 mb-8">
                Financial Intelligence, Stock Summary, and Data Analytics.
              </p>
              <div className="flex items-center text-emerald-400 font-bold group-hover:gap-4 gap-2 transition-all">
                Launch Application <ArrowRight className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
