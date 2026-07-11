"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  User, Database, Shield, MonitorSmartphone, Key, 
  CheckCircle2, XCircle, Loader2, RefreshCw, Smartphone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [revokeMessage, setRevokeMessage] = useState("");
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();
          
        if (profile) {
          if (profile.full_name) setFullName(profile.full_name);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        }
      }
    }
    loadProfile();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!e.target.files || e.target.files.length === 0 || !userId) {
        throw new Error('You must select an image to upload.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;
      
      setAvatarUrl(data.publicUrl);
      window.dispatchEvent(new CustomEvent('profile-updated'));
    } catch (error: any) {
      console.error('Error uploading avatar:', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult('idle');
    setTimeout(() => {
      setIsTesting(false);
      setTestResult('success');
    }, 2000);
  };

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      // 1. Update the public.profiles table (for your app)
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId);
        
      if (error) throw error;
      
      // 2. Update the auth.users metadata (so it shows in Supabase Dashboard)
      await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      window.dispatchEvent(new CustomEvent('profile-updated'));
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (!currentPassword || !newPassword) {
      setPasswordError("Both current and new password are required.");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      // Re-authenticate to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Incorrect current password.");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeSessions = async () => {
    setIsRevokingSessions(true);
    setRevokeMessage("");
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      setRevokeMessage("Successfully signed out of all other devices.");
    } catch (err) {
      console.error("Error revoking sessions:", err);
      setRevokeMessage("Failed to sign out of other devices.");
    } finally {
      setIsRevokingSessions(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings & Configuration</h1>
        <p className="text-slate-500 mt-2">Manage your account settings, Tally synchronization, and security preferences.</p>
      </div>

      <Tabs orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-8">
        <TabsList className="flex md:flex-col h-auto w-full md:w-64 bg-transparent justify-start items-start space-y-2 space-x-0 p-0 border-r-0 md:border-r border-slate-200 pr-4">
          <TabsTrigger value="general" className="w-full justify-start gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none px-4 py-3 rounded-xl">
            <User className="h-4 w-4" /> General Profile
          </TabsTrigger>
          <TabsTrigger value="sync" className="w-full justify-start gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none px-4 py-3 rounded-xl">
            <Database className="h-4 w-4" /> Tally Sync Setup
          </TabsTrigger>
          <TabsTrigger value="security" className="w-full justify-start gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none px-4 py-3 rounded-xl">
            <Shield className="h-4 w-4" /> Security & Access
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          {/* GENERAL SETTINGS */}
          <TabsContent value="general" className="mt-0">
            <Card className="border-slate-200 shadow-sm rounded-2xl">
              <CardHeader className="border-b border-slate-100 pb-6 bg-slate-50/50">
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details and public profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border-4 border-white shadow-md overflow-hidden relative">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-10 w-10" />
                    )}
                  </div>
                  <div>
                    <label className="mb-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {isUploading ? "Uploading..." : "Change Avatar"}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarUpload} 
                        disabled={isUploading} 
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. 1MB max.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <Input 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder="Admin User" 
                      className="rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                    <Input 
                      value={email} 
                      disabled 
                      type="email" 
                      className="rounded-xl bg-slate-50 cursor-not-allowed" 
                    />
                    <p className="text-xs text-slate-500 mt-1">To change your email, please contact the system administrator.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 bg-slate-50/50 py-4 justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </Card>

            {showToast && (
              <div className="fixed bottom-8 right-8 bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="font-medium text-sm">Profile updated successfully!</p>
              </div>
            )}
          </TabsContent>

          {/* TALLY SYNC SETTINGS */}
          <TabsContent value="sync" className="mt-0">
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm rounded-2xl">
                <CardHeader className="border-b border-slate-100 pb-6 bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>ODBC Connection</CardTitle>
                      <CardDescription>Configure the connection to your local TallyPrime instance.</CardDescription>
                    </div>
                    {testResult === 'success' && <Badge className="bg-emerald-50 text-emerald-700 border-0 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</Badge>}
                    {testResult === 'error' && <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2 col-span-3">
                      <label className="text-sm font-medium text-slate-700">Host IP Address</label>
                      <Input defaultValue="127.0.0.1" className="rounded-xl font-mono text-slate-600" />
                    </div>
                    <div className="space-y-2 col-span-1">
                      <label className="text-sm font-medium text-slate-700">ODBC Port</label>
                      <Input defaultValue="9000" className="rounded-xl font-mono text-slate-600" />
                    </div>
                    <div className="space-y-2 col-span-4">
                      <label className="text-sm font-medium text-slate-700">Company Target Name (Optional)</label>
                      <Input placeholder="Leave blank to use currently open company" className="rounded-xl" />
                      <p className="text-xs text-slate-500 mt-1">Specific company to extract data from. Usually better to leave blank.</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-100 bg-slate-50/50 py-4 justify-between">
                  <Button variant="outline" onClick={handleTestConnection} disabled={isTesting} className="rounded-xl text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100">
                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                    {isTesting ? 'Testing Connection...' : 'Test Tally Connection'}
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                    Save Configuration
                  </Button>
                </CardFooter>
              </Card>

              <Card className="border-slate-200 shadow-sm rounded-2xl">
                <CardHeader className="border-b border-slate-100 pb-6 bg-slate-50/50">
                  <CardTitle>Automation & Sync Schedule</CardTitle>
                  <CardDescription>Control how frequently the Python agent syncs data to the dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Background Auto-Sync</p>
                      <p className="text-sm text-slate-500">Enable automatic background synchronization</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Sync Interval</label>
                    <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option>Every 5 Minutes (Real-time)</option>
                      <option>Every 15 Minutes</option>
                      <option>Hourly</option>
                      <option>Daily at Midnight</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SECURITY SETTINGS */}
          <TabsContent value="security" className="mt-0">
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm rounded-2xl">
                <CardHeader className="border-b border-slate-100 pb-6 bg-slate-50/50">
                  <CardTitle>Security Preferences</CardTitle>
                  <CardDescription>Manage your passwords and authentication methods.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between border-b pb-6">
                    <div className="flex gap-4 items-center">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Smartphone className="w-6 h-6" /></div>
                      <div>
                        <p className="font-medium text-slate-800">Two-Factor Authentication (2FA)</p>
                        <p className="text-sm text-slate-500">Add an extra layer of security to your account.</p>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-xl" onClick={() => alert("Please contact your IT administrator to provision a 2FA device for this account.")}>Enable 2FA</Button>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Change Password</h3>
                    <div className="space-y-4 max-w-sm">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Current Password</label>
                        <Input 
                          type="password" 
                          className="rounded-xl" 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">New Password</label>
                        <Input 
                          type="password" 
                          className="rounded-xl" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      
                      {passwordError && <p className="text-sm text-rose-500 font-medium">{passwordError}</p>}
                      {passwordSuccess && <p className="text-sm text-emerald-600 font-medium">{passwordSuccess}</p>}
                      
                      <Button 
                        onClick={handleUpdatePassword} 
                        disabled={isUpdatingPassword} 
                        className="rounded-xl mt-2 bg-indigo-600 hover:bg-indigo-700"
                      >
                        {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isUpdatingPassword ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm rounded-2xl">
                <CardHeader className="border-b border-slate-100 pb-6 bg-slate-50/50">
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Devices currently logged into your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><MonitorSmartphone className="w-5 h-5" /></div>
                      <div>
                        <p className="font-medium text-slate-800 flex items-center gap-2">Current Session <Badge className="bg-emerald-50 text-emerald-700 border-0 h-5 px-1.5 text-[10px]">Active</Badge></p>
                        <p className="text-xs text-slate-500">This device</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex flex-col">
                      <p className="font-medium text-slate-800">Other Devices</p>
                      <p className="text-xs text-slate-500 max-w-sm">Log out of all other devices where you are currently signed in.</p>
                      {revokeMessage && <p className="text-sm mt-1 text-emerald-600 font-medium">{revokeMessage}</p>}
                    </div>
                    <Button 
                      onClick={handleRevokeSessions}
                      disabled={isRevokingSessions}
                      variant="outline" 
                      size="sm" 
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-xl"
                    >
                      {isRevokingSessions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sign out all others
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
