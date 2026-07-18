import os
from supabase import create_client

SUPABASE_URL = "https://rnebzqsgkgverxdqgmgp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)
COMPANY_ID = "a98b4f9e-ff1c-454e-a38c-c5db9a62c454"

def inspect():
    try:
        # 1. Fetch liquidity accounts
        res = sb.table("ledgers").select("name, parent_group, closing_balance").eq("company_id", COMPANY_ID).in_(
            "parent_group", ["Bank Accounts", "Cash-in-Hand", "Bank OD A/c", "Bank OCC A/c"]
        ).execute()
        
        ledgers = res.data or []
        print("Liquidity Accounts in DB:")
        total_bank = 0
        total_cash = 0
        for l in ledgers:
            bal = float(l.get("closing_balance") or 0)
            print(f"  Name: {l['name']} | Group: {l['parent_group']} | Balance: {bal:,.2f}")
            if l['parent_group'] in ["Bank Accounts", "Bank OD A/c", "Bank OCC A/c"]:
                total_bank += bal
            else:
                total_cash += bal
                
        print(f"Total Bank Balance: {total_bank:,.2f}")
        print(f"Total Cash Balance: {total_cash:,.2f}")
        print(f"Total Cash & Bank: {total_bank + total_cash:,.2f}")
        
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    inspect()
