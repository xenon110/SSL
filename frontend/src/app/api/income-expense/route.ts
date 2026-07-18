import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

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
      const { data: fallback } = await supabase.from('companies').select('id').ilike('name', 'SMRIDHI SPONGE LIMITED%');
      if (fallback && fallback.length > 0) {
        companyIds = fallback.map(c => c.id);
      } else {
        return NextResponse.json({
            kpis: { totalIncome: 0, totalExpense: 0, netProfit: 0, margin: 0 },
            trendData: [],
            topIncomes: [],
            topExpenses: [],
            detailedTransactions: []
        });
      }
    }

    // 1. Fetch relevant ledgers for Income and Expense
    const incomeGroups = ['Direct Incomes', 'Indirect Incomes', 'Sales Accounts', 'Sales - Sponge Iron'];
    const expenseGroups = [
      'Direct Expenses', 'Indirect Expenses', 'Purchase Accounts', 'Purchase Under GST Law', 
      'Misc. Expenses', 'Staff Welfare Expenses', 'Salary', 'Wages', 'Travelling & Coneyance', 
      'Printing & Stationery', 'Rent, Rates & Taxes', 'Repair & Maintenance', 'Director Remuneration', 
      'Finance Cost', 'Bank Charges', 'Consultancy & Legal', 'Kolkata Office Exp', 'DRC-03 Tax', 
      'DRC-03 Int', 'DRC-03 Penalty'
    ];
    
    const { data: ledgers, error: ledgersError } = await supabase
      .from('ledgers')
      .select('name, parent_group')
      .in('company_id', companyIds)
      .in('parent_group', [...incomeGroups, ...expenseGroups]);
      
    if (ledgersError) throw ledgersError;
    
    const ledgerMap = new Map();
    ledgers?.forEach(l => {
        ledgerMap.set(l.name, incomeGroups.includes(l.parent_group) ? 'INCOME' : 'EXPENSE');
    });

    const targetLedgerNames = ledgers?.map(l => l.name) || [];

    if (targetLedgerNames.length === 0) {
        return NextResponse.json({
            kpis: { totalIncome: 0, totalExpense: 0, netProfit: 0, margin: 0 },
            trendData: [],
            topIncomes: [],
            topExpenses: [],
            detailedTransactions: []
        });
    }

    // 2. Fetch Vouchers within date range using fetchAllData to bypass 1000-row limit
    let query = supabase
      .from('vouchers')
      .select('id, date')
      .in('company_id', companyIds)
      .eq('is_deleted', false)
      .eq('is_cancelled', false)
      .eq('is_optional', false)
      .gte('date', startDate)
      .lte('date', endDate);

    const { data: activeVouchers, error: voucherError } = await fetchAllData(query);
    if (voucherError) throw voucherError;
    if (!activeVouchers || activeVouchers.length === 0) {
        return NextResponse.json({
            kpis: { totalIncome: 0, totalExpense: 0, netProfit: 0, margin: 0 },
            trendData: [],
            topIncomes: [],
            topExpenses: [],
            detailedTransactions: []
        });
    }

    // 3. Chunk IDs for voucher_ledgers query
    const activeVoucherIds = activeVouchers.map(v => v.id);
    const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const idChunks = chunkArray(activeVoucherIds, 150);
    
    const voucherDateMap = new Map();
    activeVouchers.forEach(v => voucherDateMap.set(v.id, v.date));

    let allDetailedTx: any[] = [];
    
    for (const chunk of idChunks) {
        const { data: chunkTx, error: txError } = await fetchAllData(
            supabase
              .from('voucher_ledgers')
              .select('voucher_id, ledger_name, amount, is_debit')
              .in('voucher_id', chunk)
              .in('ledger_name', targetLedgerNames)
        );
            
        if (txError) throw txError;
        if (chunkTx) {
            allDetailedTx = allDetailedTx.concat(chunkTx);
        }
    }

    // 4. Process Data
    let totalIncome = 0;
    let totalExpense = 0;
    const monthlyMap = new Map();
    const ledgerTotals = new Map();

    const transactions: any[] = [];

    allDetailedTx.forEach(tx => {
        const dateStr = voucherDateMap.get(tx.voucher_id);
        if (!dateStr) return;
        
        const type = ledgerMap.get(tx.ledger_name);
        if (!type) return;

        let txValue = tx.amount;
        if (type === 'EXPENSE') {
            txValue = tx.is_debit ? tx.amount : -tx.amount;
        } else if (type === 'INCOME') {
            txValue = tx.is_debit ? -tx.amount : tx.amount;
        }

        if (type === 'INCOME') totalIncome += txValue;
        if (type === 'EXPENSE') totalExpense += txValue;

        // Monthly Trend Grouping
        const d = new Date(dateStr);
        const mKey = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear().toString().substring(2);
        const sortKey = d.getFullYear() * 100 + d.getMonth();
        
        if (!monthlyMap.has(mKey)) {
            monthlyMap.set(mKey, { name: mKey, income: 0, expense: 0, net: 0, sortKey });
        }
        const m = monthlyMap.get(mKey);
        if (type === 'INCOME') m.income += txValue;
        if (type === 'EXPENSE') m.expense += txValue;
        m.net = m.income - m.expense;

        // Ledger Totals for Bar Charts
        if (!ledgerTotals.has(tx.ledger_name)) {
            ledgerTotals.set(tx.ledger_name, { name: tx.ledger_name, type, amount: 0, count: 0 });
        }
        const lt = ledgerTotals.get(tx.ledger_name);
        lt.amount += txValue;
        lt.count += 1;

        // Save detailed tx for frontend modal
        transactions.push({
            id: tx.voucher_id,
            date: dateStr,
            ledger: tx.ledger_name,
            amount: txValue,
            type: type
        });
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
        kpis: {
            totalIncome,
            totalExpense,
            netProfit,
            margin
        },
        trendData,
        topIncomes,
        topExpenses,
        detailedTransactions: transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });

  } catch (error: any) {
    console.error("Income/Expense API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
