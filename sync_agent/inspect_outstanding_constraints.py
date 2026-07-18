import os
from supabase import create_client

SUPABASE_URL = "https://rnebzqsgkgverxdqgmgp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect():
    # We can execute a custom SQL query by invoking a RPC or inspect the schema
    # Let's inspect the fields and check if there are any errors or if we can see the table structure
    try:
        print("Fetching unique index definitions...")
        # Since we can't run raw SQL directly without RPC, let's check what error message is returned when we try to insert duplicate records
        test_data = [
            {
                "company_name": "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)",
                "party_ledger": "TEST_PARTY_UNIQUE",
                "party_group": "payable",
                "bill_ref": "TEST_REF_1",
                "bill_type": "new_ref",
                "bill_date": "2025-05-01",
                "due_date": "2025-05-01",
                "pending_amount": 100.0,
                "as_on_date": "2026-07-18"
            },
            {
                "company_name": "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)",
                "party_ledger": "TEST_PARTY_UNIQUE",
                "party_group": "payable",
                "bill_ref": "TEST_REF_1",
                "bill_type": "new_ref",
                "bill_date": "2025-05-01",
                "due_date": "2025-05-01",
                "pending_amount": 200.0,
                "as_on_date": "2026-07-18"
            }
        ]
        print("Inserting first test record...")
        r1 = sb.table("outstanding_bills").insert(test_data[0]).execute()
        print("R1 Success")
        
        try:
            print("Inserting second test record (identical keys)...")
            r2 = sb.table("outstanding_bills").insert(test_data[1]).execute()
            print("R2 Success (No unique constraint!)")
        except Exception as e:
            print(f"R2 Failed! Unique Constraint Exists: {e}")
            
        # Clean up
        sb.table("outstanding_bills").delete().eq("party_ledger", "TEST_PARTY_UNIQUE").execute()
        print("Cleaned up test data.")
        
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    inspect()
