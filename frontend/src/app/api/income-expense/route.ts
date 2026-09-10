import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
        return NextResponse.json({
            kpis: { totalIncome: 0, totalExpense: 0, netProfit: 0, margin: 0 },
            trendData: [], topIncomes: [], topExpenses: [], detailedTransactions: []
        });
    }

    // Fetch from Materialized View
    let query = supabase.from('mv_income_expense').select('*').in('company_id', companyIds);
    if (startDate) query = query.gte('tx_month', startDate);
    if (endDate) query = query.lte('tx_month', endDate);

    const { data: incomeExpense } = await fetchAllData(query);

    let totalIncome = 0;
    let totalExpense = 0;
    const monthlyMap = new Map();
    const ledgerTotals = new Map();

    (incomeExpense || []).forEach((row: any) => {
        const type = row.tx_type;
        const txValue = Number(row.net_amount) || 0;

        if (type === 'INCOME') totalIncome += txValue;
        if (type === 'EXPENSE') totalExpense += txValue;

        // Monthly Trend
        const d = new Date(row.tx_month);
        const mKey = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear().toString().substring(2);
        const sortKey = d.getFullYear() * 100 + d.getMonth();
        
        if (!monthlyMap.has(mKey)) {
            monthlyMap.set(mKey, { name: mKey, income: 0, expense: 0, net: 0, sortKey });
        }
        const m = monthlyMap.get(mKey);
        if (type === 'INCOME') m.income += txValue;
        if (type === 'EXPENSE') m.expense += txValue;
        m.net = m.income - m.expense;

        // Ledger Totals
        if (!ledgerTotals.has(row.ledger_name)) {
            ledgerTotals.set(row.ledger_name, { name: row.ledger_name, type, amount: 0, count: 0 });
        }
        const lt = ledgerTotals.get(row.ledger_name);
        lt.amount += txValue;
        lt.count += Number(row.tx_count) || 0;
    });

    const trendData = Array.from(monthlyMap.values()).sort((a, b) => a.sortKey - b.sortKey);
    const topIncomes = Array.from(ledgerTotals.values())
        .filter(l => l.type === 'INCOME' && l.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);
    const topExpenses = Array.from(ledgerTotals.values())
        .filter(l => l.type === 'EXPENSE' && l.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

    const netProfit = totalIncome - totalExpense;
    const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return NextResponse.json({
        kpis: { totalIncome, totalExpense, netProfit, margin },
        trendData, topIncomes, topExpenses,
        detailedTransactions: [] // Omitted for performance
    });

  } catch (error: any) {
    console.error("Income/Expense API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
