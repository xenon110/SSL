import os
import asyncio
from supabase import create_client

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://hngtdxewmwtwpxgbbkse.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...") # This is just a dummy key for syntax, I need to read the env file

import json
from dotenv import load_dotenv

load_dotenv(dotenv_path="c:/Users/yashs/Downloads/Tally/frontend/.env.local")
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

res = supabase.table('companies').select('id, name').execute()
print("Companies:", res.data)

if res.data:
    company_id = res.data[0]['id']
    vouchers = supabase.table('vouchers').select('id, date').eq('company_id', company_id).limit(5).execute()
    print("Sample Vouchers:", vouchers.data)
    
    count = supabase.table('vouchers').select('id', count='exact').eq('company_id', company_id).execute()
    print("Total vouchers:", count.count)
