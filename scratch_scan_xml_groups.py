import os
import re
from supabase import create_client
from dotenv import load_dotenv

# Load env variables
env_path = 'c:/Users/yashs/Downloads/Tally/sync_agent/.env'
load_dotenv(env_path)

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

sb = create_client(url, key)

res = sb.table('tally_stock_summary').select('raw_xml').order('last_synced_at', desc=True).limit(1).execute()

if res.data:
    xml = res.data[0]['raw_xml']
    print("Scanning XML for unique account names...")
    names = re.findall(r'<DSPDISPNAME>(.*?)</DSPDISPNAME>', xml)
    
    unique_names = list(set([n.replace('&amp;', '&').strip() for n in names]))
    print(f"Total unique names in XML: {len(unique_names)}")
    
    print("\nSome names found in XML:")
    for n in sorted(unique_names)[:50]:
        print(f" - {n}")
        
    print("\nLooking for known group matches (case-insensitive):")
    for group in ['raw material', 'raw materials', 'finished goods', 'co product', 'by product', 'store', 'spares', 'wip', 'coal', 'sponge']:
        matches = [n for n in unique_names if group in n.lower()]
        print(f"Matches for '{group}': {len(matches)}")
        for m in matches[:5]:
            print(f"   * {m}")
else:
    print("No records found in tally_stock_summary table.")
