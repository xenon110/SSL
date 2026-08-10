import urllib.request
import json

req = urllib.request.Request('http://localhost:3000/api/pnl-balance-sheet?startDate=2024-04-01&endDate=2027-03-31')
req.add_header('Cookie', 'active-company=SMRIDHI%20SPONGE%20LIMITED%20-%20(from%201-Apr-24)%20-%20(from%201-Apr-25)')

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print('Total Assets:', data['totalAssets'])
        print('\nAssets Breakdown:')
        for a in data['assets']:
            if a['balance'] > 0:
                print(f"{a['name']}: {a['balance']}")
except Exception as e:
    print('Error:', e)
