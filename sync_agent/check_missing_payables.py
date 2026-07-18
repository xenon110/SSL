import os
from tally_client import TallyClient
from supabase import create_client

TALLY_URL = "http://localhost:9000"
COMPANY_NAME = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"
SUPABASE_URL = "https://rnebzqsgkgverxdqgmgp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko")

tally = TallyClient(url=TALLY_URL, company_name=COMPANY_NAME)
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

def check():
    print("Fetching Tally payables...")
    pay_xml = tally.export_outstandings("Payables")
    tally_payables = tally.parse_outstandings(pay_xml, "Payables") if pay_xml else []
    print(f"Total in Tally: {len(tally_payables)}")

    print("\nFetching DB payables...")
    db_res = sb.table("outstanding_bills").select("*").eq("company_name", COMPANY_NAME).eq("party_group", "payable").execute()
    db_payables = db_res.data or []
    print(f"Total in DB: {len(db_payables)}")

    # Let's see the set of refs
    tally_refs = set((b["party_ledger"], b["bill_ref"], b["bill_date"]) for b in tally_payables)
    db_refs = set((b["party_ledger"], b["bill_ref"], b["bill_date"]) for b in db_payables)

    missing = tally_refs - db_refs
    print(f"\nMissing payables in DB: {len(missing)}")
    
    if missing:
        print("Sample missing bills (first 10):")
        for idx, item in enumerate(list(missing)[:10]):
            print(f"  Party: {item[0]} | Ref: {item[1]} | Date: {item[2]}")
            
    extra = db_refs - tally_refs
    print(f"\nExtra payables in DB (not in Tally): {len(extra)}")
    if extra:
        print("Sample extra bills (first 10):")
        for idx, item in enumerate(list(extra)[:10]):
            print(f"  Party: {item[0]} | Ref: {item[1]} | Date: {item[2]}")

if __name__ == "__main__":
    check()
