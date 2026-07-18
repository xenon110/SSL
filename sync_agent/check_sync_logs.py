import requests

url = "https://rnebzqsgkgverxdqgmgp.supabase.co/rest/v1/sync_logs"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko"
}

params = {
    "order": "completed_at.desc",
    "limit": 20
}

res = requests.get(url, headers=headers, params=params)
if res.status_code == 200:
    print("Latest Sync Logs:")
    for log in res.json():
        print(f"Time: {log['completed_at']} | Company ID: {log['company_id']} | Source: {log['sync_source']} | Status: {log['status']} | Records: {log['records_inserted']}")
else:
    print("Error:", res.status_code)
