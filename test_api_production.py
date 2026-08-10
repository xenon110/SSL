import urllib.request
import json

req = urllib.request.Request('http://localhost:3000/api/production?startDate=2024-04-01&endDate=2027-03-31')
req.add_header('Cookie', 'active-company=SMRIDHI%20SPONGE%20LIMITED%20-%20(from%201-Apr-24)%20-%20(from%201-Apr-25)')

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print('Total Production Value:', data['kpis']['totalProductionValue'])
        print('Total Raw Material Cost:', data['kpis']['totalRawMaterialCost'])
        print('Manufacturing Margin:', data['kpis']['manufacturingMargin'])
        for g in data['groupSummary']:
            print(f"Group: {g['name']}, InQty: {g['inQty']}, InVal: {g['inVal']}, OutQty: {g['outQty']}, OutVal: {g['outVal']}")
except Exception as e:
    print('Error:', e)
