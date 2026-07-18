import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    const decodedName = decodeURIComponent(activeCompany);
    
    const { data: bills } = await supabase
      .from('outstanding_bills')
      .select('pending_amount, due_date')
      .eq('company_name', decodedName)
      .eq('party_group', 'payable');
      
    const today = new Date();
    today.setHours(0,0,0,0);
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    let week1 = 0, week2 = 0, week3 = 0, week4 = 0;
    
    (bills || []).forEach(b => {
      const amt = Number(b.pending_amount) || 0;
      if (!b.due_date) {
        week1 += amt;
        return;
      }
      const dueDate = new Date(b.due_date);
      dueDate.setHours(0,0,0,0);
      
      const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / oneDayMs);
      if (diffDays <= 7) week1 += amt;
      else if (diffDays <= 14) week2 += amt;
      else if (diffDays <= 21) week3 += amt;
      else week4 += amt;
    });
    
    return NextResponse.json({ week1, week2, week3, week4 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
