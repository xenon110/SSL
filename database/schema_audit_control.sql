-- database/schema_audit_control.sql

-- 1. Create approval_matrix_config
CREATE TABLE IF NOT EXISTS public.approval_matrix_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_type VARCHAR(255) NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    threshold_amount NUMERIC,
    approver_roles JSONB NOT NULL,
    requires_attachment BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default Matrix
INSERT INTO public.approval_matrix_config (change_type, module_name, threshold_amount, approver_roles, requires_attachment)
VALUES 
('edit', 'Sales', 50000, '["Head Accountant", "CFO"]', TRUE),
('edit', 'Purchases', 50000, '["Head Accountant", "CFO"]', TRUE),
('edit', 'Expenses', 50000, '["CFO"]', TRUE),
('adjustment', 'CashFlow', 0, '["CFO", "Director"]', TRUE),
('adjustment', 'Inventory', 0, '["CFO"]', TRUE),
('write_off', 'Receivables', 0, '["Director", "CFO"]', TRUE),
('adjustment', 'Payables', 0, '["CFO"]', TRUE),
('group_change', 'Ledgers', 0, '["Admin", "CFO"]', FALSE),
('soft_delete', 'Vouchers', 0, '["CFO", "Director"]', TRUE);

-- 2. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(50) UNIQUE NOT NULL,
    company_id UUID,
    user_id UUID,
    user_role VARCHAR(100),
    module_name VARCHAR(100),
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    field_name VARCHAR(255),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    source VARCHAR(50) NOT NULL,
    financial_impact BOOLEAN DEFAULT FALSE,
    impacted_reports JSONB,
    status VARCHAR(50),
    ip_address VARCHAR(45),
    device_info TEXT,
    previous_row_hash TEXT,
    row_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Manual Adjustments
CREATE TABLE IF NOT EXISTS public.manual_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID REFERENCES public.audit_logs(id),
    company_id UUID,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT NOT NULL,
    attachment_path TEXT,
    state VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. Edit Approvals
CREATE TABLE IF NOT EXISTS public.edit_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID REFERENCES public.audit_logs(id),
    manual_adjustment_id UUID REFERENCES public.manual_adjustments(id),
    requested_by VARCHAR(255),
    approved_by VARCHAR(255),
    approval_status VARCHAR(50) DEFAULT 'pending',
    approval_remarks TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- 5. Drop old sync_logs and recreate with extended schema
DROP TABLE IF EXISTS public.sync_logs;

CREATE TABLE public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id VARCHAR(50) UNIQUE NOT NULL,
    company_id UUID,
    sync_source VARCHAR(100),
    period_start DATE,
    period_end DATE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    records_inserted INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_marked_inactive INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    triggered_by VARCHAR(100),
    tables_updated JSONB,
    last_alterid_synced VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Report Access Logs
CREATE TABLE IF NOT EXISTS public.report_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name VARCHAR(255) NOT NULL,
    company_id UUID,
    user_id UUID,
    filters_used JSONB,
    period_start DATE,
    period_end DATE,
    period_a DATE,
    period_b DATE,
    granularity VARCHAR(50),
    normalization_enabled BOOLEAN,
    last_sync_id VARCHAR(50),
    export_type VARCHAR(50) NOT NULL,
    metrics_viewed JSONB,
    snapshot_dates_used JSONB,
    missing_data_warnings BOOLEAN,
    findings_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Insight Audit Logs
CREATE TABLE IF NOT EXISTS public.insight_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name VARCHAR(255) NOT NULL,
    company_id UUID,
    user_id UUID,
    stats_object_hash TEXT,
    rule_findings_count INTEGER,
    llm_enabled BOOLEAN DEFAULT FALSE,
    llm_input_hash TEXT,
    llm_output_hash TEXT,
    raw_vouchers_sent BOOLEAN DEFAULT FALSE CHECK (raw_vouchers_sent = FALSE),
    party_names_sent BOOLEAN DEFAULT FALSE,
    user_exported_or_accepted BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Reconciliation View
CREATE OR REPLACE VIEW public.reconciliation_items AS
SELECT 
    v.company_id,
    'Sales/Purchases' AS module_name,
    'voucher' AS entity_type,
    v.tally_guid AS entity_id,
    ma.field_name,
    v.amount AS tally_value,
    ma.new_value AS adjusted_value,
    (CAST(ma.new_value AS NUMERIC) - v.amount) AS difference,
    ma.reason AS adjustment_reason,
    ea.approved_by,
    ea.approved_at,
    EXTRACT(DAY FROM (NOW() - ea.approved_at)) AS days_pending_reconciliation,
    CASE 
        WHEN v.amount = CAST(ma.new_value AS NUMERIC) THEN 'superseded_by_tally'
        ELSE 'live_adjustment'
    END AS status,
    ma.id as adjustment_id
FROM public.manual_adjustments ma
JOIN public.vouchers v ON ma.entity_id = v.tally_guid
LEFT JOIN public.edit_approvals ea ON ea.manual_adjustment_id = ma.id
WHERE ma.state = 'approved' AND ma.entity_type = 'voucher';

-- DB Permissions constraint
REVOKE UPDATE, DELETE ON public.audit_logs FROM PUBLIC;
