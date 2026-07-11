-- 1. Alter Ledgers Table to add new fields for Outstandings
ALTER TABLE public.ledgers 
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC,
ADD COLUMN IF NOT EXISTS credit_days INTEGER,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS closing_balance NUMERIC;

-- 2. Create Outstanding Bills Table
CREATE TABLE IF NOT EXISTS public.outstanding_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    party_ledger TEXT NOT NULL,
    party_group TEXT NOT NULL CHECK (party_group IN ('receivable', 'payable')),
    bill_ref TEXT,
    bill_type TEXT CHECK (bill_type IN ('new_ref', 'on_account', 'advance')),
    bill_date DATE,
    due_date DATE,
    pending_amount NUMERIC NOT NULL,
    as_on_date DATE NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add User Accountability Fields to Vouchers
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS entered_by text;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS altered_by text;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_outstanding_bills_company ON public.outstanding_bills(company_name);
CREATE INDEX IF NOT EXISTS idx_outstanding_bills_party ON public.outstanding_bills(party_ledger);
CREATE INDEX IF NOT EXISTS idx_outstanding_bills_group ON public.outstanding_bills(party_group);
