import os
import re

api_dir = r"c:\Users\yashs\Downloads\Tally\frontend\src\app\api"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # 1. Update import
    if "import { supabase }" in content:
        content = content.replace("import { supabase } from '@/lib/supabase';", "import { supabase, fetchAllData } from '@/lib/supabase';")
    elif "import { supabase, fetchAllData }" not in content and "from '@/lib/supabase'" in content:
        content = re.sub(r"import\s*\{\s*supabase\s*\}\s*from\s*'@/lib/supabase';", "import { supabase, fetchAllData } from '@/lib/supabase';", content)
        
    # 2. Update queries
    # Look for: const { data: vouchers, error } = await query; -> await fetchAllData(query);
    content = re.sub(r"await\s+query;", "await fetchAllData(query);", content)
    
    # Also for ledgersQuery
    content = re.sub(r"await\s+ledgersQuery;", "await fetchAllData(ledgersQuery);", content)
    
    # Also for cases like: const { data: ledgers, error: ledgersError } = await supabase.from('ledgers').select(...).eq(...)
    # It's safer to just let those be, or manually fix if they fetch >1000. 
    # Let's fix specific common ones:
    
    # In pnl/route.ts: await supabase.from('ledgers').select('name, parent_group, state').eq('company_id', companyId);
    content = re.sub(
        r"await\s+supabase\.from\('ledgers'\)\.select\(([^)]+)\)\.eq\('company_id',\s*companyId\);",
        r"await fetchAllData(supabase.from('ledgers').select(\1).eq('company_id', companyId));",
        content
    )
    
    # In inventory/route.ts: await supabase.from('stock_items').select(...).eq(...)
    content = re.sub(
        r"await\s+supabase\.from\('stock_items'\)\.select\(([^)]+)\)\.eq\('company_id',\s*companyId\);",
        r"await fetchAllData(supabase.from('stock_items').select(\1).eq('company_id', companyId));",
        content
    )
    
    # Groups: await supabase.from('groups').select(...)
    content = re.sub(
        r"await\s+supabase\.from\('groups'\)\.select\(([^)]+)\);",
        r"await fetchAllData(supabase.from('groups').select(\1));",
        content
    )

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for root, _, files in os.walk(api_dir):
    for f in files:
        if f == "route.ts":
            process_file(os.path.join(root, f))
