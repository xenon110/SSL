import time
import requests
from apscheduler.schedulers.background import BackgroundScheduler
from tally_client import TallyClient
import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/api/v1/sync")
COMPANY_ID = os.getenv("COMPANY_ID", "default-company-uuid")

tally = TallyClient(url="http://localhost:9000", company_name="Demo Company")

def get_last_alter_id(entity_type):
    # In a real app, query the backend for the max alter_id for this entity
    # For now, simulate tracking it in memory
    return getattr(get_last_alter_id, f"_{entity_type}", 0)

def set_last_alter_id(entity_type, alter_id):
    setattr(get_last_alter_id, f"_{entity_type}", alter_id)

def sync_job():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting sync...")
    
    # 1. Fetch from Tally with incremental ALTERID if supported
    last_ledger_id = get_last_alter_id('ledgers')
    # Use custom collection with ALTERID filter for ledgers
    ledgers_xml = tally.export_master_by_alterid("Ledger", last_ledger_id)
    ledgers = tally.parse_ledgers(ledgers_xml)
    
    # Vouchers
    # Wait, Tally's daybook can't easily filter by ALTERID in standard XML. 
    # Usually we'd use a custom collection for vouchers too.
    # For now, we will still fetch vouchers and simulate.
    vouchers_xml = tally.export_vouchers() 
    vouchers = tally.parse_vouchers(vouchers_xml)
    
    # Dummy parse for godowns, cost centres, edit_logs
    # In a full implementation we'd add parsing methods in tally_client and use them
    godowns = [] 
    cost_centres = []
    edit_logs = []
    
    # 2. Push to FastAPI Backend
    try:
        if ledgers:
            res_ledgers = requests.post(f"{BACKEND_API_URL}/ledgers?company_id={COMPANY_ID}", json=ledgers)
            print("Ledgers sync response:", res_ledgers.status_code, res_ledgers.text)
            
        if vouchers:
            res_vouchers = requests.post(f"{BACKEND_API_URL}/vouchers?company_id={COMPANY_ID}", json=vouchers)
            print("Vouchers sync response:", res_vouchers.status_code, res_vouchers.text)
            
        if godowns:
            requests.post(f"{BACKEND_API_URL}/godowns?company_id={COMPANY_ID}", json=godowns)
            
        if cost_centres:
            requests.post(f"{BACKEND_API_URL}/cost_centres?company_id={COMPANY_ID}", json=cost_centres)
            
        if edit_logs:
            requests.post(f"{BACKEND_API_URL}/edit_log?company_id={COMPANY_ID}", json=edit_logs)
            
    except Exception as e:
        print("Failed to push data to backend:", e)

if __name__ == "__main__":
    scheduler = BackgroundScheduler()
    # Schedule to run every 30 seconds
    scheduler.add_job(sync_job, 'interval', seconds=30)
    scheduler.start()
    
    print("Sync Agent started. Press Ctrl+C to exit.")
    
    try:
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        print("Sync Agent stopped.")
