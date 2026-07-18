import os
import csv
import json
from supabase import create_client

# Read credentials from sync_agent/.env
env_path = 'c:/Users/yashs/Downloads/Tally/sync_agent/.env'
url = ''
key = ''

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line:
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip('\'\"')
                if k == 'SUPABASE_URL':
                    url = v
                elif k == 'SUPABASE_KEY':
                    key = v

if not url or not key:
    env_path_fallback = 'c:/Users/yashs/Downloads/Tally/frontend/.env.local'
    if os.path.exists(env_path_fallback):
        with open(env_path_fallback, 'r') as f:
            for line in f:
                if '=' in line:
                    k, v = line.split('=', 1)
                    k = k.strip()
                    v = v.strip().strip('\'\"')
                    if k == 'NEXT_PUBLIC_SUPABASE_URL':
                        url = v
                    elif k == 'SUPABASE_SERVICE_ROLE_KEY':
                        key = v

print(f"Connecting to Supabase at: {url}")
sb = create_client(url, key)

company_name = "SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)"
print(f"Fetching company ID for '{company_name}'...")
res = sb.table('companies').select('id').eq('name', company_name).execute()
if not res.data:
    print("Company not found!")
    exit(1)

company_id = res.data[0]['id']
print(f"Company ID: {company_id}")

# Fetch all ledgers to build ledger state map
print("Fetching ledgers for state mapping...")
res_ledgers = sb.table('ledgers').select('name, state').eq('company_id', company_id).execute()
ledger_state_map = {l['name']: l['state'] for l in res_ledgers.data if l['name'] and l['state']}

# State to Region mapping
state_to_region = {
    "Delhi": "North Region", "Haryana": "North Region", "Punjab": "North Region", "Uttar Pradesh": "North Region", 
    "Uttarakhand": "North Region", "Himachal Pradesh": "North Region", "Jammu & Kashmir": "North Region", "Chandigarh": "North Region",
    "Maharashtra": "West Region", "Gujarat": "West Region", "Rajasthan": "West Region", "Goa": "West Region", 
    "Dadra & Nagar Haveli and Daman & Diu": "West Region", "Dadra and Nagar Haveli and Daman and Diu": "West Region",
    "Karnataka": "South Region", "Tamil Nadu": "South Region", "Kerala": "South Region", "Andhra Pradesh": "South Region", "Telangana": "South Region", "Puducherry": "South Region",
    "West Bengal": "East Region", "Bihar": "East Region", "Odisha": "East Region", "Jharkhand": "East Region",
    "Madhya Pradesh": "Central Region", "Chhattisgarh": "Central Region",
    "Assam": "North East Region", "Sikkim": "North East Region", "Meghalaya": "North East Region", "Tripura": "North East Region", 
    "Arunachal Pradesh": "North East Region", "Manipur": "North East Region", "Mizoram": "North East Region", "Nagaland": "North East Region"
}

# Fetch vouchers with related tables in pages
print("Fetching vouchers (with ledgers and inventory) in pages...")
vouchers = []
start = 0
while True:
    print(f"  Fetching range {start} to {start + 999}...")
    res_v = sb.table('vouchers').select('*, voucher_ledgers(*), voucher_inventory(*)').eq('company_id', company_id).range(start, start + 999).execute()
    data = res_v.data
    if not data:
        break
    vouchers.extend(data)
    if len(data) < 1000:
        break
    start += 1000

print(f"Total vouchers retrieved: {len(vouchers)}")

# Process into sales register rows
sales_register = []

for v in vouchers:
    v_type = v['voucher_type_name']
    is_sales = ('sales' in v_type.lower() or v_type == 'POS Invoice') and not ('order' in v_type.lower() or 'delivery' in v_type.lower() or 'proforma' in v_type.lower())
    is_return = 'credit note' in v_type.lower() or 'return' in v_type.lower()
    
    if not (is_sales or is_return):
        continue
        
    v_num = v.get('voucher_number') or v.get('tally_guid', '')[:8]
    date = v.get('date', '')
    customer = v.get('party_ledger_name') or 'Cash'
    state = ledger_state_map.get(customer, 'Unknown State')
    region = state_to_region.get(state, 'Other Region' if state != 'Unknown State' else 'Unknown Region')
    
    # Calculate tax components for the invoice
    cgst = 0
    sgst = 0
    igst = 0
    other_charges = 0
    
    for l in (v.get('voucher_ledgers') or []):
        if l['ledger_name'] == customer:
            continue
        l_name = l['ledger_name'].lower()
        amt = float(l['amount'] or 0)
        
        if 'cgst' in l_name:
            cgst += amt
        elif 'sgst' in l_name:
            sgst += amt
        elif 'igst' in l_name:
            igst += amt
        elif 'gst' in l_name:
            # General GST ledger
            if 'output' in l_name:
                igst += amt # fallback to IGST or split
            else:
                other_charges += amt
        else:
            other_charges += amt
            
    status = "Return" if is_return else "Sale"
    invoice_amount = float(v.get('amount') or 0)
    
    inventories = v.get('voucher_inventory') or []
    if not inventories:
        # Service invoice or ledger-only invoice
        row = {
            "Date": date,
            "Voucher Number": v_num,
            "Voucher Type": v_type,
            "Status": status,
            "Customer Name": customer,
            "State": state,
            "Region": region,
            "Product Name": "Services/Ledger Entry",
            "Quantity": "",
            "Rate": "",
            "Product Net Amount": invoice_amount - (cgst + sgst + igst + other_charges),
            "CGST": cgst,
            "SGST": sgst,
            "IGST": igst,
            "Other Charges": other_charges,
            "Invoice Total": invoice_amount
        }
        sales_register.append(row)
    else:
        # Multi-item inventory invoice: split rows by product
        for idx, inv in enumerate(inventories):
            prod_name = inv.get('stock_item_name') or 'Unknown Product'
            qty = float(inv.get('billed_qty') or 0)
            rate = float(inv.get('rate') or 0)
            prod_amt = float(inv.get('amount') or 0)
            
            # Show taxes and other charges only on the first item line of the invoice
            # or distribute them? (Standard practice is to display invoice level details on first line or repeat them).
            # We will display them on the first line to prevent double counting of totals when summing columns.
            row = {
                "Date": date,
                "Voucher Number": v_num,
                "Voucher Type": v_type,
                "Status": status,
                "Customer Name": customer,
                "State": state,
                "Region": region,
                "Product Name": prod_name,
                "Quantity": qty,
                "Rate": rate,
                "Product Net Amount": prod_amt,
                "CGST": cgst if idx == 0 else 0.0,
                "SGST": sgst if idx == 0 else 0.0,
                "IGST": igst if idx == 0 else 0.0,
                "Other Charges": other_charges if idx == 0 else 0.0,
                "Invoice Total": invoice_amount if idx == 0 else 0.0
            }
            sales_register.append(row)

# Save to CSV in workspace and artifacts
output_csv_workspace = 'c:/Users/yashs/Downloads/Tally/samridhi_sales_register.csv'
output_csv_artifacts = 'C:/Users/yashs/.gemini/antigravity-ide/brain/7a755c9a-8a40-4638-aa17-44a9a6906503/samridhi_sales_register.csv'

fieldnames = [
    "Date", "Voucher Number", "Voucher Type", "Status", "Customer Name", 
    "State", "Region", "Product Name", "Quantity", "Rate", 
    "Product Net Amount", "CGST", "SGST", "IGST", "Other Charges", "Invoice Total"
]

def write_csv(filepath):
    with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for r in sales_register:
            writer.writerow(r)

print("Writing sales register CSV to workspace...")
write_csv(output_csv_workspace)

print("Writing sales register CSV to artifacts directory...")
write_csv(output_csv_artifacts)

print(f"Successfully extracted {len(sales_register)} lines of sales data!")
