import xml.etree.ElementTree as ET
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from tally_client import clean_xml

xml = open('raw_vouchers.xml', 'r', encoding='utf-8').read()
root = ET.fromstring(clean_xml(xml))
vouchers = root.findall('.//VOUCHER')
print(f'Total VOUCHER tags found: {len(vouchers)}')
for i, v in enumerate(vouchers[:15]):
    vtype = v.get('VCHTYPE', '?')
    date = v.findtext('DATE', '?')
    guid = v.get('REMOTEID', '?')[:40]
    party = v.findtext('PARTYLEDGERNAME', '?')
    print(f'  [{i+1}] TYPE={vtype} DATE={date} PARTY={party} GUID={guid}')

# Check what fields are on the first voucher
if vouchers:
    v0 = vouchers[0]
    print(f'\nFirst voucher attributes: {v0.attrib}')
    print(f'\nFirst voucher child tags:')
    for child in list(v0)[:40]:
        text = child.text[:60] if child.text else ''
        print(f'  {child.tag} = {text}')
    
    # Check for ledger entries
    le = v0.findall('.//ALLLEDGERENTRIES.LIST') + v0.findall('.//LEDGERENTRIES.LIST')
    print(f'\nLedger entries in first voucher: {len(le)}')
    for l in le[:5]:
        print(f'  {l.findtext("LEDGERNAME")} = {l.findtext("AMOUNT")}')
    
    # Check for inventory entries
    ie = v0.findall('.//ALLINVENTORYENTRIES.LIST') + v0.findall('.//INVENTORYENTRIES.LIST')
    print(f'\nInventory entries in first voucher: {len(ie)}')
    for inv in ie[:5]:
        print(f'  {inv.findtext("STOCKITEMNAME")} qty={inv.findtext("BILLEDQTY")} rate={inv.findtext("RATE")} amt={inv.findtext("AMOUNT")}')
