import os
from supabase import create_client

url = os.environ.get('SUPABASE_URL', '')
key = os.environ.get('SUPABASE_KEY', '')

# If not in env, we can parse it from frontend/.env.local
env_path = 'C:/Users/yashs/Downloads/Tally/frontend/.env.local'
try:
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('NEXT_PUBLIC_SUPABASE_URL'): url = line.split('=', 1)[1].strip().strip('\'\"')
            if line.startswith('SUPABASE_SERVICE_ROLE_KEY'): key = line.split('=', 1)[1].strip().strip('\'\"')
except Exception as e:
    print(f"Could not read env file: {e}")

sb = create_client(url, key)

# Get Company
comp = sb.table('companies').select('id, name').eq('name', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)').execute()
if not comp.data:
    print("Company not found")
    exit(1)
company_id = comp.data[0]['id']
print(f"Company: {comp.data[0]['name']}")

# Get Groups
groups = sb.table('groups').select('*').execute().data
group_map = {g['name']: g.get('parent') for g in groups}

def get_root_class(g_name):
    curr = g_name
    depth = 0
    while curr and depth < 20:
        if curr in ['Sales Accounts', 'Direct Incomes', 'Indirect Incomes']: return 'PNL', 'INCOME'
        if curr in ['Purchase Accounts', 'Direct Expenses', 'Indirect Expenses']: return 'PNL', 'EXPENSE'
        if curr in ['Current Assets', 'Fixed Assets', 'Investments', 'Misc. Expenses (ASSET)']: return 'ASSET', curr
        if curr in ['Capital Account', 'Loans (Liability)', 'Current Liabilities', 'Suspense A/c', 'Branch / Divisions']: return 'LIABILITY', curr
        curr = group_map.get(curr, '')
        depth += 1
    return None, None

# Get Ledgers
ledgers = sb.table('ledgers').select('*').eq('company_id', company_id).execute().data
ledger_cls = {}
for l in ledgers:
    cat, typ = get_root_class(l.get('parent_group'))
    if cat:
        ledger_cls[l['name']] = {'cat': cat, 'typ': typ, 'open': float(l.get('opening_balance', 0)), 'is_debit': l.get('is_debit', False)}

# Aggregates
bs_aggs = {}
for l in ledgers:
    cls = ledger_cls.get(l['name'])
    if cls and cls['cat'] != 'PNL':
        initial = cls['open'] if cls['is_debit'] else -cls['open']
        bs_aggs[l['name']] = {'cat': cls['cat'], 'balance': initial}

# Get Vouchers
print('Fetching vouchers...')
vouchers = sb.table('vouchers').select('date, is_deleted, is_cancelled, is_optional, voucher_ledgers(ledger_name, amount, is_debit)').eq('company_id', company_id).eq('is_deleted', False).eq('is_cancelled', False).eq('is_optional', False).execute().data

total_income = 0
total_expense = 0

for v in vouchers:
    for l in v.get('voucher_ledgers', []):
        cls = ledger_cls.get(l['ledger_name'])
        if not cls: continue
        amt = float(l.get('amount', 0))
        net = amt if l.get('is_debit') else -amt
        
        if cls['cat'] == 'PNL':
            if cls['typ'] == 'INCOME': total_income += -net
            else: total_expense += net
        else:
            if l['ledger_name'] not in bs_aggs:
                bs_aggs[l['ledger_name']] = {'cat': cls['cat'], 'balance': 0}
            bs_aggs[l['ledger_name']]['balance'] += net

net_profit = total_income - total_expense
if net_profit < 0:
    bs_aggs['Profit & Loss A/c'] = {'cat': 'ASSET', 'balance': abs(net_profit)}

assets = [a for k, a in bs_aggs.items() if a['cat'] == 'ASSET' and a['balance'] > 0.01]
assets.sort(key=lambda x: x['balance'], reverse=True)
total_assets = sum([a['balance'] for a in assets])

print(f'\n--- SUMMARY ---')
print(f'Net Profit: {net_profit}')
print(f'Total Assets: {total_assets}')
print(f'Total Income: {total_income}')
print(f'Total Expense: {total_expense}')
print('\n--- TOP 15 ASSETS ---')
sorted_assets = sorted([(k, a) for k, a in bs_aggs.items() if a['cat'] == 'ASSET'], key=lambda x: x[1]['balance'], reverse=True)
for k, a in sorted_assets[:15]:
    print(f'{k}: {a["balance"]}')
