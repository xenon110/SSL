"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Receipt, FileText, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<{
    items: any[];
    ledgers: any[];
    vouchers: any[];
  }>({ items: [], ledgers: [], vouchers: [] });

  useEffect(() => {
    async function performSearch() {
      if (!query) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const searchTerm = `%${query}%`;
        
        // Search stock items
        const { data: items } = await supabase
          .from("stock_items")
          .select("name, parent_group, closing_balance, base_units")
          .ilike("name", searchTerm)
          .limit(10);
          
        // Search ledgers
        const { data: ledgers } = await supabase
          .from("ledgers")
          .select("name, parent_group, closing_balance")
          .ilike("name", searchTerm)
          .limit(10);
          
        // Search vouchers (by id/number or party name)
        const { data: vouchers } = await supabase
          .from("vouchers")
          .select("id, voucher_type, date, party_ledger_name, amount")
          .or(`id.ilike.${searchTerm},party_ledger_name.ilike.${searchTerm}`)
          .limit(10);

        setResults({
          items: items || [],
          ledgers: ledgers || [],
          vouchers: vouchers || []
        });
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    performSearch();
  }, [query]);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(val || 0);

  if (!query) {
    return (
      <div className="p-8 text-center bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-gray-500 mt-2">Enter a search term in the top bar to begin.</p>
      </div>
    );
  }

  const totalResults = results.items.length + results.ledgers.length + results.vouchers.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
          <Search className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Search Results for "{query}"
          </h1>
          <p className="text-gray-500">Found {totalResults} matching records</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : totalResults === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">No results found</h2>
          <p className="text-gray-500 mt-2">We couldn't find anything matching "{query}". Try different keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Stock Items Column */}
          {results.items.length > 0 && (
            <Card className="shadow-sm border-0 ring-1 ring-slate-100">
              <CardHeader className="bg-slate-50 border-b flex flex-row items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-lg">Stock Items</CardTitle>
                <Badge className="ml-auto bg-indigo-100 text-indigo-700">{results.items.length}</Badge>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {results.items.map((item, i) => (
                  <Link href={`/dashboard`} key={i} className="flex flex-col p-4 hover:bg-slate-50 transition-colors group">
                    <span className="font-semibold text-gray-900 group-hover:text-indigo-600">{item.name}</span>
                    <span className="text-sm text-gray-500">{item.parent_group}</span>
                    <div className="mt-2 text-sm font-medium text-slate-700">
                      Balance: {Math.abs(item.closing_balance || 0)} {item.base_units}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Ledgers Column */}
          {results.ledgers.length > 0 && (
            <Card className="shadow-sm border-0 ring-1 ring-slate-100">
              <CardHeader className="bg-slate-50 border-b flex flex-row items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-lg">Ledgers</CardTitle>
                <Badge className="ml-auto bg-emerald-100 text-emerald-700">{results.ledgers.length}</Badge>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {results.ledgers.map((ledger, i) => (
                  <Link href={`/outstandings`} key={i} className="flex flex-col p-4 hover:bg-slate-50 transition-colors group">
                    <span className="font-semibold text-gray-900 group-hover:text-emerald-600">{ledger.name}</span>
                    <span className="text-sm text-gray-500">{ledger.parent_group}</span>
                    <div className="mt-2 text-sm font-medium text-slate-700">
                      Balance: {formatMoney(Math.abs(ledger.closing_balance || 0))} {ledger.closing_balance < 0 ? 'Dr' : 'Cr'}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Vouchers Column */}
          {results.vouchers.length > 0 && (
            <Card className="shadow-sm border-0 ring-1 ring-slate-100">
              <CardHeader className="bg-slate-50 border-b flex flex-row items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-lg">Vouchers</CardTitle>
                <Badge className="ml-auto bg-orange-100 text-orange-700">{results.vouchers.length}</Badge>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {results.vouchers.map((voucher, i) => (
                  <Link href={`/dashboard`} key={i} className="flex flex-col p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-gray-900 group-hover:text-orange-600">{voucher.party_ledger_name}</span>
                      <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">{voucher.voucher_type}</span>
                    </div>
                    <span className="text-sm text-gray-500 mt-1">No. {voucher.id} • {new Date(voucher.date).toLocaleDateString()}</span>
                    <div className="mt-2 text-sm font-medium text-slate-700">
                      Amount: {formatMoney(Math.abs(voucher.amount || 0))}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500 animate-pulse">Loading search...</div>}>
      <SearchResults />
    </Suspense>
  );
}
