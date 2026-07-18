import sys
sys.path.append('c:/Users/yashs/Downloads/Tally/sync_agent')
from main import sync_company
from supabase import create_client

import os
from dotenv import load_dotenv
load_dotenv('c:/Users/yashs/Downloads/Tally/sync_agent/.env')

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
sb = create_client(supabase_url, supabase_key)

sync_company(sb, 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)')
print("Force sync complete!")
