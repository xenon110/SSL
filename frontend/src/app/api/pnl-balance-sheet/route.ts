import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { cookies } from 'next/headers';
import { supabase, fetchAllData } from '@/lib/supabase';

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

    const tallyStartDate = startDate.replace(/-/g, '');
    const tallyEndDate = endDate.replace(/-/g, '');

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    const companyName = decodeURIComponent(activeCompany);
    
    const tallyUrl = process.env.TALLY_URL || 'http://localhost:9000';

    // ─── Helper: post XML to Tally ───────────────────────────────────────────
    const tallyPost = async (xml: string) => {
      const res = await fetch(tallyUrl, {
        method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: xml
      });
      return await res.text();
    };

    // ─── 1. Fetch Balance Sheet from Tally ───────────────────────────────────
    const bsXml = `<ENVELOPE>
      <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
      <BODY><EXPORTDATA><REQUESTDESC>
        <REPORTNAME>Balance Sheet</REPORTNAME>
        <STATICVARIABLES>
          <SVCOMPANY>${companyName}</SVCOMPANY>
          <SVFROMDATE>${tallyStartDate}</SVFROMDATE>
          <SVTODATE>${tallyEndDate}</SVTODATE>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
        </STATICVARIABLES>
      </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    const bsXmlStr = await tallyPost(bsXml);
    const parser = new XMLParser({ ignoreAttributes: true });
    const bsObj = parser.parse(bsXmlStr);

    if (!bsObj?.ENVELOPE?.BSNAME || !bsObj?.ENVELOPE?.BSAMT) {
      return NextResponse.json(getEmptyBalanceSheetState());
    }

    const names = Array.isArray(bsObj.ENVELOPE.BSNAME) ? bsObj.ENVELOPE.BSNAME : [bsObj.ENVELOPE.BSNAME];
    const amts  = Array.isArray(bsObj.ENVELOPE.BSAMT)  ? bsObj.ENVELOPE.BSAMT  : [bsObj.ENVELOPE.BSAMT];

    let currentSection: 'LIABILITIES' | 'ASSETS' = 'LIABILITIES';
    let currentPrimaryGroup = 'Unknown';
    const liabilitiesList: any[] = [];
    const assetsList: any[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let netProfit = 0;

    const primaryGroupHeaders = [
      'capital account', 'loans (liability)', 'current liabilities',
      'suspense a/c', 'branch / divisions', 'fixed assets',
      'current assets', 'investments', 'misc. expenses (asset)'
    ];

    for (let i = 0; i < names.length; i++) {
      const dispName  = names[i]?.DSPACCNAME?.DSPDISPNAME || 'Unknown';
      const mainAmtRaw = amts[i]?.BSMAINAMT;
      const subAmtRaw  = amts[i]?.BSSUBAMT;

      if (mainAmtRaw !== undefined && mainAmtRaw !== '') {
        currentPrimaryGroup = dispName;
        const lower = dispName.toLowerCase();
        if (['capital account','loans (liability)','current liabilities','suspense a/c','branch / divisions'].includes(lower)) {
          currentSection = 'LIABILITIES';
        } else if (['fixed assets','current assets','investments','misc. expenses (asset)'].includes(lower)) {
          currentSection = 'ASSETS';
        } else if (lower.includes('profit & loss')) {
          currentSection = Number(mainAmtRaw) >= 0 ? 'LIABILITIES' : 'ASSETS';
        }
      }

      const amtStr = (mainAmtRaw !== undefined && mainAmtRaw !== '') ? mainAmtRaw : subAmtRaw;
      const amt = currentSection === 'ASSETS' ? -(Number(amtStr) || 0) : (Number(amtStr) || 0);

      if (dispName.toLowerCase().includes('profit & loss')) netProfit = amt;
      if (amt === 0) continue;

      if (mainAmtRaw !== undefined && mainAmtRaw !== '') {
        if (currentSection === 'LIABILITIES') totalLiabilities += amt;
        else totalAssets += amt;
      }

      if (primaryGroupHeaders.includes(dispName.toLowerCase())) continue;

      const item = {
        name: dispName,
        category: currentSection === 'LIABILITIES' ? 'LIABILITY' : 'ASSET',
        type: currentPrimaryGroup,
        balance: amt,
        count: 1,
        opening: 0
      };
      if (currentSection === 'LIABILITIES') liabilitiesList.push(item);
      else assetsList.push(item);
    }

    const currentAssets = assetsList.filter(a => a.type.toLowerCase().includes('current assets')).reduce((s, a) => s + a.balance, 0);
    const currentLiabilities = liabilitiesList.filter(l => l.type.toLowerCase().includes('current liabilities')).reduce((s, l) => s + l.balance, 0);
    const totalEquity = liabilitiesList.filter(l => l.type === 'Capital Account').reduce((s, l) => s + l.balance, 0);
    const totalDebt = liabilitiesList.filter(l => l.type.toLowerCase().includes('loans')).reduce((s, l) => s + l.balance, 0);

    // ─── 2. Fetch P&L from Tally to get OPEX/CAPEX/breakdown ─────────────────
    const pnlXml = `<ENVELOPE>
      <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
      <BODY><EXPORTDATA><REQUESTDESC>
        <REPORTNAME>Profit and Loss</REPORTNAME>
        <STATICVARIABLES>
          <SVCOMPANY>${companyName}</SVCOMPANY>
          <SVFROMDATE>${tallyStartDate}</SVFROMDATE>
          <SVTODATE>${tallyEndDate}</SVTODATE>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
        </STATICVARIABLES>
      </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;

    const pnlXmlStr = await tallyPost(pnlXml);

    const pnlObj = parser.parse(pnlXmlStr);
    
    const pnlIncomes: any[] = [];
    const pnlExpenses: any[] = [];
    let opex = 0;
    let capex = 0;

    try {
      const nameMatches = [...pnlXmlStr.matchAll(/<DSPDISPNAME>([^<]+)<\/DSPDISPNAME>/g)];
      const mainAmtMatches = [...pnlXmlStr.matchAll(/<BSMAINAMT>([^<]*)<\/BSMAINAMT>/g)];

      const pnlTopGroups = [
        'Sales Accounts', 'Direct Incomes', 'Indirect Incomes',
        'Cost of Sales :', 'Direct Expenses', 'Indirect Expenses'
      ];

      let inIncome = true;
      let currentPnlTopGroup = '';

      for (let i = 0; i < nameMatches.length && i < mainAmtMatches.length; i++) {
        const nm = nameMatches[i][1].replace(/&amp;/g, '&').trim();
        const mainAmt = parseFloat(mainAmtMatches[i][1]) || 0;

        if (nm === 'Sales Accounts' || nm === 'Direct Incomes' || nm === 'Indirect Incomes') {
          inIncome = true;
          currentPnlTopGroup = nm;
        } else if (nm.includes('Cost of Sales') || nm === 'Direct Expenses' || nm === 'Indirect Expenses') {
          inIncome = false;
          currentPnlTopGroup = nm;
        }

        if (nm === 'Indirect Expenses' && mainAmt !== 0) {
          opex = Math.abs(mainAmt);
        }
      }

      const allPnlNames = [...pnlXmlStr.matchAll(/<DSPDISPNAME>([^<]+)<\/DSPDISPNAME>/g)].map(m => m[1].replace(/&amp;/g, '&').trim());
      const allPnlSubAmts = [...pnlXmlStr.matchAll(/<(?:BSSUBAMT|PLSUBAMT)>([^<]*)<\/(?:BSSUBAMT|PLSUBAMT)>/g)].map(m => parseFloat(m[1]) || 0);
      const allPnlMainAmts = [...pnlXmlStr.matchAll(/<BSMAINAMT>([^<]*)<\/BSMAINAMT>/g)].map(m => parseFloat(m[1]) || 0);

      let pnlSection = 'income';
      for (let i = 0; i < allPnlNames.length; i++) {
        const nm = allPnlNames[i];
        const mainAmt = allPnlMainAmts[i] ?? 0;
        const subAmt = allPnlSubAmts[i] ?? 0;
        const displayAmt = mainAmt !== 0 ? mainAmt : subAmt;

        if (nm === 'Sales Accounts' || nm === 'Direct Incomes' || nm === 'Indirect Incomes') {
          pnlSection = 'income';
        } else if (nm.includes('Cost of Sales') || nm === 'Direct Expenses' || nm === 'Indirect Expenses') {
          pnlSection = 'expense';
        }

        if (displayAmt === 0) continue;

        const entry = { name: nm, amount: Math.abs(displayAmt), isGroup: mainAmt !== 0 };
        if (pnlSection === 'income') pnlIncomes.push(entry);
        else pnlExpenses.push(entry);
      }

    } catch (pnlErr) {
      console.error('Error parsing P&L:', pnlErr);
    }

    const fixedAssets = assetsList.filter(a => a.type === 'Fixed Assets');
    capex = fixedAssets.reduce((s, a) => s + Math.max(0, a.balance), 0);

    // ─── 3. Fetch detailed transactions from Supabase ────────────────────────
    let detailedTransactions: any[] = [];

    let companyIds: string[] = [];
    const baseNameMatch = companyName.match(/^(.*?)\s*-\s*\(from/);
    const baseName = baseNameMatch ? baseNameMatch[1].trim() : companyName;

    const { data: relatedComps } = await supabase.from('companies').select('id').ilike('name', `${baseName}%`);
    if (relatedComps && relatedComps.length > 0) {
      companyIds = relatedComps.map(c => c.id);
    } else {
      const { data: fallback } = await supabase.from('companies').select('id').ilike('name', 'SMRIDHI SPONGE LIMITED%');
      if (fallback && fallback.length > 0) {
        companyIds = fallback.map(c => c.id);
      }
    }

    if (companyIds.length > 0) {
      try {
        // ── Build group hierarchy from Tally directly using regex ────────────
        const groupMap = new Map<string, string>();
        try {
          const groupsXmlStr = await tallyPost(`<ENVELOPE>
            <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
            <BODY><EXPORTDATA><REQUESTDESC>
              <REPORTNAME>List of Accounts</REPORTNAME>
              <STATICVARIABLES>
                <SVCOMPANY>${companyName}</SVCOMPANY>
                <ACCOUNTTYPE>Groups</ACCOUNTTYPE>
              </STATICVARIABLES>
            </REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`);

          const matches = [...groupsXmlStr.matchAll(/<GROUP\s+NAME="([^"]+)"[^>]*>[\s\S]*?<PARENT>([^<]+)<\/PARENT>/g)];
          matches.forEach(m => {
            const name   = m[1].replace(/&amp;/g, '&').trim();
            const parent = m[2].replace(/&amp;/g, '&').trim();
            groupMap.set(name, parent);
          });
        } catch (gErr) {
          console.error('Error fetching groups:', gErr);
        }

        // ── Helper: resolve root accounting class ────────────────────────────
        const ASSET_ROOTS    = ['current assets', 'fixed assets', 'investments', 'misc. expenses (asset)'];
        const LIAB_ROOTS     = ['capital account', 'loans (liability)', 'current liabilities', 'suspense a/c', 'branch / divisions'];
        const INCOME_ROOTS   = ['sales accounts', 'direct incomes', 'indirect incomes'];
        const EXPENSE_ROOTS  = [
          'purchase accounts', 'direct expenses', 'indirect expenses', 'misc. expenses', 'staff welfare expenses',
          'salary', 'wages', 'travelling & coneyance', 'printing & stationery', 'rent, rates & taxes',
          'repair & maintenance', 'director remuneration', 'finance cost', 'bank charges', 'consultancy & legal',
          'kolkata office exp', 'drc-03 tax', 'drc-03 int', 'drc-03 penalty'
        ];

        const resolveClass = (groupName: string): { cat: string; typ: string; path: string[] } => {
          const path: string[] = [];
          let curr = groupName;
          for (let d = 0; d < 25; d++) {
            if (!curr) break;
            const lower = curr.toLowerCase();
            path.push(curr);
            if (ASSET_ROOTS.includes(lower))   return { cat: 'ASSET',     typ: curr, path };
            if (LIAB_ROOTS.includes(lower))    return { cat: 'LIABILITY', typ: curr, path };
            if (INCOME_ROOTS.includes(lower))  return { cat: 'PNL',       typ: 'INCOME',  path };
            if (EXPENSE_ROOTS.includes(lower)) return { cat: 'PNL',       typ: 'EXPENSE', path };
            curr = groupMap.get(curr) || '';
          }
          return { cat: 'UNKNOWN', typ: 'UNKNOWN', path };
        };

        // ── Build ledger→class map using fetchAllData to bypass 1000-row limit ────
        const { data: ledgers } = await fetchAllData(
          supabase.from('ledgers').select('name, parent_group').in('company_id', companyIds)
        );

        const ledgerClassMap = new Map<string, { cat: string; typ: string; path: string[] }>();
        (ledgers || []).forEach((l: any) => {
          ledgerClassMap.set(l.name, resolveClass(l.parent_group));
        });

        // ── Fetch all vouchers in date range using fetchAllData ─────────────────
        const { data: vouchers } = await fetchAllData(
          supabase.from('vouchers').select('id, date, voucher_type')
            .in('company_id', companyIds)
            .gte('date', startDate).lte('date', endDate)
            .eq('is_deleted', false).eq('is_cancelled', false).eq('is_optional', false)
        );

        if (vouchers && vouchers.length > 0) {
          const voucherIds = vouchers.map((v: any) => v.id);
          const voucherMeta = new Map(vouchers.map((v: any) => [v.id, { date: v.date, type: v.voucher_type }]));

          const chunk = (arr: any[], n: number) =>
            Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

          let allLedgerTx: any[] = [];
          let allInvTx: any[] = [];

          for (const ids of chunk(voucherIds, 150)) {
            const { data: lTx } = await fetchAllData(
              supabase.from('voucher_ledgers')
                .select('voucher_id, ledger_name, amount, is_debit').in('voucher_id', ids)
            );
            if (lTx) allLedgerTx.push(...lTx);

            const { data: iTx } = await fetchAllData(
              supabase.from('voucher_inventory')
                .select('voucher_id, stock_item_name, billed_qty, rate, amount').in('voucher_id', ids)
            );
            if (iTx) allInvTx.push(...iTx);
          }

          // Index inventory & full ledgers by voucher_id
          const invByVoucher   = new Map<string, any[]>();
          const ledgsByVoucher = new Map<string, any[]>();

          allInvTx.forEach((tx: any) => {
            if (!invByVoucher.has(tx.voucher_id)) invByVoucher.set(tx.voucher_id, []);
            invByVoucher.get(tx.voucher_id)!.push(tx);
          });
          allLedgerTx.forEach((tx: any) => {
            if (!ledgsByVoucher.has(tx.voucher_id)) ledgsByVoucher.set(tx.voucher_id, []);
            ledgsByVoucher.get(tx.voucher_id)!.push(tx);
          });

          // ── Build detailedTransactions ───────────────────────────────────
          allLedgerTx.forEach((tx: any) => {
            const cls = ledgerClassMap.get(tx.ledger_name);
            if (!cls || cls.cat === 'UNKNOWN') return;

            const meta = voucherMeta.get(tx.voucher_id);
            if (!meta) return;

            // Determine signed value (debit = positive for assets/expenses)
            let signedAmt = tx.amount;
            if (cls.cat === 'ASSET' || cls.cat === 'PNL') {
              signedAmt = tx.is_debit ? tx.amount : -tx.amount;
            } else {
              signedAmt = tx.is_debit ? -tx.amount : tx.amount;
            }

            detailedTransactions.push({
              id:          tx.voucher_id,
              date:        meta.date,
              voucherType: meta.type || '',
              ledger:      tx.ledger_name,
              amount:      Math.abs(signedAmt),
              type:        cls.cat,
              rootGroup:   cls.typ,
              parentPath:  cls.path,
              items: (invByVoucher.get(tx.voucher_id) || []).map((inv: any) => ({
                product: inv.stock_item_name || 'Unknown',
                qty:     inv.billed_qty || 0,
                rate:    inv.rate || 0,
                amount:  inv.amount || 0
              })),
              ledgers: (ledgsByVoucher.get(tx.voucher_id) || []).map((l: any) => ({
                name:     l.ledger_name,
                amount:   Number(l.amount) || 0,
                is_debit: l.is_debit
              }))
            });
          });

          // ── Recalculate OPEX & CAPEX from classified transactions ────────
          let txOpex = 0;
          let txCapex = 0;
          detailedTransactions.forEach(tx => {
            if (tx.type === 'PNL' && tx.rootGroup === 'EXPENSE') txOpex += tx.amount;
            if (tx.type === 'ASSET' && tx.parentPath?.includes('Fixed Assets')) txCapex += tx.amount;
          });

          if (txOpex > 0) opex = txOpex;
          if (txCapex > 0) capex = txCapex;
        }
      } catch (dbErr) {
        console.error('Error building detailed transactions:', dbErr);
      }
    }

    const kpis = {
      totalAssets,
      totalLiabilities,
      netWorth:       totalEquity + netProfit,
      workingCapital: currentAssets - currentLiabilities,
      currentRatio:   currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
      debtToEquity:   totalEquity > 0 ? totalDebt / totalEquity : 0,
      netProfit,
      opex,
      capex
    };

    return NextResponse.json({
      kpis,
      assets:      assetsList.sort((a, b) => b.balance - a.balance),
      liabilities: liabilitiesList.sort((a, b) => b.balance - a.balance),
      pnlGroups:   { incomes: pnlIncomes, expenses: pnlExpenses },
      detailedTransactions: detailedTransactions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    });

  } catch (error: any) {
    console.error('Error generating Balance Sheet:', error);
    return NextResponse.json(getEmptyBalanceSheetState());
  }
}

export const runtime = 'edge';
