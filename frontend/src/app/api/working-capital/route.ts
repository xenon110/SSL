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
    
    // 1. Fetch receivables total
    const { data: recBills } = await supabase
      .from('outstanding_bills')
      .select('pending_amount')
      .eq('company_name', decodedName)
      .eq('party_group', 'receivable');
    const totalReceivables = (recBills || []).reduce((sum, b) => sum + (Number(b.pending_amount) || 0), 0);
    
    // 2. Fetch payables total
    const { data: payBills } = await supabase
      .from('outstanding_bills')
      .select('pending_amount')
      .eq('company_name', decodedName)
      .eq('party_group', 'payable');
    const totalPayables = (payBills || []).reduce((sum, b) => sum + (Number(b.pending_amount) || 0), 0);
    
    // 3. Fetch cash/bank balances
    const { data: liqLedgers } = await supabase
      .from('ledgers')
      .select('closing_balance')
      .eq('company_id', comp.id)
      .in('parent_group', ['Bank Accounts', 'Cash-in-Hand', 'Bank OD A/c', 'Bank OCC A/c']);
    const totalCashBank = (liqLedgers || []).reduce((sum, l) => sum + (Number(l.closing_balance) || 0), 0);
    
    // 4. Fetch inventory balance
    const { data: stockItems } = await supabase
      .from('stock_items')
      .select('closing_balance_value')
      .eq('company_id', comp.id);
    const totalInventoryValue = (stockItems || []).reduce((sum, s) => sum + (Number(s.closing_balance_value) || 0), 0);
    
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
