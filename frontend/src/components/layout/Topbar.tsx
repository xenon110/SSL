"use client";

import { useEffect, useState } from "react";
import { Bell, Search, User, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Topbar() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name?: string; email?: string; avatar_url?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [companies, setCompanies] = useState<{ id: string, name: string }[]>([]);
  const [activeCompany, setActiveCompany] = useState<string>("SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)");

  useEffect(() => {
    async function loadActiveCompanyAndList() {
      // Load active company from cookie
      const cookiesArr = document.cookie.split('; ');
      const activeCookie = cookiesArr.find(row => row.startsWith('active-company='));
      let currentCompany = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)";
      if (activeCookie) {
        currentCompany = decodeURIComponent(activeCookie.split('=')[1]);
      } else {
        document.cookie = `active-company=${encodeURIComponent(currentCompany)}; path=/; max-age=86400`;
      }

      // Fetch companies list
      try {
        const res = await fetch('/api/tally-companies');
        if (res.ok) {
          const json = await res.json();
          if (json.companies && json.companies.length > 0) {
            const filtered = json.companies.filter((c: any) => c.name.toLowerCase().includes("smridhi"));
            setCompanies(filtered);

            const isValid = filtered.some((c: any) => c.name === currentCompany);
            if (!isValid && filtered.length > 0) {
              currentCompany = filtered[0].name;
              document.cookie = `active-company=${encodeURIComponent(currentCompany)}; path=/; max-age=86400`;
            }
          }
        }
      } catch (err) {
        console.error("Failed to load companies", err);
      }

      setActiveCompany(currentCompany);
    }
    loadActiveCompanyAndList();
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleCompanySwitch = async (name: string) => {
    setActiveCompany(name);
    setIsSyncing(true);

    // Set cookie immediately so reload displays selected company right away
    document.cookie = `active-company=${encodeURIComponent(name)}; path=/; max-age=86400`;

    // Trigger sync in background non-blockingly
    fetch(`/api/sync?company=${encodeURIComponent(name)}`, { method: 'POST' })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          console.log(`Background synced ${name}: ${JSON.stringify(result.counts)}`);
        }
      })
      .catch(e => console.error('Background sync failed:', e));

    // Snappy reload to load existing cached data immediately
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch profile from public.profiles table
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, email, avatar_url")
          .eq("id", user.id)
          .single();

        setProfile({
          email: user.email,
          full_name: profileData?.full_name || "Admin User",
          avatar_url: profileData?.avatar_url,
        });
      }
    }

    loadUser();

    // Listen for cross-component profile updates
    const handleProfileUpdate = () => loadUser();
    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  return (
    <>
      {/* Full-screen syncing overlay */}
      {isSyncing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
            <div className="h-14 w-14 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800 dark:text-white">Syncing from Tally...</p>
              <p className="text-sm text-slate-500 mt-1">Fetching live data for <span className="font-semibold text-indigo-600">{activeCompany}</span></p>
              <p className="text-xs text-slate-400 mt-2 animate-pulse">This may take 15-60 seconds for large companies</p>
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-6 shadow-sm">
        <div className="flex flex-1 items-center gap-6">
          <div className="hidden lg:flex min-w-[240px] max-w-[320px] items-center h-10 px-4 py-2 text-sm font-bold text-indigo-700 border border-indigo-200 rounded-md bg-indigo-50/50 transition-colors">
            <span className="truncate">{activeCompany}</span>
          </div>


        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full" />}>
              <Avatar className="h-8 w-8 flex items-center justify-center bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="User Avatar" className="object-cover rounded-full" />
                ) : null}
                <AvatarFallback className="bg-transparent text-indigo-700">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name || "Loading..."}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile?.email || ""}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
