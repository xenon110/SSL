import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    const decodedName = decodeURIComponent(activeCompany);
    
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (!comp) return NextResponse.json({ totalBankBalance: 0, bankBalances: [] });
    
    const { data: bankLedgers, error } = await fetchAllData(
      supabase.from('ledgers')
        .select('name, closing_balance')
        .eq('company_id', comp.id)
        .in('parent_group', ['Bank Accounts', 'Bank OD A/c', 'Bank OCC A/c'])
    );
      
    if (error) throw error;
    
    const bankBalances = (bankLedgers || []).map((l: any) => ({
      ledger_name: l.name,
      amount: Number(l.closing_balance) || 0
    }));
    
    const totalBankBalance = bankBalances.reduce((sum, b) => sum + b.amount, 0);
    
    return NextResponse.json({
      totalBankBalance,
      bankBalances
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
