import urllib.request
import time
import json

start = time.time()
try:
    req = urllib.request.Request("http://localhost:3000/api/dashboard")
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Success! Took {time.time() - start:.2f}s")
        print(f"Gross Sales: {data.get('kpis', {}).get('grossSales', {}).get('value')}")
except Exception as e:
    print(f"Error: {e} - Took {time.time() - start:.2f}s")
