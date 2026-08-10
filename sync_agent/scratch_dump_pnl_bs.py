import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from tally_client import TallyClient

tally = TallyClient(url="http://localhost:9000")
pnl_xml = tally.export_profit_and_loss()
bs_xml = tally.export_balance_sheet()

pnl_data = tally.parse_profit_and_loss(pnl_xml)
bs_data = tally.parse_balance_sheet(bs_xml)

print("--- PnL Data ---")
for k, v in pnl_data.items():
    print(f"{k}: {v}")

print("\n--- BS Data ---")
for k, v in bs_data.items():
    print(f"{k}: {v}")

