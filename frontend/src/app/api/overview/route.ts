import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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
        return NextResponse.json(getEmptyOverviewState());
    }

    const [
        { data: salesData },
        { data: incExpData },
        { data: cfData },
        { data: ledgers }
    ] = await Promise.all([
        fetchAllData(supabase.from('mv_daily_sales').select('*').eq('company_id', companyId)),
        fetchAllData(supabase.from('mv_income_expense').select('*').eq('company_id', companyId)),
        fetchAllData(supabase.from('mv_cash_flow_summary').select('*').eq('company_id', companyId)),
        fetchAllData(supabase.from('ledgers').select('name, parent_group').eq('company_id', companyId))
    ]);

    const ledgerGroupMap = new Map();
    (ledgers || []).forEach((l: any) => ledgerGroupMap.set(l.name, l.parent_group));

    const directIncomeGroups = ['Sales Accounts', 'Direct Incomes', 'Sales - Sponge Iron'];
    const directExpenseGroups = ['Purchase Accounts', 'Direct Expenses', 'Purchase Under GST Law'];
    
    let directIncome = 0;
    let indirectIncome = 0;
    let directExpense = 0;
    let indirectExpense = 0;

    let totalPurchases = 0; // Total from purchase accounts specifically

    const monthlySales: Record<string, number> = {};
    const monthlyPurchases: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    (incExpData || []).forEach((row: any) => {
        const amt = Number(row.net_amount) || 0;
        const group = ledgerGroupMap.get(row.ledger_name) || '';
        const m = new Date(row.tx_month).getMonth();
        const mKey = monthNames[m];

        if (row.tx_type === 'INCOME') {
            if (directIncomeGroups.includes(group)) directIncome += amt;
            else indirectIncome += amt;
        } else if (row.tx_type === 'EXPENSE') {
            if (directExpenseGroups.includes(group)) {
                directExpense += amt;
                if (group === 'Purchase Accounts' || group === 'Purchase Under GST Law') {
                    totalPurchases += amt;
                    monthlyPurchases[mKey] = (monthlyPurchases[mKey] || 0) + amt;
                }
            }
            else indirectExpense += amt;
        }
    });

    let totalSales = 0;
    (salesData || []).forEach((row: any) => {
        const amt = Number(row.total_sales) || 0;
        totalSales += amt;
        const mKey = monthNames[new Date(row.date).getMonth()];
        monthlySales[mKey] = (monthlySales[mKey] || 0) + amt;
    });

    let totalReceipts = 0;
    let totalPayments = 0;
    (cfData || []).forEach((row: any) => {
        totalReceipts += Number(row.total_inflow) || 0;
        totalPayments += Number(row.total_outflow) || 0;
    });

    const salesTrend: any[] = [];
    const purchaseTrend: any[] = [];
    const combinedTrend: any[] = [];

    monthNames.forEach(month => {
      const s = monthlySales[month] || 0;
      const p = monthlyPurchases[month] || 0;
      if (s > 0 || p > 0) {
        if (s > 0) salesTrend.push({ name: month, total: s });
        if (p > 0) purchaseTrend.push({ name: month, total: p });
        combinedTrend.push({ month, sales: s, purchases: p, margin: s - p });
      }
    });

    const liveData = {
      sales: totalSales,
      purchases: totalPurchases,
      grossProfit: directIncome - directExpense,
      netProfit: (directIncome + indirectIncome) - (directExpense + indirectExpense),
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
