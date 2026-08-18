import os
import sys
from tally_client import TallyClient

def test_vouchers_parse():
    client = TallyClient()
    
    test_xml = """<ENVELOPE>
        <VOUCHER>
            <DATE>20250829</DATE>
            <GUID>test-guid-123</GUID>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>S-001</VOUCHERNUMBER>
            <PARTYLEDGERNAME>Customer A</PARTYLEDGERNAME>
            <AMOUNT>1500.00</AMOUNT>
            <LEDGERENTRIES.LIST>
                <LEDGERNAME>Sales A/c</LEDGERNAME>
                <AMOUNT>1500.00</AMOUNT>
            </LEDGERENTRIES.LIST>
        </VOUCHER>
    </ENVELOPE>"""
    
    vouchers = client.parse_vouchers(test_xml)
    print(f"Parsed {len(vouchers)} vouchers")
    if vouchers:
        print("First voucher date:", vouchers[0]['date'])
        print("First voucher amount:", vouchers[0]['amount'])
        print("Ledger name:", vouchers[0]['ledgers'][0]['ledger_name'])

if __name__ == "__main__":
    test_vouchers_parse()
