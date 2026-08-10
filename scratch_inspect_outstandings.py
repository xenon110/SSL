import os
from supabase import create_client

supabase_url = "https://rnebzqsgkgverxdqgmgp.supabase.co"
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko")
sb = create_client(supabase_url, supabase_key)

try:
    print("Checking outstanding_bills records...")
    res = sb.table('outstanding_bills').select('*').limit(10).execute()
    print(f"Total returned: {len(res.data) if res.data else 0}")
    if res.data:
        for idx, row in enumerate(res.data):
            print(f"\nRecord {idx+1}:")
            print(f"  Company Name: {row.get('company_name')}")
            print(f"  Party Ledger: {row.get('party_ledger')}")
            print(f"  Party Group: {row.get('party_group')}")
            print(f"  Bill Date: {row.get('bill_date')}")
            print(f"  Due Date: {row.get('due_date')}")
            print(f"  Pending Amt: {row.get('pending_amount')}")
            print(f"  Bill Ref: {row.get('bill_ref')}")
            print(f"  As on Date: {row.get('as_on_date')}")
except Exception as e:
    print("Error:", e)
