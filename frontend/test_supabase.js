const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key) acc[key.trim()] = value.join('=').trim().replace(/"/g, '');
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllData(queryBuilder) {
  let allData = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    const { data, error } = await queryBuilder.range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < step) break;
    from += step;
  }
  return { data: allData, error: null };
}

async function main() {
  const { data: comp } = await supabase.from('companies').select('id, name').eq('name', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)').single();
  
  if (comp) {
      let query = supabase.from('vouchers').select('id').eq('company_id', comp.id);
      const { data: allVouchers } = await fetchAllData(query);
      console.log('Total fetched with fetchAllData:', allVouchers?.length);
  }
}

main();
