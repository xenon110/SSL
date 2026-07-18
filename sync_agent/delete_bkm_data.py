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

bkm_name = "BKM INDUSTRIES LIMITED"
print(f"Searching for company: '{bkm_name}'...")

# Find the company
res = sb.table('companies').select('*').eq('name', bkm_name).execute()
if not res.data:
    print(f"Company '{bkm_name}' was not found in the database. Deletion skipped or already completed.")
else:
    bkm_id = res.data[0]['id']
    print(f"Found Company '{bkm_name}' with ID: {bkm_id}")
    
    print("\n--- Deleting BKM Industries data ---")
    
    # 1. Delete from outstanding_bills (matched by company_name)
    print("Deleting from outstanding_bills...")
    bill_res = sb.table('outstanding_bills').delete().eq('company_name', bkm_name).execute()
    print(f"-> Deleted {len(bill_res.data) if bill_res.data else 0} records from outstanding_bills.")
    
    # 2. Delete from sync_logs (matched by company_id)
    print("Deleting from sync_logs...")
    log_res = sb.table('sync_logs').delete().eq('company_id', bkm_id).execute()
    print(f"-> Deleted {len(log_res.data) if log_res.data else 0} records from sync_logs.")

    # 3. Delete other tables that don't have CASCADE if any. We checked that audit_logs, manual_adjustments, 
    # report_access_logs, and insight_audit_logs had 0 records, but we can clean them up just in case.
    for tbl in ['audit_logs', 'manual_adjustments', 'report_access_logs', 'insight_audit_logs']:
        try:
            tbl_res = sb.table(tbl).delete().eq('company_id', bkm_id).execute()
            deleted_count = len(tbl_res.data) if tbl_res.data else 0
            if deleted_count > 0:
                print(f"-> Deleted {deleted_count} records from {tbl}.")
        except Exception as e:
            # table might not exist or fail to delete
            pass
            
    # 4. Delete the company (which cascades to groups, ledgers, stock_items, vouchers, voucher_ledgers, voucher_inventory, alerts)
    print("Deleting from companies (cascading all other data)...")
    comp_del_res = sb.table('companies').delete().eq('id', bkm_id).execute()
    print(f"-> Deleted company record: {comp_del_res.data}")
    
    print("\nDeletion completed successfully!")
