import requests
import json

url = "http://localhost:3000/api/pnl-balance-sheet?startDate=2024-04-01&endDate=2027-03-31"
res = requests.get(url)
try:
    data = res.json()
    print("KPIs:")
    print(json.dumps(data.get('kpis'), indent=2))
    print("\nDetailed Transactions Sample (first 2):")
    txs = data.get('detailedTransactions', [])
    print(json.dumps(txs[:2], indent=2))
    print(f"Total transactions: {len(txs)}")
    
    print("\nPnL Incomes Sample (first 2):")
    print(json.dumps(data.get('pnlGroups', {}).get('incomes', [])[:2], indent=2))
    print("\nPnL Expenses Sample (first 2):")
    print(json.dumps(data.get('pnlGroups', {}).get('expenses', [])[:2], indent=2))

except Exception as e:
    print("Failed to parse JSON", e)
    print("Response text:", res.text)
