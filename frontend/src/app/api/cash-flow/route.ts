import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getTimeBucket(dateString: string, startDateStr: string | null, endDateStr: string | null) {
  const d = new Date(dateString);
  let bucketType = 'monthly';
  
  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const diffDays = (end - start) / (1000 * 3600 * 24);
    
    if (diffDays <= 31) bucketType = 'daily';
    else if (diffDays <= 90) bucketType = 'weekly';
    else if (diffDays <= 366) bucketType = 'monthly';
    else bucketType = 'yearly';
  }

  const y = d.getFullYear();
  const m = d.getMonth();
  
  if (bucketType === 'daily') {
    return { label: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }), sortKey: d.getTime() };
  } else if (bucketType === 'weekly') {
    const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    return { label: `Wk of ${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`, sortKey: weekStart.getTime() };
  } else if (bucketType === 'yearly') {
    return { label: y.toString(), sortKey: new Date(y, 0, 1).getTime() };
  } else {
    return { label: d.toLocaleDateString('default', { month: 'short', year: '2-digit' }), sortKey: new Date(y, m, 1).getTime() };
  }
}

const getEmptyCashFlowState = () => ({
  kpis: { totalInflow: 0, totalOutflow: 0, netFlow: 0, transactionCount: 0, totalBankBalance: 0, totalCashBalance: 0 },
  trendData: [], forecastData: [], topSources: [], topUses: [], detailedTransactions: [], liquidityAccounts: []
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    
    const decodedName = decodeURIComponent(activeCompany);
    const baseNameMatch = decodedName.match(/^(.*?)\s*-\s*\(from/);
    const baseName = baseNameMatch ? baseNameMatch[1].trim() : decodedName;

    const { data: compList } = await supabase.from('companies').select('id').ilike('name', `${baseName}%`);
    const compIds = compList ? compList.map(c => c.id) : [];
    
    if (compIds.length === 0) return NextResponse.json(getEmptyCashFlowState());

    let summaryQuery = supabase.from('mv_cash_flow_summary').select('*').in('company_id', compIds);
    if (startDate) summaryQuery = summaryQuery.gte('date', startDate);
    if (endDate) summaryQuery = summaryQuery.lte('date', endDate);

    const [
      { data: flowSummary },
      { data: flowSourcesUses },
      { data: liquidityLedgers },
      { data: outstandings }
    ] = await Promise.all([
      fetchAllData(summaryQuery),
      fetchAllData(supabase.from('mv_cash_flow_sources_uses').select('*').in('company_id', compIds)),
      fetchAllData(supabase.from('ledgers').select('name, parent_group, closing_balance').in('company_id', compIds).in('parent_group', ['Bank Accounts', 'Cash-in-Hand', 'Bank OD A/c', 'Bank OCC A/c'])),
      fetchAllData(supabase.from('outstanding_bills').select('pending_amount, due_date, party_ledger, party_group').eq('company_name', decodedName).gt('pending_amount', 0))
    ]);

    let totalInflow = 0;
    let totalOutflow = 0;
    const timeBuckets: Record<string, { label: string, sortKey: number, inflow: number, outflow: number }> = {};
    
    let minDate: string | null = null;
    let maxDate: string | null = null;

    (flowSummary || []).forEach((row: any) => {
        const inAmt = Number(row.total_inflow) || 0;
        const outAmt = Number(row.total_outflow) || 0;
        
        totalInflow += inAmt;
        totalOutflow += outAmt;

        if (!minDate || row.date < minDate) minDate = row.date;
        if (!maxDate || row.date > maxDate) maxDate = row.date;

        const bucket = getTimeBucket(row.date, startDate, endDate);
        if (!timeBuckets[bucket.label]) {
            timeBuckets[bucket.label] = { label: bucket.label, sortKey: bucket.sortKey, inflow: 0, outflow: 0 };
        }
        timeBuckets[bucket.label].inflow += inAmt;
        timeBuckets[bucket.label].outflow += outAmt;
    });

    const trendData = Object.values(timeBuckets).sort((a, b) => a.sortKey - b.sortKey).map(t => ({
        name: t.label, inflow: t.inflow, outflow: t.outflow, netFlow: t.inflow - t.outflow
    }));

    const topSources: any[] = [];
    const topUses: any[] = [];
    
    (flowSourcesUses || []).forEach((row: any) => {
        if (row.flow_type === 'INFLOW') topSources.push({ name: row.ledger_name, amount: Number(row.amount) });
        else topUses.push({ name: row.ledger_name, amount: Number(row.amount) });
    });

    topSources.sort((a, b) => b.amount - a.amount);
    topUses.sort((a, b) => b.amount - a.amount);

    let totalBankBalance = 0;
    let totalCashBalance = 0;
    const liquidityAccounts = (liquidityLedgers || []).map((l: any) => {
      const bal = Number(l.closing_balance) || 0;
      if (l.parent_group === 'Bank Accounts' || l.parent_group === 'Bank OD A/c' || l.parent_group === 'Bank OCC A/c') totalBankBalance += bal;
      if (l.parent_group === 'Cash-in-Hand') totalCashBalance += bal;
      return { ...l, closing_balance: bal };
    }).sort((a, b) => Math.abs(b.closing_balance) - Math.abs(a.closing_balance));

    // 30-Day Forecast
    const forecastDays = 30;
    const forecastData = [];
    let projectedBalance = totalBankBalance + totalCashBalance;
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < forecastDays; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      let incoming = 0;
      let outgoing = 0;

      (outstandings || []).forEach((bill: any) => {
         if (!bill.due_date) return;
         const billDate = new Date(bill.due_date);
         billDate.setHours(0,0,0,0);
         
         if ((i === 0 && billDate <= targetDate) || (i > 0 && billDate.getTime() === targetDate.getTime())) {
            if (bill.party_group === 'receivable') incoming += Number(bill.pending_amount) || 0;
            else if (bill.party_group === 'payable') outgoing += Number(bill.pending_amount) || 0;
         }
      });

      projectedBalance += incoming - outgoing;
      forecastData.push({
        date: targetDate.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        fullDate: dateStr,
        incoming, outgoing, balance: projectedBalance
      });
    }

    return NextResponse.json({
      kpis: {
        totalInflow, totalOutflow, netFlow: totalInflow - totalOutflow,
        transactionCount: 0, // Handled in MV directly now
        totalBankBalance, totalCashBalance
      },
      trendData, forecastData, topSources, topUses,
      detailedTransactions: [], // Omitted for performance
      liquidityAccounts, dateBounds: { minDate, maxDate }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed: ' + (error?.message || String(error)) }, { status: 500 });
  }
}

