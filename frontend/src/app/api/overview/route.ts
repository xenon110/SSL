import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

const getEmptyOverviewState = () => ({
  sales: 0,
  purchases: 0,
  grossProfit: 0,
  netProfit: 0,
  totalReceipts: 0,
  totalPayments: 0,
  salesTrend: [{name: 'No Data', total: 0}],
  purchaseTrend: [{name: 'No Data', total: 0}],
  combinedTrend: [{month: 'No Data', sales: 0, purchases: 0, margin: 0}],
  cashFlowData: [
    { name: 'In', in: 0, out: 0 },
    { name: 'Out', in: 0, out: 0 }
  ]
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    
    let companyId = null;
    let decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (comp) {
      companyId = comp.id;
    } else {
      const { data: bkmComp } = await supabase.from('companies').select('id').eq('name', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)').single();
      if (bkmComp) {
        companyId = bkmComp.id;
      } else {
        return NextResponse.json(getEmptyOverviewState());
      }
    }

    let query = supabase.from('vouchers').select('*').eq('company_id', companyId)
      .eq('is_deleted', false)
      .eq('is_cancelled', false)
      .eq('is_optional', false);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: vouchers, error } = await fetchAllData(query);
    if (error) throw error;

    // Fetch expense ledgers mapping
    const { data: expenseLedgers } = await supabase
      .from('ledgers')
      .select('name, parent_group')
      .eq('company_id', companyId)
      .or('parent_group.ilike.%expense%,parent_group.ilike.%wages%,parent_group.ilike.%salaries%,parent_group.ilike.%fuel%,parent_group.ilike.%power%');

    const directExpenseLedgers = new Set<string>();
    const indirectExpenseLedgers = new Set<string>();

    expenseLedgers?.forEach(l => {
      const pg = (l.parent_group || '').toLowerCase();
      // Match direct expenses and direct costs
      if (pg.includes('direct') || pg.includes('wages') || pg.includes('power') || pg.includes('fuel')) {
        directExpenseLedgers.add(l.name);
      } else {
        indirectExpenseLedgers.add(l.name);
      }
    });

    let directExpenses = 0;
    let indirectExpenses = 0;
    const allExpenseLedgerNames = [...directExpenseLedgers, ...indirectExpenseLedgers];

    if (allExpenseLedgerNames.length > 0) {
      let ledgQuery = supabase
        .from('voucher_ledgers')
        .select('ledger_name, amount, is_debit, vouchers!inner(date, company_id, is_deleted, is_cancelled, is_optional)')
        .eq('vouchers.company_id', companyId)
        .eq('vouchers.is_deleted', false)
        .eq('vouchers.is_cancelled', false)
        .eq('vouchers.is_optional', false)
        .in('ledger_name', allExpenseLedgerNames);
        
      if (startDate) ledgQuery = ledgQuery.gte('vouchers.date', startDate);
      if (endDate) ledgQuery = ledgQuery.lte('vouchers.date', endDate);
      
      const { data: ledgerLines } = await fetchAllData(ledgQuery);
      
      ledgerLines?.forEach((line: any) => {
        const amt = Number(line.amount) || 0;
        if (directExpenseLedgers.has(line.ledger_name)) {
          directExpenses += amt;
        } else {
          indirectExpenses += amt;
        }
      });
    }

    let totalSales = 0;
    let totalPurchases = 0;
    let receiptCount = 0;
    let totalReceipts = 0;
    let totalPayments = 0;

    const monthlySales: Record<string, number> = {};
    const monthlyPurchases: Record<string, number> = {};
    
    // Grouping variables for charts
    const salesTrend: any[] = [];
    const purchaseTrend: any[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    vouchers?.forEach((v: any) => {
      const type = v.voucher_type_name?.toLowerCase();
      const val = Number(v.amount) || 0;
      const vDate = new Date(v.date);
      const monthKey = monthNames[vDate.getMonth()];

      if (type.includes('sale')) {
        totalSales += val;
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + val;
      }
      else if (type.includes('purchase')) {
        totalPurchases += val;
        monthlyPurchases[monthKey] = (monthlyPurchases[monthKey] || 0) + val;
      }
      else if (type.includes('receipt')) {
        totalReceipts += val;
        receiptCount++;
      }
      else if (type.includes('payment')) {
        totalPayments += val;
      }
    });

    const combinedTrend: any[] = [];
    monthNames.forEach(month => {
      const s = monthlySales[month] || 0;
      const p = monthlyPurchases[month] || 0;
      if (s > 0 || p > 0) {
        if (monthlySales[month]) salesTrend.push({ name: month, total: s });
        if (monthlyPurchases[month]) purchaseTrend.push({ name: month, total: p });
        combinedTrend.push({ month, sales: s, purchases: p, margin: s - p });
      }
    });

    const liveData = {
      sales: totalSales,
      purchases: totalPurchases,
      grossProfit: totalSales - totalPurchases - directExpenses,
      netProfit: totalSales - totalPurchases - directExpenses - indirectExpenses,
      totalReceipts,
      totalPayments,
      salesTrend: salesTrend.length ? salesTrend : [{name: 'No Data', total: 0}],
      purchaseTrend: purchaseTrend.length ? purchaseTrend : [{name: 'No Data', total: 0}],
      combinedTrend: combinedTrend.length ? combinedTrend : [{month: 'No Data', sales: 0, purchases: 0, margin: 0}],
      cashFlowData: [
        { name: 'In', in: totalReceipts, out: 0 },
        { name: 'Out', in: 0, out: totalPayments }
      ]
    };

    return NextResponse.json(liveData);
  } catch (err: any) {
    console.error("Overview API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const runtime = 'edge';
