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

res = sb.table('voucher_inventory').select('id').eq('company_id', company_id).limit(1).execute()
print('Has inventory:', len(res.data) > 0)
