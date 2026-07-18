import re
from tally_client import TallyClient

TALLY_URL = "http://localhost:9000"
COMPANY_NAME = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"

tally = TallyClient(url=TALLY_URL, company_name=COMPANY_NAME)

def check_tally():
    print("Fetching raw ledgers from Tally...")
    ledgers_xml = tally.export_ledgers()
    if not ledgers_xml:
        print("No response from Tally!")
        return
        
    ledgers = tally.parse_ledgers(ledgers_xml)
    print(f"Total ledgers parsed: {len(ledgers)}")
    
    liquidity_groups = ["Bank Accounts", "Cash-in-Hand", "Bank OD A/c", "Bank OCC A/c"]
    
    total_bank = 0
    total_cash = 0
    
    print("\nLiquidity Accounts in Tally:")
    for l in ledgers:
        if l.get("parent_group") in liquidity_groups:
            c_bal = float(l.get("closing_balance") or 0)
            print(f"  Name: {l['name']} | Group: {l['parent_group']} | Balance: {c_bal:,.2f}")
            if l['parent_group'] in ["Bank Accounts", "Bank OD A/c", "Bank OCC A/c"]:
                total_bank += c_bal
            else:
                total_cash += c_bal
                
    print(f"Total Bank Balance in Tally: {total_bank:,.2f}")
    print(f"Total Cash Balance in Tally: {total_cash:,.2f}")
    print(f"Total Cash & Bank in Tally: {total_bank + total_cash:,.2f}")

if __name__ == "__main__":
    check_tally()
