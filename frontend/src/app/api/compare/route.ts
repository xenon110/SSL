import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const FACTORS = ['K1','K2','K3','K4','K5','K6','K7','K8','K9','K10','K11','K12','K13','K14','K15','K16','K17','K18','K19','K20','K21','K22','K23','K24','K25','K26','K27'];

const getEmptyPeriodStats = (days: number) => {
  const stats: any = {};
  FACTORS.forEach(k => stats[k] = 0);
  return { stats, drivers: { topSalesProd: [], topSalesCust: [], topExpenses: [] }, days, trend: Array(days).fill(0) };
};

const getEmptyCompareState = (daysA: number, daysB: number) => {
  const deltas: any = {};
  FACTORS.forEach(k => deltas[k] = { abs: 0, perc: 0 });
  return { periodA: getEmptyPeriodStats(daysA), periodB: getEmptyPeriodStats(daysB), deltas, insights: [] };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aStart = searchParams.get('aStart');
    const aEnd = searchParams.get('aEnd');
    const bStart = searchParams.get('bStart');
    const bEnd = searchParams.get('bEnd');
    
    if (!aStart || !aEnd || !bStart || !bEnd) {
      return NextResponse.json({ error: 'Missing period boundaries' }, { status: 400 });
    }

    const ts_aStart = new Date(aStart).getTime();
    const ts_aEnd = new Date(aEnd).getTime();
    const ts_bStart = new Date(bStart).getTime();
    const ts_bEnd = new Date(bEnd).getTime();

    const daysA = Math.max(1, Math.round((ts_aEnd - ts_aStart) / (1000 * 3600 * 24)) + 1);
    const daysB = Math.max(1, Math.round((ts_bEnd - ts_bStart) / (1000 * 3600 * 24)) + 1);

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    const decodedName = decodeURIComponent(activeCompany);
    
    let companyId = 'a98b4f9e-ff1c-454e-a38c-c5db9a62c454';
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (comp) companyId = comp.id;

    // Fetch from Materialized Views concurrently
    const [
      { data: salesData },
      { data: incExpData },
      { data: cfData },
      { data: outstandings },
      { data: inventory },
      { data: ledgers }
    ] = await Promise.all([
      fetchAllData(supabase.from('mv_daily_sales').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('mv_income_expense').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('mv_cash_flow_summary').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('mv_outstanding_summary').select('*').eq('company_name', decodedName)),
      fetchAllData(supabase.from('mv_inventory_valuation').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('ledgers').select('name, parent_group, closing_balance').eq('company_id', companyId))
    ]);

    const ledgerGroupMap = new Map();
    (ledgers || []).forEach((l: any) => ledgerGroupMap.set(l.name, l.parent_group));
    const directIncomes = ['Sales Accounts', 'Direct Incomes', 'Sales - Sponge Iron'];
    const directExpenses = ['Purchase Accounts', 'Direct Expenses', 'Purchase Under GST Law'];

    // Shared global balances
    let totalCashBank = 0;
    (ledgers || []).forEach((l: any) => {
        if (['Bank Accounts', 'Cash-in-Hand', 'Bank OD A/c', 'Bank OCC A/c'].includes(l.parent_group)) {
            totalCashBank += Number(l.closing_balance) || 0;
        }
    });
    
    const totalInventoryValue = (inventory || []).reduce((sum, s) => sum + (Number(s.total_value) || 0), 0);
    
    let totalAR = 0;
    let totalAP = 0;
    (outstandings || []).forEach((o: any) => {
        if (o.party_group === 'receivable') totalAR += Number(o.total_pending) || 0;
        if (o.party_group === 'payable') totalAP += Number(o.total_pending) || 0;
    });

    const computePeriod = (startTs: number, endTs: number, days: number) => {
        const stats = getEmptyPeriodStats(days).stats;
        stats.K18 = totalCashBank;
        stats.K19 = totalInventoryValue;
        stats.K23 = totalAR;
        stats.K24 = totalAP;

        const trend = Array.from({ length: days }).map(() => 0);
        
        (salesData || []).forEach((row: any) => {
            const rowTs = new Date(row.date).getTime();
            if (rowTs >= startTs && rowTs <= endTs) {
                stats.K1 += Number(row.total_sales) || 0;
                const dayIdx = Math.floor((rowTs - startTs) / (1000 * 3600 * 24));
                if (dayIdx >= 0 && dayIdx < days) trend[dayIdx] += Number(row.total_sales) || 0;
            }
        });

        (cfData || []).forEach((row: any) => {
            const rowTs = new Date(row.date).getTime();
            if (rowTs >= startTs && rowTs <= endTs) {
                stats.K16 += Number(row.total_inflow) || 0;
                stats.K17 += Number(row.total_outflow) || 0;
            }
        });

        (incExpData || []).forEach((row: any) => {
            // Because income expense is monthly, we check if the month overlaps
            const rowDate = new Date(row.tx_month);
            const rowYearMonth = rowDate.getFullYear() * 100 + rowDate.getMonth();
            
            const startD = new Date(startTs);
            const endD = new Date(endTs);
            
            // Check if row month is within the start/end month boundaries
            if (rowYearMonth >= (startD.getFullYear() * 100 + startD.getMonth()) && 
                rowYearMonth <= (endD.getFullYear() * 100 + endD.getMonth())) {
                
                const amt = Number(row.net_amount) || 0;
                const grp = ledgerGroupMap.get(row.ledger_name) || '';

                if (row.tx_type === 'INCOME') {
                    if (directIncomes.includes(grp)) stats.K8 += amt; // Assuming sales are already in K1, this is just Direct Incomes
                    else stats.K9 += amt; // Indirect Incomes
                } else if (row.tx_type === 'EXPENSE') {
                    if (directExpenses.includes(grp)) stats.K10 += amt;
                    else stats.K11 += amt; // Indirect Expenses
                }
            }
        });

        stats.K3 = stats.K1 - stats.K2; // Net Sales
        stats.K13 = stats.K3 - stats.K10; // Gross Profit
        stats.K15 = stats.K13 + stats.K9 - stats.K11; // Net Profit

        return { stats, drivers: { topSalesProd: [], topSalesCust: [], topExpenses: [] }, days, trend };
    };

    const periodA = computePeriod(ts_aStart, ts_aEnd, daysA);
    const periodB = computePeriod(ts_bStart, ts_bEnd, daysB);

    const deltas: Record<string, { abs: number, perc: number }> = {};
    FACTORS.forEach(k => {
      const a = (periodA.stats as any)[k] || 0;
      const b = (periodB.stats as any)[k] || 0;
      const abs = a - b;
      const perc = b === 0 ? (a === 0 ? 0 : 100) : (abs / Math.abs(b)) * 100;
      deltas[k] = { abs, perc };
    });

    const insights: any[] = [];
    if (Math.abs(deltas.K3.perc) > 10) {
      insights.push({
        metric: 'Net Sales',
        rule: 'Changed by > 10%',
        description: `Net Sales moved from ₹${periodB.stats.K3.toFixed(0)} to ₹${periodA.stats.K3.toFixed(0)} (${deltas.K3.perc > 0 ? '+' : ''}${deltas.K3.perc.toFixed(1)}%).`,
        type: deltas.K3.perc > 0 ? 'positive' : 'negative'
      });
    }

    if (periodA.stats.K17 > 0 && periodB.stats.K17 > 0) {
      if (deltas.K17.perc > deltas.K16.perc + 5) {
        insights.push({
          metric: 'Liquidity Caution',
          rule: 'Cash outflow grew faster than inflow',
          description: `Cash outflow grew by ${deltas.K17.perc.toFixed(1)}% while inflow only changed by ${deltas.K16.perc.toFixed(1)}%.`,
          type: 'warning'
        });
      }
    }

    return NextResponse.json({
      periodA,
      periodB,
      deltas,
      insights
    });

  } catch (error: any) {
    console.error('Compare API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
