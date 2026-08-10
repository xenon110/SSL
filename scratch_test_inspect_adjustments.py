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
res = sb.table('manual_adjustments').select('*').execute()
print("Manual Adjustments in DB:")
for r in res.data:
    print(r)
