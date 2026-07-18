import re
from tally_client import TallyClient

TALLY_URL = "http://localhost:9000"
COMPANY_NAME = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"

tally = TallyClient(url=TALLY_URL, company_name=COMPANY_NAME)

def check_ledgers():
    print("Fetching raw ledgers from Tally...")
    ledgers_xml = tally.export_ledgers()
    if not ledgers_xml:
        print("No response from Tally!")
        return
        
    ledgers = tally.parse_ledgers(ledgers_xml)
    print(f"Total ledgers parsed: {len(ledgers)}")
    
    long_gstin = []
    long_phone = []
    long_state = []
    
    for l in ledgers:
        name = l["name"]
        gstin = l.get("gstin") or ""
        phone = l.get("phone") or ""
        state = l.get("state") or ""
        
        if len(gstin) > 15:
            long_gstin.append((name, gstin, len(gstin)))
        if len(phone) > 15:
            long_phone.append((name, phone, len(phone)))
        if len(state) > 15:
            long_state.append((name, state, len(state)))
            
    print(f"\nLedgers with GSTIN > 15 chars: {len(long_gstin)}")
    for name, val, l_len in long_gstin[:10]:
        print(f"  Name: {name} | GSTIN: '{val}' ({l_len} chars)")
        
    print(f"\nLedgers with Phone > 15 chars: {len(long_phone)}")
    for name, val, l_len in long_phone[:10]:
        print(f"  Name: {name} | Phone: '{val}' ({l_len} chars)")
        
    print(f"\nLedgers with State > 15 chars: {len(long_state)}")
    for name, val, l_len in long_state[:10]:
        print(f"  Name: {name} | State: '{val}' ({l_len} chars)")

if __name__ == "__main__":
    check_ledgers()
