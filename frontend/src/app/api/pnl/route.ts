import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const getEmptyPnlState = () => ({
  kpis: {
    totalDirectIncome: 0, totalIndirectIncome: 0, totalDirectExpense: 0, totalIndirectExpense: 0,
    grossProfit: 0, netProfit: 0, totalIncome: 0, totalExpense: 0, gpMargin: 0, npMargin: 0, operatingMargin: 0
  },
  insights: { topProducts: [], topCustomers: [], topVendors: [], stateWiseRevenue: [] },
  trendData: [], topIncomes: [], topExpenses: [], detailedTransactions: []
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2025-04-01';
    const endDate = searchParams.get('endDate') || '2026-03-31';

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    
    let companyIds: string[] = [];
    let decodedName = decodeURIComponent(activeCompany);
    
    const baseNameMatch = decodedName.match(/^(.*?)\s*-\s*\(from/);
    const baseName = baseNameMatch ? baseNameMatch[1].trim() : decodedName;

    const { data: relatedComps } = await supabase.from('companies').select('id').ilike('name', `${baseName}%`);
    if (relatedComps && relatedComps.length > 0) {
      companyIds = relatedComps.map(c => c.id);
    } else {
        return NextResponse.json(getEmptyPnlState());
    }

    // Fetch from materialized views
    let incExpQuery = supabase.from('mv_income_expense').select('*').in('company_id', companyIds);
    if (startDate) incExpQuery = incExpQuery.gte('tx_month', startDate);
    if (endDate) incExpQuery = incExpQuery.lte('tx_month', endDate);

    const [
        { data: incomeExpense },
        { data: productSales },
        { data: customerSales },
        { data: supplierPurchases },
        { data: ledgers }
    ] = await Promise.all([
        fetchAllData(incExpQuery),
        fetchAllData(supabase.from('mv_product_sales').select('*').in('company_id', companyIds)),
        fetchAllData(supabase.from('mv_customer_sales').select('*').in('company_id', companyIds)),
        fetchAllData(supabase.from('mv_supplier_purchases').select('*').in('company_id', companyIds)),
        fetchAllData(supabase.from('ledgers').select('name, parent_group').in('company_id', companyIds))
    ]);

    const ledgerGroupMap = new Map();
    (ledgers || []).forEach((l: any) => ledgerGroupMap.set(l.name, l.parent_group));

    const directIncomeGroups = ['Sales Accounts', 'Direct Incomes', 'Sales - Sponge Iron'];
    const indirectIncomeGroups = ['Indirect Incomes'];
    const directExpenseGroups = ['Purchase Accounts', 'Direct Expenses', 'Purchase Under GST Law'];
    
    let totalDirectIncome = 0;
    let totalIndirectIncome = 0;
    let totalDirectExpense = 0;
    let totalIndirectExpense = 0;

    const monthlyMap = new Map();
    const ledgerTotals = new Map();

    (incomeExpense || []).forEach((row: any) => {
        const type = row.tx_type; // 'INCOME' or 'EXPENSE'
        const txValue = Number(row.net_amount) || 0;
        const rootGroup = ledgerGroupMap.get(row.ledger_name) || '';

        let isDirect = false;
        if (type === 'INCOME') {
            isDirect = directIncomeGroups.includes(rootGroup);
            if (isDirect) totalDirectIncome += txValue;
            else totalIndirectIncome += txValue;
        } else if (type === 'EXPENSE') {
            isDirect = directExpenseGroups.includes(rootGroup);
            if (isDirect) totalDirectExpense += txValue;
            else totalIndirectExpense += txValue;
        }

        const d = new Date(row.tx_month);
        const mKey = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear().toString().substring(2);
        const sortKey = d.getFullYear() * 100 + d.getMonth();
        
        if (!monthlyMap.has(mKey)) {
            monthlyMap.set(mKey, { month: mKey, totalIncome: 0, totalExpense: 0, netProfit: 0, sortKey });
        }
        const m = monthlyMap.get(mKey);
        if (type === 'INCOME') m.totalIncome += txValue;
        if (type === 'EXPENSE') m.totalExpense += txValue;
        m.netProfit = m.totalIncome - m.totalExpense;

        if (!ledgerTotals.has(row.ledger_name)) {
            ledgerTotals.set(row.ledger_name, { name: row.ledger_name, type, amount: 0, rootGroup });
        }
        ledgerTotals.get(row.ledger_name).amount += txValue;
    });

    const trendData = Array.from(monthlyMap.values()).sort((a, b) => a.sortKey - b.sortKey);
    const topIncomes = Array.from(ledgerTotals.values())
        .filter(l => l.type === 'INCOME' && l.amount > 0)
        .sort((a, b) => b.amount - a.amount);
        
    const topExpenses = Array.from(ledgerTotals.values())
        .filter(l => l.type === 'EXPENSE' && l.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    const totalIncome = totalDirectIncome + totalIndirectIncome;
    const totalExpense = totalDirectExpense + totalIndirectExpense;
    const grossProfit = totalDirectIncome - totalDirectExpense;
    const netProfit = grossProfit + totalIndirectIncome - totalIndirectExpense;

    const gpMargin = totalDirectIncome > 0 ? (grossProfit / totalDirectIncome) * 100 : 0;
    const npMargin = totalDirectIncome > 0 ? (netProfit / totalDirectIncome) * 100 : 0;
    const operatingMargin = totalDirectIncome > 0 ? ((grossProfit - totalIndirectExpense) / totalDirectIncome) * 100 : 0;

    const topProducts = (productSales || [])
        .map((p: any) => ({ name: p.product_name, value: Number(p.sales_amount) || 0 }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 5);

    const topCustomers = (customerSales || [])
        .map((c: any) => ({ name: c.customer_name, value: Number(c.total_sales) || 0 }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 5);

    const topVendors = (supplierPurchases || [])
        .map((s: any) => ({ name: s.supplier_name, value: Number(s.total_purchases) || 0 }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 5);

    return NextResponse.json({
        kpis: {
            totalDirectIncome, totalIndirectIncome, totalDirectExpense, totalIndirectExpense,
            grossProfit, netProfit, totalIncome, totalExpense, gpMargin, npMargin, operatingMargin
        },
        insights: {
            topProducts, topCustomers, topVendors, stateWiseRevenue: []
        },
        trendData,
        topIncomes: topIncomes.slice(0, 15),
        topExpenses: topExpenses.slice(0, 15),
        detailedTransactions: [] // Omitted for performance
    });

  } catch (error: any) {
    console.error("Error generating exact PNL:", error);
    return NextResponse.json(getEmptyPnlState());
  }
}

export const runtime = 'edge';
