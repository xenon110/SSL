import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('c:/Users/yashs/Downloads/Tally/sync_agent/.env')
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
sb = create_client(url, key)

try:
    res = sb.from_("mv_party_outstandings").select("*").limit(1).execute()
    print("SUCCESS: mv_party_outstandings exists!")
except Exception as e:
    print(f"ERROR: {e}")
