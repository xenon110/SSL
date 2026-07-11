import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 1. Fetch all groups to resolve hierarchy
    const { data: groups, error: groupsError } = await supabase.from('groups').select('*');
    if (groupsError) throw groupsError;

    const groupMap = new Map(groups.map(g => [g.name, g.parent]));

    const getRootClassification = (groupName: string): { category: 'ASSET' | 'LIABILITY' | 'PNL', type: string } | null => {
      let current = groupName;
      let depth = 0;
      while (current && depth < 20) {
        // PNL
        if (['Sales Accounts', 'Direct Incomes', 'Indirect Incomes'].includes(current)) return { category: 'PNL', type: 'INCOME' };
        if (['Purchase Accounts', 'Direct Expenses', 'Indirect Expenses'].includes(current)) return { category: 'PNL', type: 'EXPENSE' };
        
        // ASSETS
        if (['Current Assets'].includes(current)) return { category: 'ASSET', type: 'Current Assets' };
        if (['Fixed Assets'].includes(current)) return { category: 'ASSET', type: 'Fixed Assets' };
        if (['Investments'].includes(current)) return { category: 'ASSET', type: 'Investments' };
        if (['Misc. Expenses (ASSET)'].includes(current)) return { category: 'ASSET', type: 'Misc. Assets' };
        
        // LIABILITIES
        if (['Capital Account'].includes(current)) return { category: 'LIABILITY', type: 'Capital Account' };
        if (['Loans (Liability)'].includes(current)) return { category: 'LIABILITY', type: 'Loans' };
        if (['Current Liabilities'].includes(current)) return { category: 'LIABILITY', type: 'Current Liabilities' };
        if (['Suspense A/c'].includes(current)) return { category: 'LIABILITY', type: 'Suspense' };
        if (['Branch / Divisions'].includes(current)) return { category: 'LIABILITY', type: 'Branch/Divisions' };

        current = groupMap.get(current) || '';
        depth++;
      }
      return null;
    };

    // 2. Fetch all ledgers
    const { data: ledgers, error: ledgersError } = await supabase.from('ledgers').select('*');
    if (ledgersError) throw ledgersError;

    const ledgerClassification = new Map<string, { category: 'ASSET' | 'LIABILITY' | 'PNL', type: string, opening: number, isDebit: boolean }>();
    ledgers.forEach(l => {
      const cls = getRootClassification(l.parent_group);
      if (cls) {
        ledgerClassification.set(l.name, {
          category: cls.category,
          type: cls.type,
          opening: Number(l.opening_balance) || 0,
          isDebit: l.is_debit
        });
      }
    });

    // 3. Fetch vouchers
    let query = supabase
      .from('vouchers')
      .select('*, voucher_ledgers(*), voucher_inventory(*)');

    if (endDate) query = query.lte('date', endDate);

    const { data: vouchers, error } = await query;
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

    // Aggregations
    let totalIncome = 0;
    let totalExpense = 0;
    let totalCapex = 0;
    
    const bsAggregates: Record<string, { name: string, category: 'ASSET'|'LIABILITY', type: string, balance: number, count: number, opening: number }> = {};
    const detailedTransactions: any[] = [];

    // Initialize balances
    ledgers.forEach(l => {
      const cls = ledgerClassification.get(l.name);
      if (cls && cls.category !== 'PNL') {
        const initialBal = cls.isDebit ? cls.opening : -cls.opening; 
        bsAggregates[l.name] = {
          name: l.name,
          category: cls.category,
          type: cls.type,
          balance: initialBal,
          count: 0,
          opening: initialBal
        };
      }
    });

    // Process vouchers
    activeVouchers.forEach((v: any) => {
      const isWithinPnLRange = (!startDate || v.date >= startDate) && (!endDate || v.date <= endDate);

      (v.voucher_ledgers || []).forEach((l: any) => {
        const cls = ledgerClassification.get(l.ledger_name);
        if (!cls) return;

        let amount = Number(l.amount) || 0;
        const netChange = l.is_debit ? amount : -amount;

        if (cls.category === 'PNL') {
          if (!isWithinPnLRange) return;
          if (cls.type === 'INCOME') {
            totalIncome += -netChange;
          } else {
            totalExpense += netChange;
          }
        } else {
          if (!bsAggregates[l.ledger_name]) {
             bsAggregates[l.ledger_name] = { name: l.ledger_name, category: cls.category, type: cls.type, balance: 0, count: 0, opening: 0 };
          }
          
          bsAggregates[l.ledger_name].balance += netChange;
          bsAggregates[l.ledger_name].count += 1;

          if (isWithinPnLRange && cls.category === 'ASSET' && cls.type === 'Fixed Assets') {
             totalCapex += netChange;
          }
        }

        if (isWithinPnLRange) {
           detailedTransactions.push({
             id: v.voucher_number || v.tally_guid.substring(0,8),
             date: v.date,
             type: cls.category,
             ledger: l.ledger_name,
             amount: netChange,
             voucherType: v.voucher_type_name,
             items: (v.voucher_inventory || []).map((inv: any) => ({
               product: inv.stock_item_name || "Unknown",
               qty: inv.billed_qty || 0,
               rate: inv.rate || 0,
               amount: inv.amount || 0
             })),
             narration: v.narration
           });
        }
      });
    });

    const netProfit = totalIncome - totalExpense;

    const assetsList = Object.values(bsAggregates)
      .filter(a => a.category === 'ASSET' && Math.abs(a.balance) > 0.01)
      .map(a => ({ ...a, balance: a.balance })) 
      .sort((a, b) => b.balance - a.balance);

    const liabilitiesList = Object.values(bsAggregates)
      .filter(a => a.category === 'LIABILITY' && Math.abs(a.balance) > 0.01)
      .map(a => ({ ...a, balance: -a.balance })) 
      .sort((a, b) => b.balance - a.balance);

    if (netProfit !== 0) {
      if (netProfit > 0) {
        liabilitiesList.push({ name: 'Profit & Loss A/c', category: 'LIABILITY', type: 'Reserves & Surplus', balance: netProfit, count: 1, opening: 0 });
      } else {
        assetsList.push({ name: 'Profit & Loss A/c', category: 'ASSET', type: 'Misc. Assets', balance: Math.abs(netProfit), count: 1, opening: 0 });
      }
    }

    const totalAssets = assetsList.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilitiesList.reduce((sum, l) => sum + l.balance, 0);

    const currentAssets = assetsList.filter(a => a.type === 'Current Assets').reduce((sum, a) => sum + a.balance, 0);
    const currentLiabilities = liabilitiesList.filter(l => l.type === 'Current Liabilities').reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = liabilitiesList.filter(l => ['Capital Account', 'Reserves & Surplus'].includes(l.type)).reduce((sum, l) => sum + l.balance, 0);
    const totalDebt = liabilitiesList.filter(l => l.type === 'Loans').reduce((sum, l) => sum + l.balance, 0);

    const kpis = {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities + totalEquity, 
      workingCapital: currentAssets - currentLiabilities,
      currentRatio: currentLiabilities > 0 ? (currentAssets / currentLiabilities) : 0,
      debtToEquity: totalEquity > 0 ? (totalDebt / totalEquity) : 0,
      netProfit,
      opex: totalExpense,
      capex: totalCapex
    };

    return NextResponse.json({
      assets: assetsList,
      liabilities: liabilitiesList,
      kpis,
      detailedTransactions
    });
  } catch (error: any) {
    console.error("Error in P&L Balance Sheet API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
