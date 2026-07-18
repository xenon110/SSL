"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, Activity, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Set the auth token cookie so our middleware lets us through
        document.cookie = `auth-token=${data.session.access_token}; path=/; max-age=86400`;
        document.cookie = `active-company=SMRIDHI%20SPONGE%20LIMITED%20-%20%28from%201-Apr-24%29%20-%20%28from%201-Apr-25%29; path=/; max-age=86400`;
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Password reset email sent! Check your inbox.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-indigo-100/50 blur-[100px]" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-blue-100/50 blur-[80px]" />
      </div>

      <div className="w-full max-w-5xl flex rounded-3xl overflow-hidden shadow-2xl z-10 bg-white">
        {/* Left Side: Presentation */}
        <div className="hidden lg:flex flex-col flex-1 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          
          <div className="relative z-10">
            <h2 className="text-4xl font-black tracking-tighter mb-4 flex items-center gap-2">
              Samridhi<span className="text-indigo-200">Prime</span>
            </h2>
            <p className="text-xl font-medium text-indigo-100 mb-12">
              Enterprise Financial Intelligence
            </p>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center space-y-8">
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Real-time Analytics</h3>
                <p className="text-indigo-200 text-sm mt-1">Get instant insights into your financial health with synced Tally data.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Cash Flow Monitoring</h3>
                <p className="text-indigo-200 text-sm mt-1">Track receivables and payables automatically to optimize liquidity.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Audit & Compliance</h3>
                <p className="text-indigo-200 text-sm mt-1">Keep track of every edit and deletion with built-in audit logs.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 p-8 sm:p-12 lg:p-16 bg-white flex flex-col justify-center relative">
          <div className="max-w-sm w-full mx-auto space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
              <p className="text-slate-500 mt-2">Sign in to your SamridhiPrime account to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Username or Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <a href="#" onClick={handleForgotPassword} className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <ShieldCheck className="h-4 w-4" />
                  {error}
                </div>
              )}

              {message && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <ShieldCheck className="h-4 w-4" />
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-200 group relative overflow-hidden"
                disabled={isLoading}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? "Signing in..." : "Sign in"}
                  {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </span>
                <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              </Button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
