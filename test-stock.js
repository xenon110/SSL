import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rnebzqsgkgverxdqgmgp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko'
);

async function check() {
  const { data, error } = await supabase.from('stock_items').select('name, parent_group').limit(5);
  console.log('Stock items:');
  console.log(data);
  
  const { data: v, error: ve } = await supabase.from('voucher_inventory').select('stock_item_name').limit(5);
  console.log('Voucher Inventory names:');
  console.log(v);
}
check();
