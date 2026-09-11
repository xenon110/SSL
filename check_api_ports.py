import urllib.request
import time
import json

for port in [3000, 3001, 3002, 3003, 3004]:
    try:
        req = urllib.request.Request(f"http://localhost:{port}/api/dashboard")
        with urllib.request.urlopen(req, timeout=10) as response:
            print(f"Port {port} Success!")
            break
    except Exception as e:
        print(f"Port {port} failed: {e}")
