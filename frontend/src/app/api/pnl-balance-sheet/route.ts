import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const getEmptyBalanceSheetState = () => ({
  assets: [],
  liabilities: [],
  kpis: {
    totalAssets: 0, totalLiabilities: 0, netWorth: 0, workingCapital: 0,
    currentRatio: 0, debtToEquity: 0, netProfit: 0, opex: 0, capex: 0
  },
  pnlGroups: { incomes: [], expenses: [] },
  detailedTransactions: []
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2025-04-01';
    const endDate = searchParams.get('endDate') || '2026-03-31';

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    const companyName = decodeURIComponent(activeCompany);

    let companyId = 'a98b4f9e-ff1c-454e-a38c-c5db9a62c454';
    const { data: comp } = await supabase.from('companies').select('id').eq('name', companyName).single();
    if (comp) companyId = comp.id;

    // Fetch from materialized views and dashboard_metrics concurrently
    const [
        { data: metrics },
        { data: incExp },
        { data: wcLedgers }
    ] = await Promise.all([
        supabase.from('dashboard_metrics').select('metrics_data').eq('company_id', companyId).eq('dashboard_name', 'Executive Summary').single(),
        fetchAllData(supabase.from('mv_income_expense').select('*').eq('company_id', companyId)),
        fetchAllData(supabase.from('ledgers').select('name, parent_group, closing_balance').eq('company_id', companyId))
    ]);

    const mData = metrics?.metrics_data || {};
    const bsBreakdown = mData['BS Breakdown'] || {};
    const expenseBreakdown = mData['Expense Breakdown'] || {};

    const assetsList: any[] = [];
    const liabilitiesList: any[] = [];
    
    // Balance Sheet mapping from dashboard_metrics and Ledgers
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    // Use the actual ledgers table to populate the detailed assets/liabilities lists
    const ASSET_ROOTS = ['current assets', 'fixed assets', 'investments', 'misc. expenses (asset)'];
    const LIAB_ROOTS = ['capital account', 'loans (liability)', 'current liabilities', 'suspense a/c', 'branch / divisions'];
    
    let capex = 0;
    let opex = 0;

    (wcLedgers || []).forEach((l: any) => {
        const bal = Number(l.closing_balance) || 0;
        if (bal === 0) return;

        const lowerPg = (l.parent_group || '').toLowerCase();
        let isAsset = ASSET_ROOTS.includes(lowerPg) || bal < 0; // Negative closing balance in Tally usually means debit (Asset)
        
        // Let's rely on parent group if available
        if (ASSET_ROOTS.includes(lowerPg) || ['cash-in-hand', 'bank accounts', 'sundry debtors'].includes(lowerPg)) {
            isAsset = true;
        } else if (LIAB_ROOTS.includes(lowerPg) || ['sundry creditors', 'duties & taxes'].includes(lowerPg)) {
            isAsset = false;
        }

        const amt = Math.abs(bal);
        const item = {
            name: l.name,
            category: isAsset ? 'ASSET' : 'LIABILITY',
            type: l.parent_group || 'Unknown',
            balance: amt,
            count: 1,
            opening: 0
        };

        if (isAsset) {
            assetsList.push(item);
            totalAssets += amt;
            if (lowerPg.includes('fixed assets')) capex += amt;
        } else {
            liabilitiesList.push(item);
            totalLiabilities += amt;
        }
    });

    const pnlIncomes: any[] = [];
    const pnlExpenses: any[] = [];
    
    // Use mv_income_expense for precise PNL groups
    const pnlGroupMap = new Map();
    (incExp || []).forEach((row: any) => {
        const amt = Number(row.net_amount) || 0;
        if (amt === 0) return;
        
        if (!pnlGroupMap.has(row.ledger_name)) {
            pnlGroupMap.set(row.ledger_name, { name: row.ledger_name, amount: 0, type: row.tx_type });
        }
        pnlGroupMap.get(row.ledger_name).amount += amt;
    });

    Array.from(pnlGroupMap.values()).forEach(item => {
        if (item.type === 'INCOME') pnlIncomes.push({ name: item.name, amount: item.amount, isGroup: false });
        else {
            pnlExpenses.push({ name: item.name, amount: item.amount, isGroup: false });
            opex += item.amount;
        }
    });

    const kpis = {
      totalAssets: mData['Total Assets'] || totalAssets,
      totalLiabilities: mData['Total Liabilities'] || totalLiabilities,
      netWorth: mData['Net Worth'] || 0,
      workingCapital: mData['Working Capital'] || 0,
      currentRatio: mData['Current Ratio'] || 0,
      debtToEquity: mData['Debt-Equity Ratio'] || 0,
      netProfit: mData['Net Profit'] || 0,
      opex,
      capex
    };

    return NextResponse.json({
      kpis,
      assets: assetsList.sort((a, b) => b.balance - a.balance),
      liabilities: liabilitiesList.sort((a, b) => b.balance - a.balance),
      pnlGroups: { incomes: pnlIncomes, expenses: pnlExpenses },
      detailedTransactions: [] // Omitted for extreme performance
    });

  } catch (error: any) {
    console.error('Error generating Balance Sheet:', error);
    return NextResponse.json(getEmptyBalanceSheetState());
  }
}

export const runtime = 'edge';
