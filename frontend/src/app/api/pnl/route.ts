import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 1. Fetch all groups to resolve hierarchy
    const { data: groups, error: groupsError } = await supabase.from('groups').select('name, parent');
    if (groupsError) throw groupsError;

    // 2. Fetch all ledgers to classify them
    const { data: ledgers, error: ledgersError } = await supabase.from('ledgers').select('name, parent_group, state');
    if (ledgersError) throw ledgersError;

    const ledgerStateMap = new Map<string, string>();

    // Resolve Root Group for a given group name
    const groupMap = new Map(groups.map(g => [g.name, g.parent]));
    const getRootPnlGroup = (groupName: string): 'Direct Incomes' | 'Indirect Incomes' | 'Direct Expenses' | 'Indirect Expenses' | null => {
      let current = groupName;
      let depth = 0;
      while (current && depth < 20) {
        if (current === 'Sales Accounts' || current === 'Direct Incomes') return 'Direct Incomes';
        if (current === 'Indirect Incomes') return 'Indirect Incomes';
        if (current === 'Purchase Accounts' || current === 'Direct Expenses') return 'Direct Expenses';
        if (current === 'Indirect Expenses') return 'Indirect Expenses';
        current = groupMap.get(current) || '';
        depth++;
      }
      return null;
    };

    const pnlLedgers = new Map<string, { type: string, rootGroup: string }>();
    ledgers.forEach(l => {
      if (l.state) ledgerStateMap.set(l.name, l.state);
      const root = getRootPnlGroup(l.parent_group);
      if (root) {
        pnlLedgers.set(l.name, {
           type: root.includes('Income') ? 'INCOME' : 'EXPENSE',
           rootGroup: root
        });
      }
    });

    // 3. Fetch vouchers that contain P&L ledgers
    let query = supabase
      .from('vouchers')
      .select('*, voucher_ledgers(*), voucher_inventory(*)');

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: vouchers, error } = await query;
    if (error) throw error;

    let totalDirectIncome = 0;
    let totalIndirectIncome = 0;
    let totalDirectExpense = 0;
    let totalIndirectExpense = 0;

    const timeBuckets: Record<string, { label: string, sortKey: number, income: number, expense: number, gp: number, np: number, dIn: number, iIn: number, dEx: number, iEx: number }> = {};
    const ledgerAggregates: Record<string, { name: string, rootGroup: string, type: 'INCOME'|'EXPENSE', amount: number, count: number }> = {};
    const detailedTransactions: any[] = [];
    
    // Deep Insights
    const topProductsMap: Record<string, number> = {};
    const topCustomersMap: Record<string, number> = {};
    const topVendorsMap: Record<string, number> = {};
    const stateWiseMap: Record<string, number> = {};

    (vouchers || []).forEach(v => {
      const bucket = getTimeBucket(v.date, startDate, endDate);
      if (!timeBuckets[bucket.label]) {
        timeBuckets[bucket.label] = { label: bucket.label, sortKey: bucket.sortKey, income: 0, expense: 0, gp: 0, np: 0, dIn: 0, iIn: 0, dEx: 0, iEx: 0 };
      }

      const vType = (v.voucher_type_name || '').toLowerCase();
      const isSale = vType.includes('sale');
      const isPurchase = vType.includes('purchase');

      if (isSale && v.party_ledger_name) {
          const state = ledgerStateMap.get(v.party_ledger_name) || 'Unknown';
          const totalAmount = Number(v.amount) || 0;
          if (totalAmount > 0) {
              topCustomersMap[v.party_ledger_name] = (topCustomersMap[v.party_ledger_name] || 0) + totalAmount;
              stateWiseMap[state] = (stateWiseMap[state] || 0) + totalAmount;
          }
      }
      
      if (isPurchase && v.party_ledger_name) {
          const totalAmount = Number(v.amount) || 0;
          if (totalAmount > 0) {
              topVendorsMap[v.party_ledger_name] = (topVendorsMap[v.party_ledger_name] || 0) + totalAmount;
          }
      }

      (v.voucher_inventory || []).forEach((inv: any) => {
          if (!inv.is_inward) { // Sales
             const amt = Number(inv.amount) || 0;
             if (inv.stock_item_name && amt > 0) {
                topProductsMap[inv.stock_item_name] = (topProductsMap[inv.stock_item_name] || 0) + amt;
             }
          }
      });

      (v.voucher_ledgers || []).forEach((l: any) => {
        const ledgerInfo = pnlLedgers.get(l.ledger_name);
        if (!ledgerInfo) return; // Not a P&L ledger

        let amount = Number(l.amount) || 0;
        let effectiveAmount = 0;
        
        if (ledgerInfo.type === 'INCOME') {
           effectiveAmount = l.is_debit ? -amount : amount;
           if (ledgerInfo.rootGroup === 'Direct Incomes') {
               totalDirectIncome += effectiveAmount;
               timeBuckets[bucket.label].dIn += effectiveAmount;
           } else {
               totalIndirectIncome += effectiveAmount;
               timeBuckets[bucket.label].iIn += effectiveAmount;
           }
           timeBuckets[bucket.label].income += effectiveAmount;
        } else {
           effectiveAmount = l.is_debit ? amount : -amount;
           if (ledgerInfo.rootGroup === 'Direct Expenses') {
               totalDirectExpense += effectiveAmount;
               timeBuckets[bucket.label].dEx += effectiveAmount;
           } else {
               totalIndirectExpense += effectiveAmount;
               timeBuckets[bucket.label].iEx += effectiveAmount;
           }
           timeBuckets[bucket.label].expense += effectiveAmount;
        }

        if (!ledgerAggregates[l.ledger_name]) {
           ledgerAggregates[l.ledger_name] = { 
              name: l.ledger_name, 
              rootGroup: ledgerInfo.rootGroup,
              type: ledgerInfo.type as 'INCOME'|'EXPENSE',
              amount: 0, 
              count: 0 
           };
        }
        ledgerAggregates[l.ledger_name].amount += effectiveAmount;
        ledgerAggregates[l.ledger_name].count += 1;

        // Push to detailed transactions for deep drill-down
        detailedTransactions.push({
           id: v.voucher_number || v.tally_guid.substring(0,8),
           date: v.date,
           type: ledgerInfo.type,
           ledger: l.ledger_name,
           amount: effectiveAmount,
           voucherType: v.voucher_type_name,
           items: (v.voucher_inventory || []).map((inv: any) => ({
             product: inv.stock_item_name || "Unknown",
             qty: inv.billed_qty || 0,
             rate: inv.rate || 0,
             amount: inv.amount || 0
           })),
           ledgers: (v.voucher_ledgers || []).map((vl: any) => ({
             name: vl.ledger_name,
             amount: Number(vl.amount),
             is_debit: vl.is_debit
           }))
        });
      });
    });

    Object.values(timeBuckets).forEach(t => {
      t.gp = t.dIn - t.dEx;
      t.np = t.income - t.expense;
    });
    
    const finalLedgers = Object.values(ledgerAggregates).filter(l => l.amount !== 0);
    const topIncomes = finalLedgers.filter(l => l.type === 'INCOME').sort((a, b) => b.amount - a.amount);
    const topExpenses = finalLedgers.filter(l => l.type === 'EXPENSE').sort((a, b) => b.amount - a.amount);

    const grossProfit = totalDirectIncome - totalDirectExpense;
    const totalIncome = totalDirectIncome + totalIndirectIncome;
    const totalExpense = totalDirectExpense + totalIndirectExpense;
    const netProfit = totalIncome - totalExpense;

    const gpMargin = totalDirectIncome > 0 ? (grossProfit / totalDirectIncome) * 100 : 0;
    const npMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const formatInsights = (map: Record<string, number>, limit: number = 10) => {
        return Object.entries(map)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, limit);
    };

    const trendData = Object.values(timeBuckets).sort((a, b) => a.sortKey - b.sortKey);

    return NextResponse.json({
      kpis: {
        totalDirectIncome,
        totalIndirectIncome,
        totalDirectExpense,
        totalIndirectExpense,
        grossProfit,
        netProfit,
        totalIncome,
        totalExpense,
        gpMargin,
        npMargin,
        operatingMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
      },
      insights: {
        topProducts: formatInsights(topProductsMap),
        topCustomers: formatInsights(topCustomersMap),
        topVendors: formatInsights(topVendorsMap),
        stateWiseRevenue: formatInsights(stateWiseMap)
      },
      trendData,
      topIncomes,
      topExpenses,
      detailedTransactions
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch P&L data' }, { status: 500 });
  }
}
