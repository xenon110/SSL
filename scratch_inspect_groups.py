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
res = sb.table('groups').select('*').limit(10).execute()
print("Example Groups in DB:")
for g in res.data:
    print(g)

groups = sb.table('groups').select('name, parent').execute().data
print(f"\nTotal Groups: {len(groups)}")
groups_with_parent = [g for g in groups if g['parent']]
print(f"Groups with parent: {len(groups_with_parent)}")
if groups_with_parent:
    print("Example groups with parents:")
    for g in groups_with_parent[:10]:
        print(f"  {g['name']} -> {g['parent']}")
