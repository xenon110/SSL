import json
from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv('.env')
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))
res = sb.table('tally_stock_summary').select('json_data').limit(1).execute()
if res.data:
    data = res.data[0]['json_data']
    env = data.get('ENVELOPE', {})
    names = env.get('DSPACCNAME', [])
    infos = env.get('DSPSTKINFO', [])
    if not isinstance(names, list): names = [names]
    if not isinstance(infos, list): infos = [infos]
    # Find sponge iron
    for i in range(len(names)):
        n = names[i]
        disp = str(n.get('DSPDISPNAME','') if isinstance(n, dict) else n)
        if 'sponge' in disp.lower() or 'finish' in disp.lower():
            info = infos[i] if i < len(infos) else {}
            stkin = info.get('DSPSTKIN', {}) if info else {}
            stkout = info.get('DSPSTKOUT', {}) if info else {}
            print("ITEM:", disp)
            print("  ALL STKIN KEYS:", list(stkin.keys()) if stkin else 'none')
            print("  ALL STKOUT KEYS:", list(stkout.keys()) if stkout else 'none')
            print("  STKIN data:", json.dumps(stkin, indent=2) if stkin else 'empty')
            print("  STKOUT data:", json.dumps(stkout, indent=2) if stkout else 'empty')
            print()
else:
    print("No stock summary data found")
