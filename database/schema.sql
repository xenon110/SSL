-- database/schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tally_guid VARCHAR(255) UNIQUE,
    financial_year_start DATE,
    books_begin_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users & Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL -- Super Admin, Director, Finance Manager, Accountant
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY, -- Intended to reference auth.users in Supabase
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role_id UUID REFERENCES roles(id),
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounting Groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent VARCHAR(255),
    tally_guid VARCHAR(255) UNIQUE,
    is_revenue BOOLEAN DEFAULT FALSE,
    is_debit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ledgers (Accounts)
CREATE TABLE ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_group VARCHAR(255),
    tally_guid VARCHAR(255) UNIQUE,
    opening_balance DECIMAL(15, 2) DEFAULT 0.00,
    closing_balance DECIMAL(15, 2) DEFAULT 0.00,
    is_debit BOOLEAN DEFAULT FALSE,
    gstin VARCHAR(15),
    state VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    contact_person VARCHAR(255),
    credit_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Items
CREATE TABLE stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_group VARCHAR(255),
    tally_guid VARCHAR(255) UNIQUE,
    base_units VARCHAR(50),
    opening_balance_qty DECIMAL(15, 4) DEFAULT 0,
    opening_balance_value DECIMAL(15, 2) DEFAULT 0,
    closing_balance_qty DECIMAL(15, 4) DEFAULT 0,
    closing_balance_value DECIMAL(15, 2) DEFAULT 0,
    hsn_code VARCHAR(50),
    gst_rate DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voucher Types
CREATE TABLE voucher_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent VARCHAR(255),
    tally_guid VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vouchers (Transactions)
CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    tally_guid VARCHAR(255) UNIQUE NOT NULL,
    voucher_type_name VARCHAR(255) NOT NULL,
    voucher_number VARCHAR(100),
    date DATE NOT NULL,
    reference VARCHAR(255),
    narration TEXT,
    party_ledger_name VARCHAR(255),
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    is_cancelled BOOLEAN DEFAULT FALSE,
    is_optional BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voucher Ledger Details (Accounting Entries)
CREATE TABLE voucher_ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
    ledger_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    is_debit BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voucher Inventory Details (Stock Entries)
CREATE TABLE voucher_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
    stock_item_name VARCHAR(255) NOT NULL,
    billed_qty DECIMAL(15, 4) NOT NULL,
    actual_qty DECIMAL(15, 4),
    rate DECIMAL(15, 4),
    amount DECIMAL(15, 2) NOT NULL,
    is_inward BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync Logs
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    sync_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sync_end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    records_fetched INTEGER DEFAULT 0,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES user_profiles(id)
);

-- Insert Default Roles
INSERT INTO roles (name) VALUES ('Super Admin'), ('Director'), ('Finance Manager'), ('Accountant');
