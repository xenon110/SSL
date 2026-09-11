import os
from supabase import create_client

SUPABASE_URL = "https://rnebzqsgkgverxdqgmgp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko"
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

res = sb.table("dashboard_metrics").select("*").execute()
for row in res.data:
    print(f"Dashboard: {row['dashboard_name']}")
    import json
    print(json.dumps(row['metrics_data'], indent=2))
    break
