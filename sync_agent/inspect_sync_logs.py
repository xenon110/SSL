import os
from supabase import create_client

SUPABASE_URL = "https://rnebzqsgkgverxdqgmgp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect():
    print("Fetching last 10 sync logs...")
    res = sb.table("sync_logs").select("*").order("created_at", desc=True).limit(10).execute()
    logs = res.data or []
    print(f"Returned {len(logs)} logs.")
    for idx, log in enumerate(logs):
        print(f"\n--- Log {idx+1} ---")
        print(f"Timestamp: {log.get('created_at')}")
        print(f"Company: {log.get('company_id')}")
        print(f"Status: {log.get('status')}")
        print(f"Records Inserted: {log.get('records_inserted')}")
        print(f"Message: {log.get('message')}")
        print(f"Error Details: {log.get('error_details')}")

if __name__ == "__main__":
    inspect()
