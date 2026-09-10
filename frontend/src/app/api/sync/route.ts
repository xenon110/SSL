import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';

const TALLY_URL = process.env.TALLY_URL || 'http://localhost:9000';

// ─── XML Helpers ────────────────────────────────────────────────
function cleanXml(xml: string): string {
  // Remove control characters except tab, newline, carriage return
  let cleaned = xml.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, '');
  // Fix Tally's UDF namespace
  if (cleaned.includes('UDF:') && !cleaned.includes('xmlns:UDF')) {
    cleaned = cleaned.replace('<ENVELOPE>', '<ENVELOPE xmlns:UDF="TallyUDF">');
  }
  return cleaned;
}

function cleanNumber(str: string | null | undefined): number {
  if (!str || !str.trim()) return 0;
  const cleaned = str.split('/')[0].split(' ')[0].replace(/[^0-9.\-]/g, '');
  return cleaned ? parseFloat(cleaned) : 0;
}

function findText(node: Element, tag: string): string | null {
  const el = node.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() || null;
}

function findAll(node: Element | Document, tag: string): Element[] {
  return Array.from(node.getElementsByTagName(tag));
}

// ─── TDL XML Templates ─────────────────────────────────────────
function buildLedgersXml(companyName: string): string {
  return `<ENVELOPE>
    <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>AllLedgers</ID></HEADER>
    <BODY><DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL><TDLMESSAGE>
        <COLLECTION NAME="AllLedgers" ISINITIALIZE="Yes">
          <TYPE>Ledger</TYPE>
          <FETCH>NAME, PARENT, GUID, OPENINGBALANCE, CLOSINGBALANCE, ISDEEMEDPOSITIVE, GSTREGISTRATIONTYPE, PARTYGSTIN, LEDSTATENAME, LEDGERMOBILE, LEDGERCONTACT, EMAIL, CREDITDAYS, ALTERID</FETCH>
        </COLLECTION>
      </TDLMESSAGE></TDL>
    </DESC></BODY>
  </ENVELOPE>`;
}

function buildVouchersXml(companyName: string, fromDate: string, toDate: string): string {
  return `<ENVELOPE>
    <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>AllVouchers</ID></HEADER>
    <BODY><DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>
      </STATICVARIABLES>
      <TDL><TDLMESSAGE>
        <COLLECTION NAME="AllVouchers" ISINITIALIZE="Yes">
          <TYPE>Voucher</TYPE>
          <FETCH>DATE, GUID, VOUCHERTYPENAME, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT, NARRATION, REFERENCE, ISCANCELLED, ISOPTIONAL, ISDELETED, ALTERID</FETCH>
          <FETCH>ALLLEDGERENTRIES.LIST.LEDGERNAME, ALLLEDGERENTRIES.LIST.AMOUNT, ALLLEDGERENTRIES.LIST.ISDEEMEDPOSITIVE</FETCH>
          <FETCH>INVENTORYENTRIES.LIST.STOCKITEMNAME, INVENTORYENTRIES.LIST.BILLEDQTY, INVENTORYENTRIES.LIST.RATE, INVENTORYENTRIES.LIST.AMOUNT, INVENTORYENTRIES.LIST.ACTUALQTY</FETCH>
          <FETCH>ALLINVENTORYENTRIES.LIST.STOCKITEMNAME, ALLINVENTORYENTRIES.LIST.BILLEDQTY, ALLINVENTORYENTRIES.LIST.RATE, ALLINVENTORYENTRIES.LIST.AMOUNT, ALLINVENTORYENTRIES.LIST.ACTUALQTY</FETCH>
          <FETCH>LEDGERENTRIES.LIST.LEDGERNAME, LEDGERENTRIES.LIST.AMOUNT, LEDGERENTRIES.LIST.ISDEEMEDPOSITIVE</FETCH>
        </COLLECTION>
      </TDLMESSAGE></TDL>
    </DESC></BODY>
  </ENVELOPE>`;
}

function buildStockItemsXml(companyName: string): string {
  return `<ENVELOPE>
    <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>AllStockItems</ID></HEADER>
    <BODY><DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL><TDLMESSAGE>
        <COLLECTION NAME="AllStockItems" ISINITIALIZE="Yes">
          <TYPE>StockItem</TYPE>
          <FETCH>NAME, PARENT, GUID, BASEUNITS, OPENINGBALANCE, OPENINGVALUE, CLOSINGBALANCE, CLOSINGVALUE, ALTERID</FETCH>
        </COLLECTION>
      </TDLMESSAGE></TDL>
    </DESC></BODY>
  </ENVELOPE>`;
}

function buildOutstandingsXml(companyName: string, reportType: 'Receivables' | 'Payables'): string {
  const reportName = reportType === 'Receivables' ? 'Bills Receivable' : 'Bills Payable';
  return `<ENVELOPE>
    <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
    <BODY><EXPORTDATA><REQUESTDESC>
      <REPORTNAME>${reportName}</REPORTNAME>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </REQUESTDESC></EXPORTDATA></BODY>
  </ENVELOPE>`;
}

// ─── XML Parsers ────────────────────────────────────────────────
function parseLedgers(xml: string): any[] {
  const ledgers: any[] = [];
  try {
    const cleaned = cleanXml(xml);
    // Use regex-based parsing since we don't have DOMParser in Node.js edge runtime
    const ledgerRegex = /<LEDGER\s+NAME="([^"]*)"[^>]*>([\s\S]*?)<\/LEDGER>/g;
    let match;
    while ((match = ledgerRegex.exec(cleaned)) !== null) {
      const name = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const block = match[2];
      
      const getText = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
        return m ? m[1].replace(/&amp;/g, '&').trim() : null;
      };

      const guid = getText('GUID') || `ledger-${name}`;
      
      ledgers.push({
        name,
        parent_group: getText('PARENT'),
        tally_guid: guid,
        opening_balance: cleanNumber(getText('OPENINGBALANCE')),
        closing_balance: cleanNumber(getText('CLOSINGBALANCE')),
        gstin: getText('PARTYGSTIN'),
        state: getText('LEDSTATENAME'),
        phone: getText('LEDGERMOBILE') || getText('LEDGERPHONE'),
        contact_person: getText('LEDGERCONTACT'),
        email: getText('EMAIL'),
      });
    }
  } catch (e) {
    console.error('Failed to parse ledgers:', e);
  }
  return ledgers;
}

function parseStockItems(xml: string): any[] {
  const items: any[] = [];
  try {
    const cleaned = cleanXml(xml);
    const itemRegex = /<STOCKITEM\s+NAME="([^"]*)"[^>]*>([\s\S]*?)<\/STOCKITEM>/g;
    let match;
    while ((match = itemRegex.exec(cleaned)) !== null) {
      const name = match[1].replace(/&amp;/g, '&');
      const block = match[2];
      const getText = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
        return m ? m[1].replace(/&amp;/g, '&').trim() : null;
      };

      items.push({
        name,
        parent_group: getText('PARENT'),
        tally_guid: getText('GUID') || `stockitem-${name}`,
        base_units: getText('BASEUNITS') || 'nos',
        opening_balance_qty: cleanNumber(getText('OPENINGBALANCE')),
        opening_balance_value: cleanNumber(getText('OPENINGVALUE')),
      });
    }
  } catch (e) {
    console.error('Failed to parse stock items:', e);
  }
  return items;
}

function parseVouchers(xml: string): any[] {
  const vouchers: any[] = [];
  try {
    const cleaned = cleanXml(xml);
    const voucherRegex = /<VOUCHER\s[^>]*>([\s\S]*?)<\/VOUCHER>/g;
    let match;
    while ((match = voucherRegex.exec(cleaned)) !== null) {
      const block = match[0];
      const inner = match[1];
      
      const getText = (tag: string) => {
        const m = inner.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
        return m ? m[1].replace(/&amp;/g, '&').trim() : null;
      };
      
      const rawDate = getText('DATE');
      if (!rawDate) continue;
      const formattedDate = rawDate.length >= 8 
        ? `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`
        : rawDate;

      const guid = getText('GUID') || '';
      const voucherType = getText('VOUCHERTYPENAME') || 'Unknown';
      const party = getText('PARTYLEDGERNAME');
      
      // Parse ledger entries
      const ledgers: any[] = [];
      let totalAmount = 0;
      const ledgerEntryRegex = /<(?:ALLLEDGERENTRIES|LEDGERENTRIES)\.LIST[^>]*>([\s\S]*?)<\/(?:ALLLEDGERENTRIES|LEDGERENTRIES)\.LIST>/g;
      let ledgerMatch;
      let isFirst = true;
      while ((ledgerMatch = ledgerEntryRegex.exec(inner)) !== null) {
        const lBlock = ledgerMatch[1];
        const lName = lBlock.match(/<LEDGERNAME[^>]*>([^<]*)<\/LEDGERNAME>/)?.[1]?.replace(/&amp;/g, '&').trim() || '';
        const lAmtStr = lBlock.match(/<AMOUNT[^>]*>([^<]*)<\/AMOUNT>/)?.[1] || '0';
        const lAmt = cleanNumber(lAmtStr);
        const isDebit = lAmt < 0;
        if (isFirst) { totalAmount = Math.abs(lAmt); isFirst = false; }
        ledgers.push({ ledger_name: lName, amount: Math.abs(lAmt), is_debit: isDebit });
      }

      // Parse inventory entries
      const inventory: any[] = [];
      const invEntryRegex = /<(?:ALLINVENTORYENTRIES|INVENTORYENTRIES)\.LIST[^>]*>([\s\S]*?)<\/(?:ALLINVENTORYENTRIES|INVENTORYENTRIES)\.LIST>/g;
      let invMatch;
      while ((invMatch = invEntryRegex.exec(inner)) !== null) {
        const iBlock = invMatch[1];
        const itemName = iBlock.match(/<STOCKITEMNAME[^>]*>([^<]*)<\/STOCKITEMNAME>/)?.[1]?.replace(/&amp;/g, '&').trim();
        if (!itemName) continue;
        const qty = Math.abs(cleanNumber(iBlock.match(/<BILLEDQTY[^>]*>([^<]*)<\/BILLEDQTY>/)?.[1] || iBlock.match(/<ACTUALQTY[^>]*>([^<]*)<\/ACTUALQTY>/)?.[1]));
        const rate = Math.abs(cleanNumber(iBlock.match(/<RATE[^>]*>([^<]*)<\/RATE>/)?.[1]));
        const iAmt = Math.abs(cleanNumber(iBlock.match(/<AMOUNT[^>]*>([^<]*)<\/AMOUNT>/)?.[1]));
        const vtLower = voucherType.toLowerCase();
        const isInward = vtLower.includes('purchase') || vtLower.includes('receipt') || vtLower.includes('debit note');
        inventory.push({ stock_item_name: itemName, billed_qty: qty, rate, amount: iAmt, is_inward: isInward });
      }

      const voucherAmount = Math.abs(cleanNumber(getText('AMOUNT')));
      const finalParty = party || (ledgers.length > 0 ? ledgers[0].ledger_name : 'Cash');

      vouchers.push({
        tally_guid: guid,
        voucher_type_name: voucherType,
        voucher_number: getText('VOUCHERNUMBER'),
        party_ledger_name: finalParty,
        date: formattedDate,
        amount: voucherAmount > 0 ? voucherAmount : totalAmount,
        narration: getText('NARRATION'),
        reference: getText('REFERENCE'),
        is_cancelled: getText('ISCANCELLED') === 'Yes',
        is_deleted: getText('ISDELETED') === 'Yes',
        is_optional: getText('ISOPTIONAL') === 'Yes',
        entered_by: getText('ENTEREDBY') || '',
        altered_by: getText('ALTEREDBY') || '',
        ledgers,
        inventory,
      });
    }
  } catch (e) {
    console.error('Failed to parse vouchers:', e);
  }
  return vouchers;
}

function parseOutstandings(xml: string, reportType: 'Receivables' | 'Payables'): any[] {
  const bills: any[] = [];
  try {
    const cleaned = cleanXml(xml);
    // Parse BILLFIXED blocks followed by BILLCL/BILLDUE
    const parts = cleaned.split(/<BILLFIXED>/);
    for (let i = 1; i < parts.length; i++) {
      const chunk = parts[i].split(/<BILLFIXED>/)[0]; // everything up to next BILLFIXED
      const billDate = chunk.match(/<BILLDATE>([^<]*)<\/BILLDATE>/)?.[1]?.trim();
      const billRef = chunk.match(/<BILLREF>([^<]*)<\/BILLREF>/)?.[1]?.replace(/&amp;/g, '&').trim();
      const party = chunk.match(/<BILLPARTY>([^<]*)<\/BILLPARTY>/)?.[1]?.replace(/&amp;/g, '&').trim();
      const pendingStr = chunk.match(/<BILLCL>([^<]*)<\/BILLCL>/)?.[1] || '0';
      const dueDate = chunk.match(/<BILLDUE>([^<]*)<\/BILLDUE>/)?.[1]?.trim() || billDate;
      
      if (!billDate || !party) continue;
      
      let pendingAmount = cleanNumber(pendingStr);
      if (reportType === 'Receivables') {
        // Tally exports Receivables (Debits) as negative. Standardize to positive.
        pendingAmount = -pendingAmount;
      }
      
      let billType = 'new_ref';
      if (!billRef || billRef.toLowerCase().trim() === 'on account') {
        billType = 'on_account';
      } else if (pendingAmount < 0) {
        billType = 'advance';
      }

      bills.push({
        party_ledger: party,
        bill_ref: billRef || 'On Account',
        bill_type: billType,
        bill_date: billDate,
        due_date: dueDate,
        pending_amount: pendingAmount,
      });
    }
  } catch (e) {
    console.error('Failed to parse outstandings:', e);
  }
  return bills;
}

// ─── Main Sync Handler ──────────────────────────────────────────
async function fetchFromTally(xmlBody: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout
    
    const response = await fetch(TALLY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xmlBody,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    return await response.text();
  } catch (e) {
    console.error('Tally connection error:', e);
    return null;
  }
}
function parseTallyDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  const parts = cleaned.split('-');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthStr = parts[1].toLowerCase();
    let year = parts[2];
    if (year.length === 2) {
      year = `20${year}`;
    }
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = months[monthStr.substring(0, 3)];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  return cleaned;
}

import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const cookieStore = await cookies();
    const companyName = searchParams.get('company') || cookieStore.get('active-company')?.value;
    
    if (!companyName) {
      return NextResponse.json({ error: 'Missing company parameter' }, { status: 400 });
    }

    const decodedName = decodeURIComponent(companyName);

    // 1. Ensure company exists in Supabase
    let companyId: string;
    const { data: existing } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (existing) {
      companyId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase.from('companies').insert({ name: decodedName }).select('id').single();
      if (createErr || !created) {
        return NextResponse.json({ error: 'Failed to create company record' }, { status: 500 });
      }
      companyId = created.id;
    }

    // 2. Calculate financial year dates
    const today = new Date();
    let fyStartYear: number, fyEndYear: number;
    if (today.getMonth() >= 3) { // April onwards
      fyStartYear = today.getFullYear();
      fyEndYear = today.getFullYear() + 1;
    } else {
      fyStartYear = today.getFullYear() - 1;
      fyEndYear = today.getFullYear();
    }
    let fromDate = `${fyStartYear}0401`;
    let toDate = `${fyEndYear}0331`;

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (startDateParam) {
      // startDateParam is like '2025-04-01' -> '20250401'
      fromDate = startDateParam.replace(/-/g, '');
    }
    if (endDateParam) {
      toDate = endDateParam.replace(/-/g, '');
    }

    const counts = { ledgers: 0, vouchers: 0, stockItems: 0, outstandings: 0 };

    // 3. Fetch & push Ledgers
    const ledgersXml = await fetchFromTally(buildLedgersXml(decodedName));
    if (ledgersXml && !ledgersXml.includes('Unknown Request')) {
      const ledgers = parseLedgers(ledgersXml);
      const batchSize = 200;
      for (let i = 0; i < ledgers.length; i += batchSize) {
        const batch = ledgers.slice(i, i + batchSize).map(l => {
          const cleanGstin = (l.gstin || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 15);
          const cleanPhone = (l.phone || '').trim().slice(0, 15);
          const cleanState = (l.state || '').trim().slice(0, 15);
          const cleanEmail = (l.email || '').trim().slice(0, 100);
          const cleanContact = (l.contact_person || '').trim().slice(0, 100);
          
          return {
            company_id: companyId,
            name: l.name,
            parent_group: l.parent_group,
            tally_guid: l.tally_guid,
            opening_balance: l.opening_balance,
            closing_balance: l.closing_balance,
            gstin: cleanGstin,
            state: cleanState,
            phone: cleanPhone,
            contact_person: cleanContact,
            email: cleanEmail,
          };
        });
        try {
          await supabase.from('ledgers').upsert(batch, { onConflict: 'tally_guid' });
          counts.ledgers += batch.length;
        } catch (e) { /* skip */ }
      }
    }

    // 4. Fetch & push Stock Items
    const stockXml = await fetchFromTally(buildStockItemsXml(decodedName));
    if (stockXml && !stockXml.includes('Unknown Request')) {
      const stockItems = parseStockItems(stockXml);
      const batchSize = 200;
      for (let i = 0; i < stockItems.length; i += batchSize) {
        const batch = stockItems.slice(i, i + batchSize).map(s => ({
          company_id: companyId,
          name: s.name,
          parent_group: s.parent_group,
          tally_guid: s.tally_guid,
          base_units: s.base_units,
          opening_balance_qty: s.opening_balance_qty,
          opening_balance_value: s.opening_balance_value,
        }));
        try {
          await supabase.from('stock_items').upsert(batch, { onConflict: 'tally_guid' });
          counts.stockItems += batch.length;
        } catch (e) { /* skip */ }
      }
    }

    // 5. Fetch & push Vouchers
    const vouchersXml = await fetchFromTally(buildVouchersXml(decodedName, fromDate, toDate));
    if (vouchersXml && !vouchersXml.includes('Unknown Request')) {
      const vouchers = parseVouchers(vouchersXml);
      const vBatchSize = 100;
      for (let i = 0; i < vouchers.length; i += vBatchSize) {
        const batch = vouchers.slice(i, i + vBatchSize);
        const dbBatch = batch.map(v => ({
          company_id: companyId,
          tally_guid: v.tally_guid,
          voucher_type_name: v.voucher_type_name,
          voucher_number: v.voucher_number,
          date: v.date,
          party_ledger_name: v.party_ledger_name,
          amount: v.amount,
          narration: v.narration,
          reference: v.reference,
          is_cancelled: v.is_cancelled,
          is_deleted: v.is_deleted,
          is_optional: v.is_optional,
          entered_by: v.entered_by,
          altered_by: v.altered_by,
          updated_at: new Date().toISOString(),
        }));
        try {
          const vRes = await supabase.from('vouchers').upsert(dbBatch, { onConflict: 'tally_guid' }).select('id, tally_guid');
          if (vRes.error) {
            console.error('Voucher upsert error:', vRes.error);
          }
          if (vRes.data && vRes.data.length > 0) {
            counts.vouchers += vRes.data.length;
            const guidToId = new Map(vRes.data.map(row => [row.tally_guid, row.id]));
            const voucherIdsInBatch = Array.from(guidToId.values());
            
            // Wipe child entries for batch
            if (voucherIdsInBatch.length > 0) {
              await supabase.from('voucher_ledgers').delete().in('voucher_id', voucherIdsInBatch);
              await supabase.from('voucher_inventory').delete().in('voucher_id', voucherIdsInBatch);
            }
            
            const ledgerEntries: any[] = [];
            const inventoryEntries: any[] = [];
            
            for (const v of batch) {
              const vDbId = guidToId.get(v.tally_guid);
              if (!vDbId) continue;
              
              if (v.ledgers.length > 0) {
                (v.ledgers || []).forEach((l: any) => {
                  ledgerEntries.push({ voucher_id: vDbId, ledger_name: l.ledger_name, amount: l.amount, is_debit: l.is_debit });
                });
              }
              if (v.inventory.length > 0) {
                v.inventory.forEach((inv: any) => {
                  inventoryEntries.push({ voucher_id: vDbId, stock_item_name: inv.stock_item_name, billed_qty: inv.billed_qty, actual_qty: inv.billed_qty, rate: inv.rate, amount: inv.amount, is_inward: inv.is_inward });
                });
              }
            }
            
            if (ledgerEntries.length > 0) {
              await supabase.from('voucher_ledgers').insert(ledgerEntries);
            }
            if (inventoryEntries.length > 0) {
              await supabase.from('voucher_inventory').insert(inventoryEntries);
            }
            counts.vouchers += batch.length;
          }
        } catch (e) { /* skip */ }
      }
    }

    // 6. Fetch & push Outstandings
    const todayStr = new Date().toISOString().split('T')[0];
    for (const reportType of ['Receivables', 'Payables'] as const) {
      const outXml = await fetchFromTally(buildOutstandingsXml(decodedName, reportType));
      if (outXml && !outXml.includes('Unknown Request')) {
        const bills = parseOutstandings(outXml, reportType);
        bills.forEach(b => { b.party_group = reportType === 'Receivables' ? 'receivable' : 'payable'; });
        
        if (bills.length > 0) {
          // Wipe existing for this company + group
          await supabase.from('outstanding_bills').delete()
            .eq('company_name', decodedName)
            .eq('party_group', reportType === 'Receivables' ? 'receivable' : 'payable');
          
          // Batch insert
          const batchSize = 500;
          for (let i = 0; i < bills.length; i += batchSize) {
            const batch = bills.slice(i, i + batchSize).map(b => ({
              company_name: decodedName,
              party_ledger: b.party_ledger,
              party_group: b.party_group,
              bill_ref: b.bill_ref,
              bill_type: b.bill_type,
              bill_date: parseTallyDate(b.bill_date),
              due_date: parseTallyDate(b.due_date),
              pending_amount: b.pending_amount,
              as_on_date: todayStr,
            }));
            const { data: inserted } = await supabase.from('outstanding_bills').insert(batch);
            counts.outstandings += batch.length;
          }
        }
      }
    }

    // 7. Log the sync
    try {
      await supabase.from('sync_logs').insert({
        sync_id: `SYNC-${Date.now()}`,
        company_id: companyId,
        sync_source: 'web-auto-sync',
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        status: 'SUCCESS',
        records_inserted: counts.ledgers + counts.vouchers + counts.stockItems + counts.outstandings,
        records_updated: 0,
      });
    } catch (e) { /* ignore sync log failures */ }

    return NextResponse.json({
      success: true,
      company: decodedName,
      companyId,
      counts,
      durationMs: Date.now() - startTime,
    });

  } catch (error: any) {
    console.error('Sync API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      durationMs: Date.now() - startTime,
    }, { status: 500 });
  }
}

// export const runtime = 'edge';
