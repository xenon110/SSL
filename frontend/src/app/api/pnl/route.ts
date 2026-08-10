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
      const { data: fallback } = await supabase.from('companies').select('id').ilike('name', 'SMRIDHI SPONGE LIMITED%');
      if (fallback && fallback.length > 0) {
        companyIds = fallback.map(c => c.id);
      } else {
        return NextResponse.json(getEmptyPnlState());
      }
    }

    // Group Classifications
    const directIncomeGroups = ['Sales Accounts', 'Direct Incomes', 'Sales - Sponge Iron'];
    const indirectIncomeGroups = ['Indirect Incomes'];
    const directExpenseGroups = ['Purchase Accounts', 'Direct Expenses', 'Purchase Under GST Law'];
    const indirectExpenseGroups = [
      'Indirect Expenses', 'Misc. Expenses', 'Staff Welfare Expenses', 'Salary', 'Wages', 
      'Travelling & Coneyance', 'Printing & Stationery', 'Rent, Rates & Taxes', 'Repair & Maintenance', 
      'Director Remuneration', 'Finance Cost', 'Bank Charges', 'Consultancy & Legal', 'Kolkata Office Exp', 
      'DRC-03 Tax', 'DRC-03 Int', 'DRC-03 Penalty'
    ];

    const allGroups = [...directIncomeGroups, ...indirectIncomeGroups, ...directExpenseGroups, ...indirectExpenseGroups];

    // 1. Fetch ledgers
    const { data: ledgers, error: ledgersError } = await supabase
      .from('ledgers')
      .select('name, parent_group')
      .in('company_id', companyIds)
      .in('parent_group', allGroups);
      
    if (ledgersError) throw ledgersError;
    
    const ledgerMap = new Map();
    ledgers?.forEach(l => {
        let type = 'UNKNOWN';
        let isDirect = false;
        if (directIncomeGroups.includes(l.parent_group)) { type = 'INCOME'; isDirect = true; }
        else if (indirectIncomeGroups.includes(l.parent_group)) { type = 'INCOME'; isDirect = false; }
        else if (directExpenseGroups.includes(l.parent_group)) { type = 'EXPENSE'; isDirect = true; }
        else if (indirectExpenseGroups.includes(l.parent_group)) { type = 'EXPENSE'; isDirect = false; }

        ledgerMap.set(l.name, { type, isDirect, rootGroup: l.parent_group });
    });

    const targetLedgerNames = ledgers?.map(l => l.name) || [];

    if (targetLedgerNames.length === 0) {
        return NextResponse.json(getEmptyPnlState());
    }

    // 2. Fetch Vouchers using fetchAllData helper
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
    if (!activeVouchers || activeVouchers.length === 0) return NextResponse.json(getEmptyPnlState());

    // 3. Chunk IDs and fetch voucher_ledgers
    const activeVoucherIds = activeVouchers.map(v => v.id);
    const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const idChunks = chunkArray(activeVoucherIds, 150);
    
    const voucherDateMap = new Map();
    activeVouchers.forEach(v => voucherDateMap.set(v.id, v.date));

    let allLedgerTx: any[] = [];
    let allInvTx: any[] = [];
    
    for (const chunk of idChunks) {
        const { data: chunkL, error: lErr } = await fetchAllData(
            supabase.from('voucher_ledgers').select('voucher_id, ledger_name, amount, is_debit').in('voucher_id', chunk)
        );
        if (lErr) throw lErr;
        if (chunkL) allLedgerTx = allLedgerTx.concat(chunkL);

        const { data: chunkInv } = await fetchAllData(
            supabase.from('voucher_inventory').select('voucher_id, stock_item_name, billed_qty, rate, amount, is_inward').in('voucher_id', chunk)
        );
        if (chunkInv) allInvTx = allInvTx.concat(chunkInv);
    }

    const invMap = new Map();
    allInvTx.forEach(tx => {
        if (!invMap.has(tx.voucher_id)) invMap.set(tx.voucher_id, []);
        invMap.get(tx.voucher_id).push(tx);
    });

    const fullLedgerMap = new Map();
    allLedgerTx.forEach(tx => {
        if (!fullLedgerMap.has(tx.voucher_id)) fullLedgerMap.set(tx.voucher_id, []);
        fullLedgerMap.get(tx.voucher_id).push(tx);
    });

    // 4. Process Data
    let totalDirectIncome = 0;
    let totalIndirectIncome = 0;
    let totalDirectExpense = 0;
    let totalIndirectExpense = 0;

    const monthlyMap = new Map();
    const ledgerTotals = new Map();
    const transactions: any[] = [];

    // Filter allLedgerTx to only those in our targetLedgerNames for the main PNL list
    const pnlDetailedTx = allLedgerTx.filter(tx => targetLedgerNames.includes(tx.ledger_name));

    pnlDetailedTx.forEach(tx => {
        const dateStr = voucherDateMap.get(tx.voucher_id);
        if (!dateStr) return;
        
        const lInfo = ledgerMap.get(tx.ledger_name);
        if (!lInfo) return;

        const { type, isDirect, rootGroup } = lInfo;

        let txValue = tx.amount;
        if (type === 'EXPENSE') txValue = tx.is_debit ? tx.amount : -tx.amount;
        else if (type === 'INCOME') txValue = tx.is_debit ? -tx.amount : tx.amount;

        if (type === 'INCOME') {
            if (isDirect) totalDirectIncome += txValue;
            else totalIndirectIncome += txValue;
        } else if (type === 'EXPENSE') {
            if (isDirect) totalDirectExpense += txValue;
            else totalIndirectExpense += txValue;
        }

        const d = new Date(dateStr);
        const mKey = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear().toString().substring(2);
        const sortKey = d.getFullYear() * 100 + d.getMonth();
        
        if (!monthlyMap.has(mKey)) {
            monthlyMap.set(mKey, { month: mKey, totalIncome: 0, totalExpense: 0, netProfit: 0, sortKey });
        }
        const m = monthlyMap.get(mKey);
        
        if (type === 'INCOME') m.totalIncome += txValue;
        if (type === 'EXPENSE') m.totalExpense += txValue;
        m.netProfit = m.totalIncome - m.totalExpense;

        if (!ledgerTotals.has(tx.ledger_name)) {
            ledgerTotals.set(tx.ledger_name, { name: tx.ledger_name, type, amount: 0, count: 0, rootGroup });
        }
        const lt = ledgerTotals.get(tx.ledger_name);
        lt.amount += txValue;
        lt.count += 1;

        transactions.push({
            id: tx.voucher_id,
            date: dateStr,
            ledger: tx.ledger_name,
            amount: txValue,
            type: type,
            isGroup: false,
            rootGroup: rootGroup,
            items: (invMap.get(tx.voucher_id) || []).map((inv: any) => ({
                product: inv.stock_item_name || 'Unknown',
                qty: inv.billed_qty || 0,
                rate: inv.rate || 0,
                amount: inv.amount || 0
            })),
            ledgers: (fullLedgerMap.get(tx.voucher_id) || []).map((l: any) => ({
                name: l.ledger_name,
                amount: Number(l.amount) || 0,
                is_debit: l.is_debit
            }))
        });
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

    // 5. Insights Generation
    const productTotals = new Map();
    allInvTx.forEach(tx => {
        if (!tx.is_inward) { // Sales
            const amt = Number(tx.amount) || 0;
            productTotals.set(tx.stock_item_name, (productTotals.get(tx.stock_item_name) || 0) + amt);
        }
    });
    const topProducts = Array.from(productTotals.entries()).map(([name, amount]) => ({ name, value: amount })).sort((a,b) => b.value - a.value).slice(0, 5);

    const { data: partyLedgers } = await supabase.from('ledgers').select('name, parent_group').in('company_id', companyIds).or('parent_group.eq.Sundry Debtors,parent_group.like.Creditor%');
    const partyMap = new Map();
    if (partyLedgers) {
        partyLedgers.forEach(l => partyMap.set(l.name, l.parent_group === 'Sundry Debtors' ? 'CUSTOMER' : 'VENDOR'));
    }
    
    const customerTotals = new Map();
    const vendorTotals = new Map();
    allLedgerTx.forEach(tx => {
        if (partyMap.has(tx.ledger_name)) {
            const type = partyMap.get(tx.ledger_name);
            const amt = Number(tx.amount) || 0;
            if (type === 'CUSTOMER') customerTotals.set(tx.ledger_name, (customerTotals.get(tx.ledger_name) || 0) + amt);
            else if (type === 'VENDOR') vendorTotals.set(tx.ledger_name, (vendorTotals.get(tx.ledger_name) || 0) + amt);
        }
    });
    
    const topCustomers = Array.from(customerTotals.entries()).map(([name, amount]) => ({ name, value: amount })).sort((a,b) => b.value - a.value).slice(0, 5);
    const topVendors = Array.from(vendorTotals.entries()).map(([name, amount]) => ({ name, value: amount })).sort((a,b) => b.value - a.value).slice(0, 5);

    return NextResponse.json({
        kpis: {
            totalDirectIncome, totalIndirectIncome, totalDirectExpense, totalIndirectExpense,
            grossProfit, netProfit, totalIncome, totalExpense, gpMargin, npMargin, operatingMargin
        },
        insights: {
            topProducts,
            topCustomers,
            topVendors,
            stateWiseRevenue: []
        },
        trendData,
        topIncomes: topIncomes.slice(0, 15),
        topExpenses: topExpenses.slice(0, 15),
        detailedTransactions: transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });

  } catch (error: any) {
    console.error("Error generating exact PNL:", error);
    return NextResponse.json(getEmptyPnlState());
  }
}

export const runtime = 'edge';
