-- Add ALTERID column to existing tables if they don't have it
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS alter_id BIGINT;
ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS alter_id BIGINT;

-- Create Godowns Table
CREATE TABLE IF NOT EXISTS godowns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT NOT NULL,
    tally_guid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    parent TEXT,
    alter_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Cost Centres Table
CREATE TABLE IF NOT EXISTS cost_centres (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT NOT NULL,
    tally_guid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    parent TEXT,
    alter_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Edit Log Table
CREATE TABLE IF NOT EXISTS edit_log_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'Voucher', 'Ledger', etc.
    tally_guid TEXT NOT NULL,
    alter_id BIGINT NOT NULL,
    action_type TEXT NOT NULL, -- 'Altered', 'Cancelled', 'Deleted'
    username TEXT,
    tally_timestamp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_vouchers_alter_id ON vouchers(alter_id);
CREATE INDEX IF NOT EXISTS idx_ledgers_alter_id ON ledgers(alter_id);
CREATE INDEX IF NOT EXISTS idx_godowns_alter_id ON godowns(alter_id);
CREATE INDEX IF NOT EXISTS idx_cost_centres_alter_id ON cost_centres(alter_id);
CREATE INDEX IF NOT EXISTS idx_edit_log_alter_id ON edit_log_entries(alter_id);
