import xml.etree.ElementTree as ET
from tally_client import TallyClient

TALLY_URL = "http://localhost:9000"
COMPANY_NAME = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"

tally = TallyClient(url=TALLY_URL, company_name=COMPANY_NAME)

def verify():
    print("Fetching P&L from Tally...")
    pnl_xml = tally.export_profit_and_loss(from_date="20250401", to_date="20260331")
    if not pnl_xml:
        print("Failed to get P&L from Tally!")
        return
        
    with open("tally_raw_pnl.xml", "w", encoding="utf-8") as f:
        f.write(pnl_xml)
        
    print("Saved raw P&L XML.")
    # Tally P&L has multiple categories. Let's parse and print some key nodes to inspect the structure.
    try:
        root = ET.fromstring(pnl_xml)
        # Search for lines containing amounts or totals
        # In Tally's Profit & Loss report XML, elements can have tags like PLAMT, BSAMT, etc.
        # Let's print unique tags
        tags = set([c.tag for c in root.iter()])
        print("XML Tags in P&L Response:", tags)
        
        # Let's print some text content of tags related to PL
        print("\nDisplaying P&L text details:")
        count = 0
        for node in root.iter():
            if node.text and node.text.strip() and node.tag in ['DSPACCNAME', 'PLAMT', 'PLAMTA', 'BSAMT', 'BSAMTA']:
                print(f"  Tag: {node.tag} | Text: '{node.text.strip()}'")
                count += 1
                if count > 40:
                    break
    except Exception as e:
        print("Error parsing XML:", e)

if __name__ == "__main__":
    verify()
