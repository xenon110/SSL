import os
from supabase import create_client
from dotenv import load_dotenv

# Load env variables
env_path = 'c:/Users/yashs/Downloads/Tally/sync_agent/.env'
load_dotenv(env_path)

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

sb = create_client(url, key)
company_id = "a98b4f9e-ff1c-454e-a38c-c5db9a62c454" # SMRIDHI SPONGE LIMITED

tables = ['ledgers', 'stock_items', 'vouchers', 'voucher_ledgers', 'voucher_inventory']

print("Starting column analysis for SMRIDHI SPONGE LIMITED...")

for table in tables:
    print(f"\n==================== TABLE: {table} ====================")
    try:
        # Fetch up to 1000 rows to estimate column fill rate
        # For child tables (voucher_ledgers, voucher_inventory), we first need to get vouchers of SMRIDHI
        if table in ['voucher_ledgers', 'voucher_inventory']:
            res = sb.table(table).select('*').limit(1000).execute()
        else:
            res = sb.table(table).select('*').eq('company_id', company_id).limit(1000).execute()
            
        data = res.data
        if not data:
            print("No records found in this table.")
            continue
            
        total_rows = len(data)
        print(f"Analyzing {total_rows} sample rows:")
        
        # Calculate non-null percentage for each column
        columns = list(data[0].keys())
        for col in sorted(columns):
            non_null_count = sum(1 for row in data if row.get(col) is not None and str(row.get(col)).strip() != '' and str(row.get(col)) != '0' and str(row.get(col)) != '0.0')
            fill_rate = (non_null_count / total_rows) * 100
            print(f"  Column '{col}': {non_null_count}/{total_rows} filled ({fill_rate:.1f}%) - Sample: {data[0].get(col)}")
            
    except Exception as e:
        print(f"Error querying table {table}: {e}")
