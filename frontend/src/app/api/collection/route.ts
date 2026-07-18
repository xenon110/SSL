import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    const decodedName = decodeURIComponent(activeCompany);
    
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (!comp) return NextResponse.json({ dso: 0, target: 0, collected: 0 });
    
    // Compute collected from Receipt vouchers in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data: receipts } = await supabase
      .from('vouchers')
      .select('amount')
      .eq('company_id', comp.id)
      .eq('is_deleted', false)
      .eq('is_cancelled', false)
      .eq('is_optional', false)
      .ilike('voucher_type_name', '%receipt%')
      .gte('date', dateStr);
      
    const collected = (receipts || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    
    // Target collection can be overdue receivables
    const { data: overdueBills } = await supabase
      .from('outstanding_bills')
      .select('pending_amount')
      .eq('company_name', decodedName)
      .eq('party_group', 'receivable');
    const target = (overdueBills || []).reduce((sum, b) => sum + (Number(b.pending_amount) || 0), 0);
    
    // DSO calculation: (receivables / total credit sales) * 365
    const { data: sales } = await supabase
      .from('vouchers')
      .select('amount')
      .eq('company_id', comp.id)
      .eq('is_deleted', false)
      .eq('is_cancelled', false)
      .eq('is_optional', false)
      .ilike('voucher_type_name', '%sale%');
    const totalSales = (sales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const dso = totalSales > 0 ? Math.round((target / totalSales) * 365) : 30;
    
    return NextResponse.json({ dso, target, collected });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
