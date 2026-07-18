import requests

url = "https://rnebzqsgkgverxdqgmgp.supabase.co/rest/v1/vouchers"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko"
}

# Fetch min/max dates group by company_id
comp_url = "https://rnebzqsgkgverxdqgmgp.supabase.co/rest/v1/companies"
companies = requests.get(comp_url, headers=headers).json()

print("Voucher Date Ranges in DB by Company:")
for c in companies:
    params = {
        "company_id": f"eq.{c['id']}",
        "order": "date.asc",
        "limit": 1
    }
    min_res = requests.get(url, headers=headers, params=params).json()
    
    params["order"] = "date.desc"
    max_res = requests.get(url, headers=headers, params=params).json()
    
    if min_res and max_res:
        print(f"Company: {c['name']}")
        print(f"  Min Date: {min_res[0]['date']}")
        print(f"  Max Date: {max_res[0]['date']}")
    else:
        print(f"Company: {c['name']} has NO vouchers in DB.")
