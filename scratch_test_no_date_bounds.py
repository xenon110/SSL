import os
from supabase import create_client

env_path = 'C:/Users/yashs/Downloads/Tally/frontend/.env.local'
url = ''
key = ''
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('NEXT_PUBLIC_SUPABASE_URL'): url = line.split('=', 1)[1].strip().strip('\'\"')
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY'): key = line.split('=', 1)[1].strip().strip('\'\"')

sb = create_client(url, key)
comp = sb.table('companies').select('id, name').eq('name', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)').execute()
company_id = comp.data[0]['id']

def run_fetch_all(query_builder):
    all_data = []
    start = 0
    step = 1000
    while True:
        res = query_builder.range(start, start + step - 1).execute()
        if not res.data:
            break
        all_data.extend(res.data)
        if len(res.data) < step:
            break
        start += step
    return all_data

# Query ALL sales vouchers without date bounds
v_query = sb.table('vouchers') \
    .select('id, date, voucher_type_name, amount') \
    .eq('is_deleted', False) \
    .eq('is_cancelled', False) \
    .eq('is_optional', False) \
    .eq('company_id', company_id) \
    .or_('voucher_type_name.ilike.%sales%,voucher_type_name.ilike.%pos invoice%,voucher_type_name.ilike.%credit note%,voucher_type_name.ilike.%delivery note%,voucher_type_name.ilike.%return%')

vouchers = run_fetch_all(v_query)

grossSales = 0
salesReturns = 0

for v in vouchers:
    vType = (v['voucher_type_name'] or '').lower()
    isSales = 'sales' in vType or vType == 'pos invoice'
    isCreditNote = 'credit note' in vType
    isOrder = 'sales order' in vType
    isDelivery = 'delivery note' in vType
    
    isSale = isSales and not isOrder and not isDelivery and not isCreditNote and 'debit note' not in vType
    isReturn = isCreditNote or 'return' in vType
    
    val = float(v['amount'] or 0)
    
    if isSale:
        grossSales += val
    if isReturn:
        salesReturns += val

print(f"Total Gross Sales overall: {grossSales:,.2f}")
print(f"Total Returns overall: {salesReturns:,.2f}")
print(f"Net Sales overall: {grossSales - salesReturns:,.2f}")
