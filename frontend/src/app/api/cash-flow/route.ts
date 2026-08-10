import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

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
    
    let companyIds: string[] = [];
    let decodedName = decodeURIComponent(activeCompany);
    
    // Extract base name to match split companies (e.g., "Company - (from 1-Apr-24)")
    const baseNameMatch = decodedName.match(/^(.*?)\s*-\s*\(from/);
    const baseName = baseNameMatch ? baseNameMatch[1].trim() : decodedName;

    const { data: relatedComps } = await supabase.from('companies').select('id').ilike('name', `${baseName}%`);
    if (relatedComps && relatedComps.length > 0) {
      companyIds = relatedComps.map(c => c.id);
    } else {
      const { data: fallback } = await supabase.from('companies').select('id').ilike('name', 'SMRIDHI SPONGE LIMITED%');
      if (fallback && fallback.length > 0) {
        companyIds = fallback.map(c => c.id);
      } else {
        return NextResponse.json(getEmptyCashFlowState());
      }
    }

    // Fetch all ledgers to identify liquidity accounts
    const { data: liquidityLedgers, error: ledgerError } = await supabase
      .from('ledgers')
      .select('name, parent_group, closing_balance')
      .in('company_id', companyIds)
      .in('parent_group', ['Bank Accounts', 'Cash-in-Hand', 'Bank OD A/c', 'Bank OCC A/c']);
    
    if (ledgerError) throw ledgerError;

    const liquiditySet = new Set((liquidityLedgers || []).map(l => l.name));

    // Fetch all vouchers to scan for cash flow (without nested joins)
    let query = supabase
      .from('vouchers')
      .select('id, date, voucher_number, tally_guid, party_ledger_name, voucher_type_name, amount, is_cancelled, is_deleted')
      .in('company_id', companyIds)
      .eq('is_deleted', false)
      .eq('is_cancelled', false)
      .eq('is_optional', false);

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: vouchers, error } = await fetchAllData(query);
    if (error) throw error;
    
    const isAdjusted = searchParams.get('adjusted') === 'true';
    let activeVouchers = vouchers || [];

    // --- Overlay Manual Adjustments (if requested) ---
    if (isAdjusted && activeVouchers.length > 0) {
      const { data: adjustments, error: adjErr } = await supabase
        .from('manual_adjustments')
        .select('*')
        .eq('state', 'approved')
        .eq('entity_type', 'voucher');
        
      if (!adjErr && adjustments && adjustments.length > 0) {
        const adjMap = new Map();
        adjustments.forEach(adj => {
          if (!adjMap.has(adj.entity_id)) adjMap.set(adj.entity_id, {});
          adjMap.get(adj.entity_id)[adj.field_name] = adj.new_value;
        });

        activeVouchers = activeVouchers.map((v: any) => {
          const overrides = adjMap.get(v.tally_guid);
          if (overrides) {
            return {
              ...v,
              amount: overrides.amount !== undefined ? Number(overrides.amount) : v.amount,
              is_cancelled: overrides.is_cancelled !== undefined ? (overrides.is_cancelled === 'true') : v.is_cancelled,
              is_deleted: overrides.is_deleted !== undefined ? (overrides.is_deleted === 'true') : v.is_deleted,
            };
          }
          return v;
        });
      }
    }

    // Fetch outstanding bills for forecasting
    let outQuery = supabase
      .from('outstanding_bills')
      .select('pending_amount, due_date, party_ledger, company_name')
      .eq('company_name', decodedName)
      .gt('pending_amount', 0);
      
    if (endDate) {
      outQuery = outQuery.lte('bill_date', endDate);
    }
       
    const { data: outstandings, error: outErr } = await outQuery;
    if (outErr) throw outErr;

    let totalInflow = 0;
    let totalOutflow = 0;
    
    const timeBuckets: Record<string, { label: string, sortKey: number, inflow: number, outflow: number }> = {};
    const sourcesMap: Record<string, { name: string, amount: number, count: number }> = {};
    const usesMap: Record<string, { name: string, amount: number, count: number }> = {};
    const detailedTransactions: any[] = [];

    if (activeVouchers.length === 0) {
      return NextResponse.json(getEmptyCashFlowState());
    }

    // Find which vouchers actually involve cash flow
    const { data: liqLedgers, error: liqErr } = await fetchAllData(
        supabase.from('voucher_ledgers')
                .select('voucher_id')
                .in('ledger_name', Array.from(liquiditySet))
    );
    if (liqErr) throw liqErr;

    const liqVoucherIds = new Set((liqLedgers || []).map(l => l.voucher_id));
    
    // Fetch related ledgers and inventory independently in chunks to avoid URI Too Large errors
    const activeVoucherIds = activeVouchers.map(v => v.id).filter(id => liqVoucherIds.has(id));
    const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const idChunks = chunkArray(activeVoucherIds, 150);

    const allLedgers: any[] = [];
    const allInv: any[] = [];

    for (const chunk of idChunks) {
        const { data: lData, error: lErr } = await fetchAllData(supabase.from('voucher_ledgers').select('voucher_id, ledger_name, amount, is_debit').in('voucher_id', chunk));
        if (lErr) throw lErr;
        allLedgers.push(...(lData || []));

        const { data: iData, error: iErr } = await fetchAllData(supabase.from('voucher_inventory').select('voucher_id, stock_item_name, billed_qty, rate, amount').in('voucher_id', chunk));
        if (iErr) throw iErr;
        allInv.push(...(iData || []));
    }

    // Group ledgers and inventory by voucher_id
    const ledgerMap = new Map();
    const invMap = new Map();

    (allLedgers || []).forEach(l => {
       if (!ledgerMap.has(l.voucher_id)) ledgerMap.set(l.voucher_id, []);
       ledgerMap.get(l.voucher_id).push(l);
    });

    (allInv || []).forEach(i => {
       if (!invMap.has(i.voucher_id)) invMap.set(i.voucher_id, []);
       invMap.get(i.voucher_id).push(i);
    });

    for (const v of activeVouchers) {
      // Attach mapped children
      v.voucher_ledgers = ledgerMap.get(v.id) || [];
      v.voucher_inventory = invMap.get(v.id) || [];

      // Analyze liquidity movement in this voucher
      let liqIn = 0; // Debits to Cash/Bank
      let liqOut = 0; // Credits to Cash/Bank
      
      const nonLiqCredits: any[] = [];
      const nonLiqDebits: any[] = [];

      (v.voucher_ledgers || []).forEach((l: any) => {
        const amt = Number(l.amount) || 0;
        if (liquiditySet.has(l.ledger_name)) {
          if (l.is_debit) liqIn += amt;
          else liqOut += amt;
        } else {
          if (l.is_debit) nonLiqDebits.push(l);
          else nonLiqCredits.push(l);
        }
      });

      if (liqIn === 0 && liqOut === 0) continue; // Not a cash flow transaction

      const netLiq = liqIn - liqOut;
      if (netLiq === 0) continue; // Contra entry netting to 0

      const bucket = getTimeBucket(v.date, startDate, endDate);
      if (!timeBuckets[bucket.label]) timeBuckets[bucket.label] = { label: bucket.label, sortKey: bucket.sortKey, inflow: 0, outflow: 0 };

      // Helper to build detailed transaction payload
      const buildDetail = (type: 'INFLOW' | 'OUTFLOW', ledgerName: string, amount: number) => ({
         id: v.voucher_number || v.tally_guid.substring(0,8),
         date: v.date,
         type,
         ledger: ledgerName,
         amount,
         voucherType: v.voucher_type_name,
         items: (v.voucher_inventory || []).map((inv: any) => ({
           product: inv.stock_item_name || "Unknown",
           qty: inv.billed_qty || 0,
           rate: inv.rate || 0,
           amount: inv.amount || 0
         })),
         ledgers: (v.voucher_ledgers || []).map((l: any) => ({
           name: l.ledger_name,
           amount: Number(l.amount),
           is_debit: l.is_debit
         }))
      });

      if (netLiq > 0) {
        // Net Inflow! Sources are the non-liquidity credits.
        totalInflow += netLiq;
        timeBuckets[bucket.label].inflow += netLiq;
        
        let remaining = netLiq;
        if (nonLiqCredits.length > 0) {
           nonLiqCredits.forEach(c => {
             const amt = Math.min(Number(c.amount) || 0, remaining);
             if (amt <= 0) return;
             remaining -= amt;
             if (!sourcesMap[c.ledger_name]) sourcesMap[c.ledger_name] = { name: c.ledger_name, amount: 0, count: 0 };
             sourcesMap[c.ledger_name].amount += amt;
             sourcesMap[c.ledger_name].count += 1;
             detailedTransactions.push(buildDetail('INFLOW', c.ledger_name, amt));
           });
        } else {
           // Fallback if no non-liquidity credits (rare anomaly)
           const fallbackSource = v.party_ledger_name || 'Unknown Source';
           if (!sourcesMap[fallbackSource]) sourcesMap[fallbackSource] = { name: fallbackSource, amount: 0, count: 0 };
           sourcesMap[fallbackSource].amount += netLiq;
           sourcesMap[fallbackSource].count += 1;
           detailedTransactions.push(buildDetail('INFLOW', fallbackSource, netLiq));
        }
      } else {
        // Net Outflow! Uses are the non-liquidity debits.
        const outAmt = Math.abs(netLiq);
        totalOutflow += outAmt;
        timeBuckets[bucket.label].outflow += outAmt;

        let remaining = outAmt;
        if (nonLiqDebits.length > 0) {
           nonLiqDebits.forEach(d => {
             const amt = Math.min(Number(d.amount) || 0, remaining);
             if (amt <= 0) return;
             remaining -= amt;
             if (!usesMap[d.ledger_name]) usesMap[d.ledger_name] = { name: d.ledger_name, amount: 0, count: 0 };
             usesMap[d.ledger_name].amount += amt;
             usesMap[d.ledger_name].count += 1;
             detailedTransactions.push(buildDetail('OUTFLOW', d.ledger_name, amt));
           });
        } else {
           const fallbackUse = v.party_ledger_name || 'Unknown Use';
           if (!usesMap[fallbackUse]) usesMap[fallbackUse] = { name: fallbackUse, amount: 0, count: 0 };
           usesMap[fallbackUse].amount += outAmt;
           usesMap[fallbackUse].count += 1;
           detailedTransactions.push(buildDetail('OUTFLOW', fallbackUse, outAmt));
        }
      }
    }

    const trendData = Object.values(timeBuckets)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(t => ({
        name: t.label,
        inflow: t.inflow,
        outflow: t.outflow,
        netFlow: t.inflow - t.outflow
      }));
      
    const topSources = Object.values(sourcesMap).sort((a, b) => b.amount - a.amount);
    const topUses = Object.values(usesMap).sort((a, b) => b.amount - a.amount);

    let totalBankBalance = 0;
    let totalCashBalance = 0;
    
    const liquidityAccounts = (liquidityLedgers || []).map((l: any) => {
      const bal = Number(l.closing_balance) || 0;
      if (l.parent_group === 'Bank Accounts' || l.parent_group === 'Bank OD A/c' || l.parent_group === 'Bank OCC A/c') totalBankBalance += bal;
      if (l.parent_group === 'Cash-in-Hand') totalCashBalance += bal;
      return { ...l, closing_balance: bal };
    }).sort((a, b) => Math.abs(b.closing_balance) - Math.abs(a.closing_balance));

    // Fetch ledgers for outstandings classification
    const { data: allLedgerDefs, error: allLedgersErr } = await fetchAllData(supabase.from('ledgers').select('name, parent_group').in('company_id', companyIds));
    if (allLedgersErr) throw allLedgersErr;
    const ledgerGroupMap = new Map((allLedgerDefs || []).map(l => [l.name, l.parent_group]));

    // Calculate 30-Day Forecast
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

      outstandings?.forEach(bill => {
         if (!bill.due_date) return;
         const billDate = new Date(bill.due_date);
         billDate.setHours(0,0,0,0);
         
         // If due date is before today, we count it as incoming/outgoing TODAY (i=0) because it's overdue
         if ((i === 0 && billDate <= targetDate) || (i > 0 && billDate.getTime() === targetDate.getTime())) {
            const group = ledgerGroupMap.get(bill.party_ledger);
            if (group === 'Sundry Debtors') incoming += Number(bill.pending_amount) || 0;
            else if (group === 'Sundry Creditors') outgoing += Number(bill.pending_amount) || 0;
         }
      });

      projectedBalance += incoming - outgoing;

      forecastData.push({
        date: targetDate.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        fullDate: dateStr,
        incoming,
        outgoing,
        balance: projectedBalance
      });
    }

    let minDate: string | null = null;
    let maxDate: string | null = null;
    vouchers?.forEach(v => {
      if (v.date) {
        if (!minDate || v.date < minDate) minDate = v.date;
        if (!maxDate || v.date > maxDate) maxDate = v.date;
      }
    });

    return NextResponse.json({
      kpis: {
        totalInflow,
        totalOutflow,
        netFlow: totalInflow - totalOutflow,
        transactionCount: detailedTransactions.length,
        totalBankBalance,
        totalCashBalance
      },
      trendData,
      forecastData,
      topSources,
      topUses,
      detailedTransactions,
      liquidityAccounts,
      dateBounds: { minDate, maxDate }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed: ' + (error?.message || String(error)) }, { status: 500 });
  }
}

export const runtime = 'edge';
