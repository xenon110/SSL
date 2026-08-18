-- database/materialized_views.sql

-- 1. Daily Sales Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales AS
SELECT 
    company_id,
    date,
    SUM(amount) as total_sales,
    COUNT(id) as voucher_count
FROM vouchers
WHERE voucher_type_name ILIKE '%sale%' 
   OR voucher_type_name = 'POS Invoice'
GROUP BY company_id, date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_sales_unique ON mv_daily_sales(company_id, date);

-- 2. Monthly Expenses Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_expenses AS
SELECT 
    v.company_id,
    DATE_TRUNC('month', v.date) as expense_month,
    SUM(vl.amount) as total_expense
FROM vouchers v
JOIN voucher_ledgers vl ON v.id = vl.voucher_id
JOIN ledgers l ON vl.ledger_name = l.name AND v.company_id = l.company_id
WHERE l.parent_group ILIKE '%Indirect Expense%' 
   OR l.parent_group ILIKE '%Direct Expense%'
GROUP BY v.company_id, DATE_TRUNC('month', v.date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_expenses_unique ON mv_monthly_expenses(company_id, expense_month);

-- 3. Outstanding Summary Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_outstanding_summary AS
SELECT 
    company_name,
    party_group,
    SUM(pending_amount) as total_pending,
    COUNT(id) as total_bills
FROM outstanding_bills
GROUP BY company_name, party_group;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_outstanding_summary_unique ON mv_outstanding_summary(company_name, party_group);

-- 4. Inventory Valuation Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_valuation AS
SELECT 
    company_id,
    parent_group,
    SUM(closing_balance_value) as total_value,
    SUM(closing_balance_qty) as total_qty
FROM stock_items
GROUP BY company_id, parent_group;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_inventory_valuation_unique ON mv_inventory_valuation(company_id, parent_group);

-- 5. Party Outstandings (Aging Analysis) Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_party_outstandings AS
SELECT 
    company_name,
    party_ledger,
    party_group,
    MAX(as_on_date) as as_on_date,
    SUM(pending_amount) as total_pending,
    SUM(CASE WHEN due_date < CURRENT_DATE THEN pending_amount ELSE 0 END) as total_overdue,
    SUM(CASE WHEN bill_type = 'advance' THEN pending_amount ELSE 0 END) as advances,
    SUM(CASE WHEN bill_type = 'on_account' THEN pending_amount ELSE 0 END) as on_account,
    CURRENT_DATE - MIN(bill_date) as oldest_bill_days,
    SUM(CASE WHEN due_date >= CURRENT_DATE THEN pending_amount ELSE 0 END) as bucket_not_due,
    SUM(CASE WHEN due_date >= CURRENT_DATE - 30 AND due_date < CURRENT_DATE THEN pending_amount ELSE 0 END) as bucket_0_30,
    SUM(CASE WHEN due_date >= CURRENT_DATE - 60 AND due_date < CURRENT_DATE - 30 THEN pending_amount ELSE 0 END) as bucket_31_60,
    SUM(CASE WHEN due_date >= CURRENT_DATE - 90 AND due_date < CURRENT_DATE - 60 THEN pending_amount ELSE 0 END) as bucket_61_90,
    SUM(CASE WHEN due_date < CURRENT_DATE - 90 THEN pending_amount ELSE 0 END) as bucket_90_plus
FROM outstanding_bills
GROUP BY company_name, party_ledger, party_group;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_party_outstandings_unique ON mv_party_outstandings(company_name, party_ledger, party_group);

-- 6. Customer Sales Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_sales AS
SELECT 
    company_id,
    party_ledger_name as customer_name,
    SUM(amount) as total_sales,
    MAX(date) as last_tx_date,
    COUNT(id) as tx_count
FROM vouchers
WHERE voucher_type_name ILIKE '%sale%' 
   OR voucher_type_name = 'POS Invoice'
GROUP BY company_id, party_ledger_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_customer_sales_unique ON mv_customer_sales(company_id, customer_name);

-- 7. Product Sales Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_sales AS
SELECT 
    v.company_id,
    vi.stock_item_name as product_name,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%sale%' OR v.voucher_type_name = 'POS Invoice' THEN vi.amount ELSE 0 END) as sales_amount,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%sale%' OR v.voucher_type_name = 'POS Invoice' THEN vi.billed_qty ELSE 0 END) as sales_qty,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%credit note%' OR v.voucher_type_name ILIKE '%return%' THEN vi.amount ELSE 0 END) as returns_amount,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%credit note%' OR v.voucher_type_name ILIKE '%return%' THEN vi.billed_qty ELSE 0 END) as returns_qty,
    COUNT(CASE WHEN v.voucher_type_name ILIKE '%sale%' OR v.voucher_type_name = 'POS Invoice' THEN 1 END) as sales_tx_count
FROM vouchers v
JOIN voucher_inventory vi ON v.id = vi.voucher_id
WHERE v.voucher_type_name ILIKE '%sale%' 
   OR v.voucher_type_name = 'POS Invoice'
   OR v.voucher_type_name ILIKE '%credit note%' 
   OR v.voucher_type_name ILIKE '%return%'
GROUP BY v.company_id, vi.stock_item_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_product_sales_unique ON mv_product_sales(company_id, product_name);

-- 8. Region Sales Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_region_sales AS
SELECT 
    v.company_id,
    l.state,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%sale%' OR v.voucher_type_name = 'POS Invoice' THEN v.amount ELSE 0 END) as total_sales,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%credit note%' OR v.voucher_type_name ILIKE '%return%' THEN v.amount ELSE 0 END) as total_returns,
    COUNT(v.id) as invoice_count
FROM vouchers v
LEFT JOIN ledgers l ON v.party_ledger_name = l.name AND v.company_id = l.company_id
WHERE v.voucher_type_name ILIKE '%sale%' 
   OR v.voucher_type_name = 'POS Invoice'
   OR v.voucher_type_name ILIKE '%credit note%' 
   OR v.voucher_type_name ILIKE '%return%'
GROUP BY v.company_id, l.state;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_region_sales_unique ON mv_region_sales(company_id, state);

-- 9. Cash Flow Summary Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cash_flow_summary AS
WITH liquidity_ledgers AS (
    SELECT name, company_id FROM ledgers WHERE parent_group IN ('Bank Accounts', 'Cash-in-Hand', 'Bank OD A/c', 'Bank OCC A/c')
),
voucher_liquidity AS (
    SELECT 
        v.id as voucher_id,
        v.company_id,
        v.date,
        SUM(CASE WHEN vl.is_debit THEN vl.amount ELSE 0 END) as liq_in,
        SUM(CASE WHEN NOT vl.is_debit THEN vl.amount ELSE 0 END) as liq_out
    FROM vouchers v
    JOIN voucher_ledgers vl ON v.id = vl.voucher_id
    JOIN liquidity_ledgers ll ON vl.ledger_name = ll.name AND v.company_id = ll.company_id
    GROUP BY v.id, v.company_id, v.date
)
SELECT 
    company_id,
    date,
    SUM(CASE WHEN liq_in - liq_out > 0 THEN liq_in - liq_out ELSE 0 END) as total_inflow,
    SUM(CASE WHEN liq_in - liq_out < 0 THEN ABS(liq_in - liq_out) ELSE 0 END) as total_outflow
FROM voucher_liquidity
WHERE liq_in - liq_out != 0
GROUP BY company_id, date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cash_flow_summary_unique ON mv_cash_flow_summary(company_id, date);

-- 10. Cash Flow Sources/Uses Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cash_flow_sources_uses AS
WITH liquidity_ledgers AS (
    SELECT name, company_id FROM ledgers WHERE parent_group IN ('Bank Accounts', 'Cash-in-Hand', 'Bank OD A/c', 'Bank OCC A/c')
),
voucher_liquidity AS (
    SELECT 
        v.id as voucher_id,
        v.company_id,
        SUM(CASE WHEN vl.is_debit THEN vl.amount ELSE 0 END) - SUM(CASE WHEN NOT vl.is_debit THEN vl.amount ELSE 0 END) as net_flow
    FROM vouchers v
    JOIN voucher_ledgers vl ON v.id = vl.voucher_id
    JOIN liquidity_ledgers ll ON vl.ledger_name = ll.name AND v.company_id = ll.company_id
    GROUP BY v.id, v.company_id
    HAVING SUM(CASE WHEN vl.is_debit THEN vl.amount ELSE 0 END) - SUM(CASE WHEN NOT vl.is_debit THEN vl.amount ELSE 0 END) != 0
)
SELECT 
    vl.company_id,
    vled.ledger_name,
    CASE WHEN vl.net_flow > 0 THEN 'INFLOW' ELSE 'OUTFLOW' END as flow_type,
    SUM(CASE WHEN (vl.net_flow > 0 AND NOT vled.is_debit) OR (vl.net_flow < 0 AND vled.is_debit) THEN LEAST(vled.amount, ABS(vl.net_flow)) ELSE 0 END) as amount
FROM voucher_liquidity vl
JOIN voucher_ledgers vled ON vl.voucher_id = vled.voucher_id
LEFT JOIN liquidity_ledgers ll ON vled.ledger_name = ll.name AND vl.company_id = ll.company_id
WHERE ll.name IS NULL
GROUP BY vl.company_id, vled.ledger_name, CASE WHEN vl.net_flow > 0 THEN 'INFLOW' ELSE 'OUTFLOW' END
HAVING SUM(CASE WHEN (vl.net_flow > 0 AND NOT vled.is_debit) OR (vl.net_flow < 0 AND vled.is_debit) THEN LEAST(vled.amount, ABS(vl.net_flow)) ELSE 0 END) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cash_flow_sources_uses_unique ON mv_cash_flow_sources_uses(company_id, ledger_name, flow_type);


-- 11. Supplier Purchases Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_supplier_purchases AS
SELECT 
    company_id,
    party_ledger_name as supplier_name,
    SUM(CASE WHEN voucher_type_name ILIKE '%purchase%' AND voucher_type_name NOT ILIKE '%order%' THEN amount ELSE 0 END) as total_purchases,
    SUM(CASE WHEN voucher_type_name ILIKE '%return%' OR voucher_type_name ILIKE '%debit note%' THEN amount ELSE 0 END) as total_returns,
    COUNT(CASE WHEN voucher_type_name ILIKE '%purchase%' AND voucher_type_name NOT ILIKE '%order%' THEN 1 END) as tx_count,
    MAX(date) as last_tx_date
FROM vouchers
WHERE voucher_type_name ILIKE '%purchase%' 
   OR voucher_type_name ILIKE '%return%'
   OR voucher_type_name ILIKE '%debit note%'
GROUP BY company_id, party_ledger_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_supplier_purchases_unique ON mv_supplier_purchases(company_id, supplier_name);

-- 12. Product Purchases Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_purchases AS
SELECT 
    v.company_id,
    vi.stock_item_name as product_name,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%purchase%' AND v.voucher_type_name NOT ILIKE '%order%' THEN vi.amount ELSE 0 END) as purchase_amount,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%purchase%' AND v.voucher_type_name NOT ILIKE '%order%' THEN vi.billed_qty ELSE 0 END) as purchase_qty,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%return%' OR v.voucher_type_name ILIKE '%debit note%' THEN vi.amount ELSE 0 END) as returns_amount,
    SUM(CASE WHEN v.voucher_type_name ILIKE '%return%' OR v.voucher_type_name ILIKE '%debit note%' THEN vi.billed_qty ELSE 0 END) as returns_qty,
    COUNT(CASE WHEN v.voucher_type_name ILIKE '%purchase%' AND v.voucher_type_name NOT ILIKE '%order%' THEN 1 END) as tx_count
FROM vouchers v
JOIN voucher_inventory vi ON v.id = vi.voucher_id
WHERE v.voucher_type_name ILIKE '%purchase%' 
   OR v.voucher_type_name ILIKE '%return%'
   OR v.voucher_type_name ILIKE '%debit note%'
GROUP BY v.company_id, vi.stock_item_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_product_purchases_unique ON mv_product_purchases(company_id, product_name);

-- 13. Inventory Summary Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_summary AS
SELECT 
    v.company_id,
    vi.stock_item_name as product_name,
    SUM(CASE WHEN vi.is_inward THEN vi.billed_qty ELSE 0 END) as total_inward_qty,
    SUM(CASE WHEN vi.is_inward THEN vi.amount ELSE 0 END) as total_inward_value,
    SUM(CASE WHEN NOT vi.is_inward THEN vi.billed_qty ELSE 0 END) as total_outward_qty,
    SUM(CASE WHEN NOT vi.is_inward THEN vi.amount ELSE 0 END) as total_outward_value
FROM vouchers v
JOIN voucher_inventory vi ON v.id = vi.voucher_id
WHERE v.voucher_type_name NOT ILIKE '%order%'
GROUP BY v.company_id, vi.stock_item_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_inventory_summary_unique ON mv_inventory_summary(company_id, product_name);

-- 14. Income & Expense Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_income_expense AS
WITH target_ledgers AS (
    SELECT name, company_id, parent_group FROM ledgers 
    WHERE parent_group IN (
      'Direct Incomes', 'Indirect Incomes', 'Sales Accounts', 'Sales - Sponge Iron',
      'Direct Expenses', 'Indirect Expenses', 'Purchase Accounts', 'Purchase Under GST Law', 
      'Misc. Expenses', 'Staff Welfare Expenses', 'Salary', 'Wages', 'Travelling & Coneyance', 
      'Printing & Stationery', 'Rent, Rates & Taxes', 'Repair & Maintenance', 'Director Remuneration', 
      'Finance Cost', 'Bank Charges', 'Consultancy & Legal', 'Kolkata Office Exp', 'DRC-03 Tax', 
      'DRC-03 Int', 'DRC-03 Penalty'
    )
)
SELECT 
    v.company_id,
    DATE_TRUNC('month', v.date) as tx_month,
    vl.ledger_name,
    CASE 
        WHEN tl.parent_group IN ('Direct Incomes', 'Indirect Incomes', 'Sales Accounts', 'Sales - Sponge Iron') THEN 'INCOME'
        ELSE 'EXPENSE'
    END as tx_type,
    SUM(CASE 
        WHEN tl.parent_group IN ('Direct Incomes', 'Indirect Incomes', 'Sales Accounts', 'Sales - Sponge Iron') THEN (CASE WHEN vl.is_debit THEN -vl.amount ELSE vl.amount END)
        ELSE (CASE WHEN vl.is_debit THEN vl.amount ELSE -vl.amount END)
    END) as net_amount,
    COUNT(vl.id) as tx_count
FROM vouchers v
JOIN voucher_ledgers vl ON v.id = vl.voucher_id
JOIN target_ledgers tl ON vl.ledger_name = tl.name AND v.company_id = tl.company_id
GROUP BY v.company_id, DATE_TRUNC('month', v.date), vl.ledger_name, CASE WHEN tl.parent_group IN ('Direct Incomes', 'Indirect Incomes', 'Sales Accounts', 'Sales - Sponge Iron') THEN 'INCOME' ELSE 'EXPENSE' END;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_income_expense_unique ON mv_income_expense(company_id, tx_month, ledger_name, tx_type);

-- 15. Working Capital Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_working_capital AS
WITH wc_ledgers AS (
    SELECT name, company_id, 
        CASE WHEN parent_group IN ('Current Assets', 'Sundry Debtors', 'Cash-in-Hand', 'Bank Accounts', 'Loans & Advances (Asset)', 'Deposits (Asset)') THEN 'ASSET'
        ELSE 'LIABILITY' END as category
    FROM ledgers 
    WHERE parent_group IN (
        'Current Assets', 'Sundry Debtors', 'Cash-in-Hand', 'Bank Accounts', 'Loans & Advances (Asset)', 'Deposits (Asset)',
        'Current Liabilities', 'Sundry Creditors', 'Duties & Taxes', 'Provisions', 'Short Term Provisions'
    )
)
SELECT 
    v.company_id,
    DATE_TRUNC('month', v.date) as tx_month,
    wcl.category,
    SUM(CASE WHEN wcl.category = 'ASSET' THEN (CASE WHEN vl.is_debit THEN vl.amount ELSE -vl.amount END)
             ELSE (CASE WHEN vl.is_debit THEN -vl.amount ELSE vl.amount END) END) as net_change
FROM vouchers v
JOIN voucher_ledgers vl ON v.id = vl.voucher_id
JOIN wc_ledgers wcl ON vl.ledger_name = wcl.name AND v.company_id = wcl.company_id
GROUP BY v.company_id, DATE_TRUNC('month', v.date), wcl.category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_working_capital_unique ON mv_working_capital(company_id, tx_month, category);


-- 16. RPC Function to trigger refresh from Supabase Data API (Python/NextJS)
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh concurrently to avoid locking the tables during reads
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_expenses;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_outstanding_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_valuation;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_party_outstandings;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_sales;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_sales;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_region_sales;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cash_flow_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cash_flow_sources_uses;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_supplier_purchases;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_purchases;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_income_expense;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_working_capital;
END;
$$;
