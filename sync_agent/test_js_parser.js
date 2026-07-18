const fs = require('fs');

function cleanXml(xml) {
  // Remove control characters except tab, newline, carriage return
  let cleaned = xml.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, '');
  if (cleaned.includes('UDF:') && !cleaned.includes('xmlns:UDF')) {
    cleaned = cleaned.replace('<ENVELOPE>', '<ENVELOPE xmlns:UDF="TallyUDF">');
  }
  return cleaned;
}

function cleanNumber(str) {
  if (!str || !str.trim()) return 0;
  const cleaned = str.split('/')[0].split(' ')[0].replace(/[^0-9.\-]/g, '');
  return cleaned ? parseFloat(cleaned) : 0;
}

function parseOutstandings(xml, reportType) {
  const bills = [];
  try {
    const cleaned = cleanXml(xml);
    const parts = cleaned.split(/<BILLFIXED>/);
    console.log(`Total split parts: ${parts.length}`);
    
    let skippedEmpty = 0;
    
    for (let i = 1; i < parts.length; i++) {
      const chunk = parts[i].split(/<BILLFIXED>/)[0];
      const billDate = chunk.match(/<BILLDATE>([^<]*)<\/BILLDATE>/)?.[1]?.trim();
      const billRef = chunk.match(/<BILLREF>([^<]*)<\/BILLREF>/)?.[1]?.replace(/&amp;/g, '&').trim();
      const party = chunk.match(/<BILLPARTY>([^<]*)<\/BILLPARTY>/)?.[1]?.replace(/&amp;/g, '&').trim();
      const pendingStr = chunk.match(/<BILLCL>([^<]*)<\/BILLCL>/)?.[1] || '0';
      const dueDate = chunk.match(/<BILLDUE>([^<]*)<\/BILLDUE>/)?.[1]?.trim() || billDate;
      
      if (!billDate || !party) {
        skippedEmpty++;
        if (skippedEmpty <= 5) {
          console.log(`  Skipped part ${i} - billDate: ${billDate}, party: ${party}`);
          console.log(`  Chunk preview: ${chunk.substring(0, 150)}`);
        }
        continue;
      }
      
      let pendingAmount = cleanNumber(pendingStr);
      if (reportType === 'Receivables') {
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
    console.log(`Total bills parsed: ${bills.length}`);
    console.log(`Total skipped parts: ${skippedEmpty}`);
  } catch (e) {
    console.error('Failed to parse outstandings:', e);
  }
  return bills;
}

const payXml = fs.readFileSync('tally_raw_payables.xml', 'utf8');
parseOutstandings(payXml, 'Payables');
