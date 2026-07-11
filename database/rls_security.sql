-- database/rls_security.sql
-- Run this in your Supabase SQL Editor to lock down your database.

-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 2. CREATE POLICIES: Allow ONLY authenticated users to access data
-- (Unauthenticated / Public visitors will get 0 rows returned and cannot modify data)

-- Companies
CREATE POLICY "Allow authenticated full access on companies" 
ON public.companies FOR ALL TO authenticated USING (true);

-- Roles
CREATE POLICY "Allow authenticated full access on roles" 
ON public.roles FOR ALL TO authenticated USING (true);

-- User Profiles
CREATE POLICY "Allow authenticated full access on user_profiles" 
ON public.user_profiles FOR ALL TO authenticated USING (true);

-- Groups
CREATE POLICY "Allow authenticated full access on groups" 
ON public.groups FOR ALL TO authenticated USING (true);

-- Ledgers
CREATE POLICY "Allow authenticated full access on ledgers" 
ON public.ledgers FOR ALL TO authenticated USING (true);

-- Stock Items
CREATE POLICY "Allow authenticated full access on stock_items" 
ON public.stock_items FOR ALL TO authenticated USING (true);

-- Voucher Types
CREATE POLICY "Allow authenticated full access on voucher_types" 
ON public.voucher_types FOR ALL TO authenticated USING (true);

-- Vouchers
CREATE POLICY "Allow authenticated full access on vouchers" 
ON public.vouchers FOR ALL TO authenticated USING (true);

-- Voucher Ledgers
CREATE POLICY "Allow authenticated full access on voucher_ledgers" 
ON public.voucher_ledgers FOR ALL TO authenticated USING (true);

-- Voucher Inventory
CREATE POLICY "Allow authenticated full access on voucher_inventory" 
ON public.voucher_inventory FOR ALL TO authenticated USING (true);

-- Sync Logs
CREATE POLICY "Allow authenticated full access on sync_logs" 
ON public.sync_logs FOR ALL TO authenticated USING (true);

-- Alerts
CREATE POLICY "Allow authenticated full access on alerts" 
ON public.alerts FOR ALL TO authenticated USING (true);

-- Note: The Python Sync Agent should use the SUPABASE_SERVICE_ROLE_KEY to sync data. 
-- Service role keys automatically bypass RLS, so data syncing will not be interrupted by these security policies.
