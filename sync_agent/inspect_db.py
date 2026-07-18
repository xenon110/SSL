import os
from supabase import create_client

# Read credentials from sync_agent/.env
env_path = 'c:/Users/yashs/Downloads/Tally/sync_agent/.env'
url = ''
key = ''

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line:
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip('\'\"')
                if k == 'SUPABASE_URL':
                    url = v
                elif k == 'SUPABASE_KEY':
                    key = v

if not url or not key:
    # Try frontend/.env.local as fallback
    env_path_fallback = 'c:/Users/yashs/Downloads/Tally/frontend/.env.local'
    if os.path.exists(env_path_fallback):
        with open(env_path_fallback, 'r') as f:
            for line in f:
                if '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip('\'\"')
                    if k == 'NEXT_PUBLIC_SUPABASE_URL':
                        url = v
                    elif k == 'SUPABASE_SERVICE_ROLE_KEY':
                        key = v

print(f"Connecting to Supabase at: {url}")
sb = create_client(url, key)

# Get companies
res = sb.table('companies').select('*').execute()
companies = res.data

print("\n--- Current Companies in Database ---")
bkm_id = None
bkm_name = "BKM INDUSTRIES LIMITED"
samridhi_id = None
samridhi_name = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"

for comp in companies:
    print(f"ID: {comp['id']} | Name: '{comp['name']}' | GUID: {comp.get('tally_guid')}")
    if comp['name'].upper() == bkm_name.upper():
        bkm_id = comp['id']
    elif "SMRIDHI" in comp['name'].upper():
        samridhi_id = comp['id']
        samridhi_name = comp['name']

print(f"\nTarget BKM Company ID: {bkm_id}")
print(f"Target Samridhi Company ID: {samridhi_id}")

if not bkm_id:
    print("BKM INDUSTRIES LIMITED not found in the companies table.")
else:
    # Tables that reference company_id
    tables_by_id = [
        'user_profiles',
        'groups',
        'ledgers',
        'stock_items',
        'voucher_types',
        'vouchers',
        'sync_logs',
        'alerts',
        'audit_logs',
        'manual_adjustments',
        'report_access_logs',
        'insight_audit_logs'
    ]
    
    print("\n--- Inspecting related tables by company_id ---")
    for tbl in tables_by_id:
        try:
            # We fetch count of rows matching company_id
            tbl_res = sb.table(tbl).select('id', count='exact').eq('company_id', bkm_id).execute()
            count = tbl_res.count if tbl_res.count is not None else len(tbl_res.data)
            print(f"Table '{tbl}': {count} records found.")
        except Exception as e:
            # Table might not exist or schema differs
            print(f"Table '{tbl}': Error querying table: {e}")

    # Inspect other tables by company name
    print("\n--- Inspecting related tables by company_name (Text) ---")
    tables_by_name = [
        'outstanding_bills'
    ]
    for tbl in tables_by_name:
        try:
            tbl_res = sb.table(tbl).select('id', count='exact').eq('company_name', bkm_name).execute()
            count = tbl_res.count if tbl_res.count is not None else len(tbl_res.data)
            print(f"Table '{tbl}': {count} records found for '{bkm_name}'.")
        except Exception as e:
            print(f"Table '{tbl}': Error querying table: {e}")

    # Also check if there's any tally_stock_summary table
    try:
        tbl_res = sb.table('tally_stock_summary').select('id', count='exact').eq('company_id', bkm_id).execute()
        count = tbl_res.count if tbl_res.count is not None else len(tbl_res.data)
        print(f"Table 'tally_stock_summary': {count} records found.")
    except Exception as e:
        print(f"Table 'tally_stock_summary': Error querying table: {e}")
