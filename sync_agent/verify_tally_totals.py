import os
from supabase import create_client

# Read credentials
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
                if k == 'SUPABASE_URL': url = v
                elif k == 'SUPABASE_KEY': key = v

sb = create_client(url, key)
company_id = "a98b4f9e-ff1c-454e-a38c-c5db9a62c454"

print("--- Querying Vouchers between 2026-04-01 and 2026-07-15 ---")
vouchers = []
start = 0
while True:
    res = sb.table('vouchers').select('voucher_type_name, amount, date').eq('company_id', company_id).gte('date', '2026-04-01').lte('date', '2026-07-15').range(start, start + 999).execute()
    data = res.data
    if not data:
        break
    vouchers.extend(data)
    if len(data) < 1000:
        break
    start += 1000
print(f"Total vouchers found: {len(vouchers)}")

by_type = {}
for v in vouchers:
    t = v['voucher_type_name']
    amt = float(v['amount'] or 0)
    if t not in by_type:
        by_type[t] = {"count": 0, "total_amount": 0.0}
    by_type[t]["count"] += 1
    by_type[t]["total_amount"] += amt

print("\nSummary by Voucher Type:")
for t, stats in by_type.items():
    print(f"Type: {t:25} | Count: {stats['count']:5} | Total Amount: {stats['total_amount']:18,.2f}")
