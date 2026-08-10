CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id TEXT NOT NULL,
    dashboard_name TEXT NOT NULL,
    metrics_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, dashboard_name)
);
