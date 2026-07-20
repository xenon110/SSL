import os
from supabase import create_client

from dotenv import load_dotenv

# Use robust relative path
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend', '.env.local')
load_dotenv(env_path)

url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
sb = create_client(url, key)
comp = sb.table('companies').select('id, name').like('name', 'SMRIDHI SPONGE LIMITED%').execute()
company_id = comp.data[0]['id']

res = sb.table('ledgers').select('*').eq('company_id', company_id).eq('name', 'Profit & Loss A/c').execute()
if res.data:
    print(res.data)
else:
    print("No Profit & Loss A/c ledger found")
