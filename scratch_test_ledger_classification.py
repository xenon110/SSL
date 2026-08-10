import os
from supabase import create_client

env_path = 'C:/Users/yashs/Downloads/Tally/frontend/.env.local'
url = ''
key = ''
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL'): url = line.split('=', 1)[1].strip().strip('\'\"')
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY'): key = line.split('=', 1)[1].strip().strip('\'\"')

sb = create_client(url, key)
comp = sb.table('companies').select('id, name').eq('name', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)').execute()
company_id = comp.data[0]['id']

groups = sb.table('groups').select('name, parent').execute().data
group_map = {g['name']: g['parent'] for g in groups}

def get_root_class(g_name):
    curr = g_name
    depth = 0
    while curr and depth < 20:
        lower = curr.lower().strip()
        if lower in ['sales accounts', 'direct incomes', 'indirect incomes']: return 'PNL', 'INCOME'
        if lower in ['purchase accounts', 'direct expenses', 'indirect expenses']: return 'PNL', 'EXPENSE'
        if lower in ['current assets', 'fixed assets', 'investments', 'misc. expenses (asset)', 'misc. expenses (asst)']: return 'ASSET', curr
        if lower in ['capital account', 'loans (liability)', 'current liabilities', 'suspense a/c', 'branch / divisions']: return 'LIABILITY', curr
        curr = group_map.get(curr, '')
        depth += 1
    return 'UNKNOWN', 'UNKNOWN'

ledgers = sb.table('ledgers').select('name, parent_group').eq('company_id', company_id).execute().data
class_counts = {}
for l in ledgers:
    cat, typ = get_root_class(l['parent_group'])
    class_counts[cat] = class_counts.get(cat, 0) + 1
    if cat == 'UNKNOWN':
        print(f"Unknown parent group path for Ledger {l['name']}: {l['parent_group']}")

print("\nClassification Counts:")
print(class_counts)
