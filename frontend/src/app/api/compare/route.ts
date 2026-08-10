import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Factor keys exactly as specified in the prompt
const FACTORS = [
  'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10', 
  'K11', 'K12', 'K13', 'K14', 'K15', 'K16', 'K17', 'K18', 'K19', 
  'K20', 'K21', 'K22', 'K23', 'K24', 'K25', 'K26', 'K27'
];

const getEmptyPeriodStats = (days: number) => {
  const stats: any = {};
  FACTORS.forEach(k => stats[k] = 0);
  return { stats, drivers: { topSalesProd: [], topSalesCust: [], topExpenses: [] }, days, trend: Array(days).fill(0) };
};

const getEmptyCompareState = (daysA: number, daysB: number) => {
  const deltas: any = {};
  FACTORS.forEach(k => deltas[k] = { abs: 0, perc: 0 });
  return { periodA: getEmptyPeriodStats(daysA), periodB: getEmptyPeriodStats(daysB), deltas, insights: [] };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const aStart = searchParams.get('aStart');
    const aEnd = searchParams.get('aEnd');
    const bStart = searchParams.get('bStart');
    const bEnd = searchParams.get('bEnd');
    
    if (!aStart || !aEnd || !bStart || !bEnd) {
      return NextResponse.json({ error: 'Missing period boundaries' }, { status: 400 });
    }

    const ts_aStart = new Date(aStart).getTime();
    const ts_aEnd = new Date(aEnd).getTime();
    const ts_bStart = new Date(bStart).getTime();
    const ts_bEnd = new Date(bEnd).getTime();

    const daysA = Math.max(1, Math.round((ts_aEnd - ts_aStart) / (1000 * 3600 * 24)) + 1);
    const daysB = Math.max(1, Math.round((ts_bEnd - ts_bStart) / (1000 * 3600 * 24)) + 1);

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
        return NextResponse.json(getEmptyCompareState(daysA, daysB));
      }
    }

    // 1. Fetch ledgers and groups to classify everything
    const [{ data: groups }, { data: ledgers }, { data: stockItems }] = await Promise.all([
      supabase.from('groups').select('name, parent'),
      supabase.from('ledgers').select('*').eq('company_id', companyId),
      supabase.from('stock_items').select('*').eq('company_id', companyId)
    ]);

    const groupMap = new Map((groups || []).map(g => [g.name ? g.name.toLowerCase().trim() : '', g.parent ? g.parent.toLowerCase().trim() : '']));
    const ledgerMap = new Map((ledgers || []).map(l => [l.name ? l.name.toLowerCase().trim() : '', l]));

    // Hierarchy resolver
    const resolveRoot = (groupName: string, targets: string[]) => {
      let current = (groupName || '').trim();
      let depth = 0;
      const targetLowers = targets.map(t => t.toLowerCase().trim());
      while (current && depth < 20) {
        const curLower = current.toLowerCase();
        if (targetLowers.includes(curLower)) {
          return targets[targetLowers.indexOf(curLower)];
        }
        current = groupMap.get(curLower) || '';
        depth++;
      }
      return null;
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const minStart = new Date(Math.min(ts_aStart, ts_bStart)).toISOString().split('T')[0];

    // Fetch vouchers
    const { data: vouchers, error } = await supabase
      .from('vouchers')
      .select('*, voucher_ledgers(*), voucher_inventory(*)')
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .eq('is_cancelled', false)
      .eq('is_optional', false)
      .gte('date', minStart)
      .lte('date', todayStr); // fetch up to today

    if (error) throw error;

    // Fetch Outstandings (snapshot)
    const { data: outstandings } = await supabase
      .from('outstanding_bills')
      .select('*')
      .eq('company_name', decodedName);

    // Compute Engine
    const computePeriod = (start: number, end: number, days: number) => {
      const stats = {
        K1: 0, K2: 0, K3: 0, K4: 0, K5: 0, K6: 0, K7: 0, K8: 0, K9: 0, K10: 0,
        K11: 0, K12: 0, K13: 0, K14: 0, K15: 0, K16: 0, K17: 0, K18: 0, K19: 0,
        K20: 0, K21: 0, K22: 0, K23: 0, K24: 0, K25: 0, K26: 0, K27: 0
      };

      const drivers = {
        salesByProduct: {} as Record<string, number>,
        salesByCustomer: {} as Record<string, number>,
        expensesByLedger: {} as Record<string, number>
      };
      const dailyData: Record<number, number> = {};

      vouchers?.forEach(v => {
        const vTime = new Date(v.date).getTime();
        const inPeriod = vTime >= start && vTime <= end;
        
        // Flow Metrics
        if (inPeriod) {
          const type = v.voucher_type_name;
          
          if (type === 'Receipt') stats.K16 += v.amount;
          else if (type === 'Payment') stats.K17 += v.amount;

          v.voucher_ledgers?.forEach((vl: any) => {
            const lInfo = ledgerMap.get(vl.ledger_name ? vl.ledger_name.toLowerCase().trim() : '');
            if (!lInfo) return;
            const root = resolveRoot(lInfo.parent_group, [
              'Sales Accounts', 'Purchase Accounts', 'Direct Incomes', 
              'Indirect Incomes', 'Direct Expenses', 'Indirect Expenses',
              'Sundry Debtors'
            ]);

            if (type === 'Sales' && root === 'Sales Accounts') {
              stats.K1 += vl.amount;
              const dayIdx = Math.floor((vTime - start) / (1000 * 3600 * 24));
              dailyData[dayIdx] = (dailyData[dayIdx] || 0) + vl.amount;
            } else if (type === 'Credit Note' && root === 'Sales Accounts') {
              stats.K2 += vl.amount;
            } else if (type === 'Purchase' && root === 'Purchase Accounts') {
              stats.K6 += vl.amount;
            } else if (type === 'Debit Note' && root === 'Purchase Accounts') {
              stats.K7 += vl.amount;
            } else if (root === 'Direct Incomes') {
              stats.K8 += vl.amount;
            } else if (root === 'Indirect Incomes') {
              stats.K9 += vl.amount;
            } else if (root === 'Direct Expenses') {
              stats.K10 += vl.amount;
              drivers.expensesByLedger[vl.ledger_name] = (drivers.expensesByLedger[vl.ledger_name] || 0) + vl.amount;
            } else if (root === 'Indirect Expenses') {
              stats.K11 += vl.amount;
              drivers.expensesByLedger[vl.ledger_name] = (drivers.expensesByLedger[vl.ledger_name] || 0) + vl.amount;
            }

            if (type === 'Sales' && root === 'Sundry Debtors') {
              drivers.salesByCustomer[vl.ledger_name] = (drivers.salesByCustomer[vl.ledger_name] || 0) + vl.amount;
            }
          });

          v.voucher_inventory?.forEach((vi: any) => {
            if (type === 'Sales' && !vi.is_inward) {
              drivers.salesByProduct[vi.stock_item_name] = (drivers.salesByProduct[vi.stock_item_name] || 0) + vi.amount;
            }
            if (type === 'Manufacturing Journal') {
              if (vi.is_inward) stats.K21 += vi.actual_qty; // Production qty
              else stats.K22 += vi.amount; // RM consumed
            }
          });
        }
      });

      stats.K3 = stats.K1 - stats.K2; // Net Sales
      stats.K13 = stats.K3 - stats.K14; // Gross Profit (approx without full COGS)
      stats.K15 = stats.K13 + stats.K8 + stats.K9 - stats.K11; // Net Profit approximation

      let cashBankCurrent = 0;
      let stockCurrent = 0;

      ledgers?.forEach(l => {
        const root = resolveRoot(l.parent_group, ['Cash-in-Hand', 'Bank Accounts']);
        if (root) cashBankCurrent += Number(l.closing_balance || 0);
      });
      stockItems?.forEach(s => {
        stockCurrent += Number(s.closing_balance_value || 0);
      });

      stats.K18 = cashBankCurrent;
      stats.K19 = stockCurrent;

      outstandings?.forEach(o => {
        const amt = Number(o.pending_amount) || 0;
        const dueTime = new Date(o.due_date).getTime();
        if (o.party_group === 'receivable') {
          if (amt > 0) stats.K23 += amt;
          if (dueTime < end && amt > 0) stats.K25 += amt;
        } else if (o.party_group === 'payable') {
          if (amt > 0) stats.K24 += amt;
        }
      });

      const topSalesProd = Object.entries(drivers.salesByProduct).sort((a,b) => b[1] - a[1]).slice(0, 5);
      const topSalesCust = Object.entries(drivers.salesByCustomer).sort((a,b) => b[1] - a[1]).slice(0, 5);
      const topExpenses = Object.entries(drivers.expensesByLedger).sort((a,b) => b[1] - a[1]).slice(0, 5);

      const trend = Array.from({ length: days }).map((_, i) => dailyData[i] || 0);

      return { stats, drivers: { topSalesProd, topSalesCust, topExpenses }, days, trend };
    };

    const periodA = computePeriod(ts_aStart, ts_aEnd, daysA);
    const periodB = computePeriod(ts_bStart, ts_bEnd, daysB);

    const deltas: Record<string, { abs: number, perc: number }> = {};
    FACTORS.forEach(k => {
      const a = (periodA.stats as any)[k] || 0;
      const b = (periodB.stats as any)[k] || 0;
      const abs = a - b;
      const perc = b === 0 ? (a === 0 ? 0 : 100) : (abs / Math.abs(b)) * 100;
      deltas[k] = { abs, perc };
    });

    const insights: any[] = [];
    if (Math.abs(deltas.K3.perc) > 10) {
      insights.push({
        metric: 'Net Sales',
        rule: 'Changed by > 10%',
        description: `Net Sales moved from ₹${periodB.stats.K3} to ₹${periodA.stats.K3} (${deltas.K3.perc > 0 ? '+' : ''}${deltas.K3.perc.toFixed(1)}%).`,
        type: deltas.K3.perc > 0 ? 'positive' : 'negative'
      });
    }

    if (periodA.stats.K17 > 0 && periodB.stats.K17 > 0) {
      if (deltas.K17.perc > deltas.K16.perc + 5) {
        insights.push({
          metric: 'Liquidity Caution',
          rule: 'Cash outflow grew faster than inflow',
          description: `Cash outflow grew by ${deltas.K17.perc.toFixed(1)}% while inflow only changed by ${deltas.K16.perc.toFixed(1)}%.`,
          type: 'warning'
        });
      }
    }

    if (deltas.K23.abs > 0 && deltas.K3.abs < 0) {
      insights.push({
        metric: 'Collections Warning',
        rule: 'Receivables grew while sales fell',
        description: `Receivables increased by ₹${deltas.K23.abs} despite a drop in sales. Follow up on overdue accounts.`,
        type: 'warning'
      });
    }

    return NextResponse.json({
      periodA,
      periodB,
      deltas,
      insights
    });

  } catch (error: any) {
    console.error('Compare API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const runtime = 'edge';
