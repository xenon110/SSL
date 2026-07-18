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
    if (!comp) return NextResponse.json({ cgst_payable: 0, sgst_payable: 0, igst_payable: 0, itc_available: 0, net_liability: 0 });
    
    // Query ledgers for duties and taxes
    const { data: taxLedgers } = await supabase
      .from('ledgers')
      .select('name, closing_balance, parent_group')
      .eq('company_id', comp.id)
      .or('name.ilike.%cgst%,name.ilike.%sgst%,name.ilike.%igst%,parent_group.ilike.%duties%');
        
      let cgst_payable = 0, sgst_payable = 0, igst_payable = 0, itc_available = 0;
      
      (taxLedgers || []).forEach((l: any) => {
        const bal = Number(l.closing_balance) || 0;
        const name = l.name.toLowerCase();
        if (name.includes('cgst')) {
          if (bal < 0) cgst_payable += Math.abs(bal);
          else itc_available += bal;
        } else if (name.includes('sgst') || name.includes('utgst')) {
          if (bal < 0) sgst_payable += Math.abs(bal);
          else itc_available += bal;
        } else if (name.includes('igst')) {
          if (bal < 0) igst_payable += Math.abs(bal);
          else itc_available += bal;
        } else {
          if (bal < 0) igst_payable += Math.abs(bal);
        }
      });
      
      const totalPayable = cgst_payable + sgst_payable + igst_payable;
      const net_liability = Math.max(0, totalPayable - itc_available);
      
      return NextResponse.json({ cgst_payable, sgst_payable, igst_payable, itc_available, net_liability });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
