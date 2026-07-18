import os
import datetime
from tally_client import TallyClient
from supabase import create_client

# Connection details
TALLY_URL = "http://localhost:9000"
COMPANY_NAME = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"

SUPABASE_URL = "https://rnebzqsgkgverxdqgmgp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko")

tally = TallyClient(url=TALLY_URL, company_name=COMPANY_NAME)
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_sync():
    print(f"Starting manual outstandings sync for {COMPANY_NAME}...")
    
    for r_type in ["Receivables", "Payables"]:
        print(f"\nProcessing {r_type}...")
        out_xml = tally.export_outstandings(r_type)
        if not out_xml:
            print(f"No XML response for {r_type}!")
            continue
            
        bills = tally.parse_outstandings(out_xml, r_type)
        for b in bills:
            b["party_group"] = "receivable" if r_type == "Receivables" else "payable"
            
        print(f"Found {len(bills)} bills in Tally.")
        
        if bills:
            # Delete existing
            print("Deleting existing records in DB...")
            del_res = sb.table("outstanding_bills").delete().eq("company_name", COMPANY_NAME).eq(
                "party_group", bills[0]["party_group"]).execute()
            print(f"Deleted records.")
            
            # Insert new
            print(f"Inserting {len(bills)} records into DB in batches of 100...")
            today = datetime.datetime.now().strftime("%Y-%m-%d")
            inserted_count = 0
            
            # Batch inserts to identify exactly where it fails
            batch_size = 100
            for i in range(0, len(bills), batch_size):
                batch = bills[i:i+batch_size]
                insert_data = [{
                    "company_name": COMPANY_NAME,
                    "party_ledger": b["party_ledger"],
                    "party_group": b["party_group"],
                    "bill_ref": b["bill_ref"],
                    "bill_type": b["bill_type"],
                    "bill_date": b["bill_date"],
                    "due_date": b["due_date"],
                    "pending_amount": b["pending_amount"],
                    "as_on_date": today
                } for b in batch]
                
                try:
                    res = sb.table("outstanding_bills").insert(insert_data).execute()
                    inserted_count += len(batch)
                    print(f"  Inserted batch {i//batch_size + 1}: +{len(batch)} records (Total: {inserted_count})")
                except Exception as e:
                    print(f"  ERROR inserting batch {i//batch_size + 1}: {e}")
                    # Let's inspect one of the items in the failed batch
                    if batch:
                        print("  Sample record from failed batch:")
                        print(batch[0])
                    break

if __name__ == "__main__":
    run_sync()
