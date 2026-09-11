import os
import time
import datetime
from dotenv import load_dotenv
from supabase import create_client

# Load the same environment as the rest of the sync agent
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# Import the refactored dynamic metrics fetcher
from fetch_dynamic_metrics import get_dynamic_metrics

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def process_queue():
    """Poll the sync_requests table for pending requests and process them."""
    try:
        # Fetch up to 5 pending requests (FIFO)
        res = sb.table("sync_requests").select("*").eq("status", "pending").order("created_at", desc=False).limit(5).execute()
        requests = res.data
        
        if not requests:
            return

        for req in requests:
            req_id = req["id"]
            company_id = req["company_id"]
            start_date = req["start_date"]
            end_date = req["end_date"]
            
            # First, mark it as processing so other workers (if any) don't pick it up
            sb.table("sync_requests").update({"status": "processing"}).eq("id", req_id).execute()
            
            # We need the company name to pass to TallyClient
            comp_res = sb.table("companies").select("name").eq("id", company_id).execute()
            if not comp_res.data:
                sb.table("sync_requests").update({
                    "status": "error", 
                    "result_data": {"error": f"Company {company_id} not found."}
                }).eq("id", req_id).execute()
                continue
                
            company_name = comp_res.data[0]["name"]
            
            log(f"Processing request {req_id} for {company_name} ({start_date} to {end_date})")
            
            # Fetch from Tally
            result = get_dynamic_metrics(company_name, start_date, end_date)
            
            if result.get("success"):
                # Complete the request successfully
                sb.table("sync_requests").update({
                    "status": "completed",
                    "result_data": result["data"],
                    "updated_at": "now()"
                }).eq("id", req_id).execute()
                log(f"  -> SUCCESS: Request {req_id} completed.")
            else:
                # Mark as error
                sb.table("sync_requests").update({
                    "status": "error",
                    "result_data": {"error": result.get("error", "Unknown error fetching from Tally.")},
                    "updated_at": "now()"
                }).eq("id", req_id).execute()
                log(f"  -> ERROR: Request {req_id} failed: {result.get('error')}")

    except Exception as e:
        log(f"Error checking queue: {e}")

if __name__ == "__main__":
    log("Started Tally Event-Driven Queue Listener")
    log("Waiting for requests from Supabase...")
    
    # Simple polling loop. In production, Realtime could be used, but polling every 2s is extremely cheap and robust.
    while True:
        process_queue()
        time.sleep(2)
