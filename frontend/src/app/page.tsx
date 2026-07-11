"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

export default function CorporateWebsite() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for transparent navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-900 overflow-hidden">
      
      {/* Navbar - Logo Only */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-md py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className={`h-8 w-8 ${scrolled ? 'text-blue-900' : 'text-white'}`} />
            <span className={`text-2xl font-black tracking-tight ${scrolled ? 'text-blue-900' : 'text-white'}`}>
              BKM <span className="font-light">Industries</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center overflow-hidden bg-black">
        {/* 3D Spline Background */}
        <div className="absolute inset-0 z-0">
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
          <div className="absolute inset-0">
            <SplineScene 
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </div>
          {/* Subtle overlay to ensure text remains readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent pointer-events-none"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 fill-mode-both">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 font-semibold text-xs tracking-widest uppercase mb-6 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Pioneering Industrial Excellence
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
              Engineering Excellence Across Industries.
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed font-light">
              Solutions that seal quality — powering industries across packaging, engineering, and renewable energy.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => router.push('/portal')} size="lg" className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-10 h-14 text-lg font-semibold shadow-lg shadow-blue-900/50">
                Owner Board <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
