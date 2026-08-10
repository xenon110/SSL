import urllib.request
import json

req = urllib.request.Request('http://localhost:3000/api/pnl?startDate=2024-04-01&endDate=2027-03-31')
req.add_header('Cookie', 'active-company=SMRIDHI%20SPONGE%20LIMITED%20-%20(from%201-Apr-24)%20-%20(from%201-Apr-25)')

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print('Total Revenue (Total Income):', data['kpis']['totalIncome'])
        print('Gross Profit:', data['kpis']['grossProfit'])
        print('Net Profit:', data['kpis']['netProfit'])
except Exception as e:
    print('Error:', e)
