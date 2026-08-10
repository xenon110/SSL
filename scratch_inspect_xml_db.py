import os
from supabase import create_client
from dotenv import load_dotenv

# Load env variables
env_path = 'c:/Users/yashs/Downloads/Tally/sync_agent/.env'
load_dotenv(env_path)

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

print(f"Connecting to Supabase at: {url}")
sb = create_client(url, key)

# Get the latest row from tally_stock_summary
res = sb.table('tally_stock_summary').select('raw_xml, from_date, to_date').order('last_synced_at', desc=True).limit(1).execute()

if res.data:
    row = res.data[0]
    print(f"Sync Period: {row['from_date']} to {row['to_date']}")
    xml = row['raw_xml']
    print(f"Total XML length: {len(xml)} characters")
    
    # Save a snippet of the XML to a local file so we can look at it
    output_path = 'c:/Users/yashs/Downloads/Tally/scratch/db_xml_snippet.xml'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml[:50000]) # write first 50k characters
    print(f"Saved first 50,000 characters of XML to {output_path}")
else:
    print("No records found in tally_stock_summary table.")
