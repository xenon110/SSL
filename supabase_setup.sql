-- Run this in your Supabase SQL Editor to create the message queue table
CREATE TABLE IF NOT EXISTS sync_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
    start_date text NOT NULL,
    end_date text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    result_data jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable Realtime for the sync_requests table (Required for the frontend to listen for completion)
alter publication supabase_realtime add table sync_requests;
