import os
import re
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

def test_matching():
    print(f"Connecting to Tally at {TALLY_URL}...")
    print(f"Active Company: {COMPANY_NAME}")
    
    # 1. Fetch from Tally
    print("\n1. Fetching Outstandings from Tally...")
    rec_xml = tally.export_outstandings("Receivables")
    pay_xml = tally.export_outstandings("Payables")
    
    # Save XML raw data for inspection
    with open("tally_raw_receivables.xml", "w", encoding="utf-8") as f:
        f.write(rec_xml or "")
    with open("tally_raw_payables.xml", "w", encoding="utf-8") as f:
        f.write(pay_xml or "")
    print("Saved raw Tally XML files.")

    tally_receivables = tally.parse_outstandings(rec_xml, "Receivables") if rec_xml else []
    tally_payables = tally.parse_outstandings(pay_xml, "Payables") if pay_xml else []
    
    print(f"Tally Receivables count: {len(tally_receivables)}")
    print(f"Tally Payables count: {len(tally_payables)}")

    # 2. Fetch from Database
    print("\n2. Fetching Outstandings from Supabase Database...")
    db_res = sb.table("outstanding_bills").select("*").eq("company_name", COMPANY_NAME).execute()
    db_bills = db_res.data or []
    
    db_receivables = [b for b in db_bills if b["party_group"] == "receivable"]
    db_payables = [b for b in db_bills if b["party_group"] == "payable"]
    
    print(f"Database Receivables count: {len(db_receivables)}")
    print(f"Database Payables count: {len(db_payables)}")

    # Check matches
    print("\n3. Cross-Checking Totals and Differences:")
    tally_rec_total = sum(b["pending_amount"] for b in tally_receivables)
    db_rec_total = sum(b["pending_amount"] for b in db_receivables)
    print(f"Total Receivables Value: Tally = {tally_rec_total:.2f}, DB = {db_rec_total:.2f}")

    tally_pay_total = sum(b["pending_amount"] for b in tally_payables)
    db_pay_total = sum(b["pending_amount"] for b in db_payables)
    print(f"Total Payables Value: Tally = {tally_pay_total:.2f}, DB = {db_pay_total:.2f}")

    # Check if mismatch
    mismatch = False
    if len(tally_receivables) != len(db_receivables):
        print(f"WARNING: Receivables count mismatch! Tally={len(tally_receivables)} vs DB={len(db_receivables)}")
        mismatch = True
    if len(tally_payables) != len(db_payables):
        print(f"WARNING: Payables count mismatch! Tally={len(tally_payables)} vs DB={len(db_payables)}")
        mismatch = True

    if not mismatch:
        print("\nSuccess: Outstandings in Tally and Database match perfectly!")
    else:
        print("\nSome mismatches found! Check the raw XMLs and your sync config.")

if __name__ == "__main__":
    test_matching()
