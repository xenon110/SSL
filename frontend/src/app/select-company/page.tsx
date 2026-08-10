"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, CheckCircle2, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SelectCompanyPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tally-companies');
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch companies from Tally");
      
      if (data.companies && data.companies.length > 0) {
        setCompanies(data.companies);
      } else {
        setError("No companies found in Tally. Please ensure a company is open in Tally.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Could not connect to Tally. Is Tally running in the background?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // We can keep this commented out or redirect to /executive
    // router.replace("/executive");
  }, [router]);

  const handleSelect = async (companyName: string) => {
    setSelectedCompany(companyName);
  };

  const handleContinue = async () => {
    if (!selectedCompany) return;
    
    setIsSyncing(true);

    // 1. Save the selected company in a cookie so the whole app knows which one is active
    document.cookie = `active-company=${encodeURIComponent(selectedCompany)}; path=/; max-age=86400`;

    // 2. Simulating a brief delay for the "sync" feel before redirecting
    setTimeout(() => {
      router.push("/executive");
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-indigo-100/50 blur-[100px]" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-blue-100/50 blur-[80px]" />
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl z-10 p-8 sm:p-12 relative">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
            Select Your Company
          </h1>
          <p className="text-slate-500">
            Choose a company to connect with Tally. We'll instantly fetch the exact and dynamic data for your selection.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Scanning Tally for active companies...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-red-50 text-red-600 p-4 rounded-xl max-w-md border border-red-100 mb-4">
              {error}
            </div>
            <Button onClick={fetchCompanies} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {companies.map((company) => (
            <div
              key={company.id}
              onClick={() => handleSelect(company.name)}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-3 relative ${
                selectedCompany === company.name
                  ? "border-indigo-600 bg-indigo-50 shadow-md scale-[1.02]"
                  : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
              }`}
            >
              {selectedCompany === company.name && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              <div className={`p-3 rounded-full ${
                selectedCompany === company.name ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900">{company.name}</h3>
            </div>
          ))}
          </div>
        )}

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedCompany || isSyncing}
            className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all duration-200 min-w-[200px]"
          >
            {isSyncing ? (
              <span className="flex items-center gap-2">
                <Activity className="w-5 h-5 animate-pulse" />
                Syncing with Tally...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue to Dashboard
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
