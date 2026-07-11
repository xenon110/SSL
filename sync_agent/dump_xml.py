"""Save raw XML from Tally to a file for inspection"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from tally_client import TallyClient

tally = TallyClient(url="http://localhost:9000")

print("Fetching vouchers XML...")
xml = tally.export_vouchers()
if xml:
    with open("raw_vouchers.xml", "w", encoding="utf-8") as f:
        f.write(xml)
    print(f"Saved {len(xml)} chars to raw_vouchers.xml")
else:
    print("No XML received")

print("\nFetching ledgers XML...")
xml2 = tally.export_ledgers()
if xml2:
    with open("raw_ledgers.xml", "w", encoding="utf-8") as f:
        f.write(xml2)
    print(f"Saved {len(xml2)} chars to raw_ledgers.xml")
else:
    print("No XML received")
