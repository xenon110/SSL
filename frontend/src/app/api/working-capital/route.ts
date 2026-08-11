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
    if (!comp) return NextResponse.json({ currentAssets: 0, currentLiabilities: 0, currentRatio: 0 });
    
    const [
      { data: outstanding },
      { data: liqLedgers },
      { data: inventory }
    ] = await Promise.all([
      supabase.from('mv_outstanding_summary').select('*').eq('company_name', decodedName),
      supabase.from('ledgers').select('closing_balance').eq('company_id', comp.id).in('parent_group', ['Bank Accounts', 'Cash-in-Hand', 'Bank OD A/c', 'Bank OCC A/c']),
      supabase.from('mv_inventory_valuation').select('*').eq('company_id', comp.id)
    ]);

    let totalReceivables = 0;
    let totalPayables = 0;
    (outstanding || []).forEach((row: any) => {
        if (row.party_group === 'receivable') totalReceivables += Number(row.total_pending) || 0;
        if (row.party_group === 'payable') totalPayables += Number(row.total_pending) || 0;
    });
    
    const totalCashBank = (liqLedgers || []).reduce((sum, l) => sum + (Number(l.closing_balance) || 0), 0);
    const totalInventoryValue = (inventory || []).reduce((sum, s) => sum + (Number(s.total_value) || 0), 0);
    
    const currentAssets = totalReceivables + totalCashBank + totalInventoryValue;
    const currentLiabilities = totalPayables;
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    
    return NextResponse.json({
      currentAssets,
      currentLiabilities,
      currentRatio
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = 'edge';
