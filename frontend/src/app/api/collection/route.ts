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
    if (!comp) return NextResponse.json({ dso: 0, target: 0, collected: 0 });
    
    // Compute collected from mv_cash_flow_summary for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data: cfData } = await fetchAllData(
        supabase.from('mv_cash_flow_summary')
            .select('total_inflow')
            .eq('company_id', comp.id)
            .gte('date', dateStr)
    );
      
    let collected = 0;
    (cfData || []).forEach((row: any) => {
        collected += Number(row.total_inflow) || 0;
    });

    const target = collected * 1.2; // 20% higher than last 30 days as a dynamic target
    
    // DSO Calculation
    const { data: outstandings } = await fetchAllData(
        supabase.from('mv_party_outstandings')
            .select('total_pending')
            .eq('company_name', decodedName)
            .eq('party_group', 'receivable')
    );
      
    let totalReceivables = 0;
    (outstandings || []).forEach((o: any) => totalReceivables += (Number(o.total_pending) || 0));

    // Fetch total sales from mv_daily_sales for the last 365 days to calculate DSO
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const yearAgoStr = oneYearAgo.toISOString().split('T')[0];

    const { data: salesData } = await fetchAllData(
        supabase.from('mv_daily_sales')
            .select('total_sales')
            .eq('company_id', comp.id)
            .gte('date', yearAgoStr)
    );

    let totalAnnualSales = 0;
    (salesData || []).forEach((s: any) => totalAnnualSales += (Number(s.total_sales) || 0));

    const dso = totalAnnualSales > 0 ? (totalReceivables / totalAnnualSales) * 365 : 0;
    
    return NextResponse.json({
      dso: Math.round(dso),
      target,
      collected
    });
  } catch (error: any) {
    console.error('Collection API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const runtime = 'edge';
