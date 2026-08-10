-- Materialized View for Party-wise Outstandings
CREATE MATERIALIZED VIEW mv_party_outstandings AS
SELECT 
    ob.company_name,
    ob.party_group,
    ob.party_ledger,
    MAX(ob.as_on_date) as as_on_date,
    
    SUM(CASE WHEN ob.pending_amount < 0 OR ob.bill_type = 'advance' THEN ABS(ob.pending_amount) ELSE 0 END) AS advances,
    SUM(CASE WHEN ob.bill_type = 'on_account' THEN ob.pending_amount ELSE 0 END) AS on_account,
    
    SUM(CASE WHEN ob.bill_type = 'advance' AND ob.pending_amount > 0 THEN -ob.pending_amount ELSE ob.pending_amount END) AS total_pending,
    
    SUM(CASE WHEN ob.due_date::date < CURRENT_DATE AND ob.pending_amount > 0 AND ob.bill_type != 'advance' AND ob.bill_type != 'on_account' THEN ob.pending_amount ELSE 0 END) AS total_overdue,
    
    COALESCE(MAX(CASE WHEN ob.due_date::date < CURRENT_DATE AND ob.pending_amount > 0 AND ob.bill_type != 'advance' AND ob.bill_type != 'on_account' THEN CURRENT_DATE - ob.due_date::date ELSE 0 END), 0) AS oldest_bill_days,
    
    SUM(CASE WHEN (ob.due_date IS NULL OR ob.due_date::date >= CURRENT_DATE) AND ob.pending_amount > 0 AND ob.bill_type != 'advance' AND ob.bill_type != 'on_account' THEN ob.pending_amount ELSE 0 END) AS bucket_not_due,
    SUM(CASE WHEN CURRENT_DATE - ob.due_date::date > 0 AND CURRENT_DATE - ob.due_date::date <= 30 AND ob.pending_amount > 0 AND ob.bill_type != 'advance' AND ob.bill_type != 'on_account' THEN ob.pending_amount ELSE 0 END) AS bucket_0_30,
    SUM(CASE WHEN CURRENT_DATE - ob.due_date::date > 30 AND CURRENT_DATE - ob.due_date::date <= 60 AND ob.pending_amount > 0 AND ob.bill_type != 'advance' AND ob.bill_type != 'on_account' THEN ob.pending_amount ELSE 0 END) AS bucket_31_60,
    SUM(CASE WHEN CURRENT_DATE - ob.due_date::date > 60 AND CURRENT_DATE - ob.due_date::date <= 90 AND ob.pending_amount > 0 AND ob.bill_type != 'advance' AND ob.bill_type != 'on_account' THEN ob.pending_amount ELSE 0 END) AS bucket_61_90,
    SUM(CASE WHEN CURRENT_DATE - ob.due_date::date > 90 AND ob.pending_amount > 0 AND ob.bill_type != 'advance' AND ob.bill_type != 'on_account' THEN ob.pending_amount ELSE 0 END) AS bucket_90_plus
FROM outstanding_bills ob
GROUP BY ob.company_name, ob.party_group, ob.party_ledger;

-- Create Indexes for fast querying
CREATE INDEX idx_mv_party_outstandings_company ON mv_party_outstandings(company_name);
CREATE INDEX idx_mv_party_outstandings_group ON mv_party_outstandings(party_group);

-- Materialized View for Cash Flow
CREATE MATERIALIZED VIEW mv_cash_flow AS
SELECT 
    v.company_id,
    c.name as company_name,
    SUM(CASE WHEN v.voucher_type_name IN ('Receipt', 'Contra') THEN v.amount ELSE 0 END) AS cash_inflow,
    SUM(CASE WHEN v.voucher_type_name = 'Payment' THEN v.amount ELSE 0 END) AS cash_outflow
FROM vouchers v
JOIN companies c ON v.company_id = c.id
GROUP BY v.company_id, c.name;

CREATE INDEX idx_mv_cash_flow_company ON mv_cash_flow(company_id);
