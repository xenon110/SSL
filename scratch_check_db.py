import os
from dotenv import load_dotenv
from supabase import create_client

# Load from sync_agent/.env
load_dotenv('c:/Users/yashs/Downloads/Tally/sync_agent/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Supabase credentials not found!")
    exit(1)

sb = create_client(url, key)

print("--- Checking Supabase for live data ---")
try:
    logs = sb.table("sync_logs").select("*").order("started_at", desc=True).limit(3).execute()
    if logs.data:
        print(f"Found {len(logs.data)} recent sync logs!")
        for log in logs.data:
            print(f"- Status: {log.get('status')} | Inserted: {log.get('records_inserted')} records | Time: {log.get('started_at')}")
    else:
        print("No sync logs found yet. The agent might still be processing...")

    companies = sb.table("companies").select("*").execute()
    if companies.data:
        print(f"\nCompanies in DB: {[c.get('name') for c in companies.data]}")
    
    vouchers = sb.table("vouchers").select("id", count="exact").limit(1).execute()
    print(f"\nTotal Vouchers synced to DB: {vouchers.count}")

except Exception as e:
    print(f"Error querying Supabase: {e}")
