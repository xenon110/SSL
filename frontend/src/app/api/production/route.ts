import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { XMLParser } from 'fast-xml-parser';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const TALLY_URL = process.env.TALLY_URL || 'http://localhost:9000';
const COMPANY_NAME = process.env.COMPANY_NAME || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    const decodedName = decodeURIComponent(activeCompany);
    
    let companyId = 'a98b4f9e-ff1c-454e-a38c-c5db9a62c454';
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (comp) {
      companyId = comp.id;
    }
    
    let parsed: any = null;
    
    // 1. Try Fetching Live from Tally First
    const tallyUrl = process.env.TALLY_URL || 'http://localhost:9000';
    const tallyStartDate = startDate ? startDate.replace(/-/g, '') : '20250401';
    const tallyEndDate = endDate ? endDate.replace(/-/g, '') : '20260331';

    const bsXml = `<ENVELOPE>
      <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
      <BODY><EXPORTDATA><REQUESTDESC>
        <REPORTNAME>Stock Summary</REPORTNAME>
        <STATICVARIABLES>
          <SVCOMPANY>${decodedName}</SVCOMPANY>
          <SVFROMDATE>${tallyStartDate}</SVFROMDATE>
          <SVTODATE>${tallyEndDate}</SVTODATE>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
          <EXPLODEALLLEVELS>Yes</EXPLODEALLLEVELS>
          <ISINWARDS>Yes</ISINWARDS>
          <ISOUTWARDS>Yes</ISOUTWARDS>
        </STATICVARIABLES>
      </REQUESTDESC></EXPORTDATA></BODY>
    </ENVELOPE>`;

    try {
      const tallyRes = await fetch(tallyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: bsXml,
      });

      if (tallyRes.ok) {
        const liveXml = await tallyRes.text();
        if (liveXml && liveXml.includes('<DSPACCNAME>')) {
          parsed = liveXml;
          
          // Save to Database (Live Updation requirement)
          await supabase.from('tally_stock_summary').upsert({
            company_id: companyId,
            from_date: startDate || '2025-04-01',
            to_date: endDate || '2026-03-31',
            raw_xml: liveXml,
            last_synced_at: new Date().toISOString()
          }, { onConflict: 'company_id,from_date,to_date' });
        }
      }
    } catch (e) {
      console.warn("Tally fetch failed, falling back to database", e);
    }

    // 2. Fallback to Database if Tally failed
    if (!parsed) {
      let query = supabase
        .from('tally_stock_summary')
        .select('raw_xml, json_data')
        .eq('company_id', companyId);
        
      if (startDate) query = query.eq('from_date', startDate);
      if (endDate) query = query.eq('to_date', endDate);
      
      const { data: stockSummaryData } = await query
        .order('last_synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (stockSummaryData?.raw_xml) {
         parsed = stockSummaryData.raw_xml;
      }
    }

    const groupSummary: Record<string, any> = {};
    let totalProductionValue = 0;
    let totalRawMaterialCost = 0;
    let totalUnitsProduced = 0;
    let totalRawMaterialUnits = 0;

    const topProductsMap: Record<string, { value: number, qty: number, unit: string }> = {};
    const topRawMaterialsMap: Record<string, { value: number, qty: number, unit: string }> = {};
    const closingStockSummary: Record<string, { value: number, qty: number, items: any[] }> = {
      'Raw Material': { value: 0, qty: 0, items: [] },
      'Finished Goods': { value: 0, qty: 0, items: [] },
      'Store & Spares Parts': { value: 0, qty: 0, items: [] },
      'Co Product / By Product': { value: 0, qty: 0, items: [] }
    };

    if (parsed) {
      const xmlStr = String(parsed);
      
      const blockRegex = /<DSPACCNAME>([\s\S]*?)<\/DSPACCNAME>\s*<DSPSTKINFO>([\s\S]*?)<\/DSPSTKINFO>/g;
      let match;
      let currentMainGroup = 'Uncategorized';
      
      while ((match = blockRegex.exec(xmlStr)) !== null) {
        const accNameBlock = match[1];
        const infoBlock = match[2];
        
        const nameMatch = /<DSPDISPNAME>(.*?)<\/DSPDISPNAME>/.exec(accNameBlock);
        if (!nameMatch) continue;
        
        const dispName = nameMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        const lowerName = dispName.toLowerCase();
        
        const isGroupName = lowerName === 'raw material' || lowerName === 'finished goods' || lowerName === 'co product / by product' || lowerName === 'store & spares parts';
        
        let finalGroup = 'Uncategorized';
        let isFinished = false; // Still needed for top products tracking
        let isRaw = false;

        if (isGroupName) {
          if (lowerName === 'raw material') { finalGroup = 'Raw Material'; isRaw = true; }
          else if (lowerName === 'finished goods') { finalGroup = 'Finished Goods'; isFinished = true; }
          else if (lowerName === 'co product / by product') finalGroup = 'Co Product / By Product';
          else if (lowerName === 'store & spares parts') finalGroup = 'Store & Spares Parts';
          currentMainGroup = finalGroup;
        } else {
          finalGroup = currentMainGroup;
          if (currentMainGroup === 'Finished Goods') isFinished = true;
          if (currentMainGroup === 'Raw Material') isRaw = true;
        }

        let inQty = 0; let inVal = 0;
        const inMatch = /<DSPSTKIN>([\s\S]*?)<\/DSPSTKIN>/.exec(infoBlock);
        if (inMatch) {
          const inData = inMatch[1];
          const qMatch = /<DSPINQTY>(.*?)<\/DSPINQTY>/.exec(inData);
          if (qMatch) inQty = parseFloat(qMatch[1].replace(/[^\d.-]/g, '')) || 0;
          const vMatch = /<DSPINAMTA>(.*?)<\/DSPINAMTA>|<DSPNETTCRAMTA>(.*?)<\/DSPNETTCRAMTA>|<DSPDRAMTA>(.*?)<\/DSPDRAMTA>/.exec(inData);
          if (vMatch) inVal = Math.abs(parseFloat(vMatch[1] || vMatch[2] || vMatch[3] || '0') || 0);
        }

        let outQty = 0; let outVal = 0;
        const outMatch = /<DSPSTKOUT>([\s\S]*?)<\/DSPSTKOUT>/.exec(infoBlock);
        if (outMatch) {
          const outData = outMatch[1];
          const qMatch = /<DSPOUTQTY>(.*?)<\/DSPOUTQTY>/.exec(outData);
          if (qMatch) outQty = Math.abs(parseFloat(qMatch[1].replace(/[^\d.-]/g, '')) || 0);
          const vMatch = /<DSPOUTAMTA>(.*?)<\/DSPOUTAMTA>|<DSPNETTCRAMTA>(.*?)<\/DSPNETTCRAMTA>|<DSPDRAMTA>(.*?)<\/DSPDRAMTA>/.exec(outData);
          if (vMatch) outVal = Math.abs(parseFloat(vMatch[1] || vMatch[2] || vMatch[3] || '0') || 0);
        }

        let clQty = 0; let clVal = 0;
        const clMatch = /<DSPSTKCL>([\s\S]*?)<\/DSPSTKCL>/.exec(infoBlock);
        if (clMatch) {
          const clData = clMatch[1];
          const qMatch = /<DSPCLQTY>(.*?)<\/DSPCLQTY>/.exec(clData);
          if (qMatch) clQty = Math.abs(parseFloat(qMatch[1].replace(/[^\d.-]/g, '')) || 0);
          const vMatch = /<DSPCLAMTA>(.*?)<\/DSPCLAMTA>|<DSPNETTCRAMTA>(.*?)<\/DSPNETTCRAMTA>|<DSPDRAMTA>(.*?)<\/DSPDRAMTA>/.exec(clData);
          if (vMatch) clVal = Math.abs(parseFloat(vMatch[1] || vMatch[2] || vMatch[3] || '0') || 0);
        }

        let unit = 'MT';

        if (closingStockSummary[finalGroup] && clVal > 0) {
           if (isGroupName) {
             closingStockSummary[finalGroup].qty = clQty;
             closingStockSummary[finalGroup].value = clVal;
           } else {
             closingStockSummary[finalGroup].items.push({
               name: dispName,
               qty: clQty,
               value: clVal,
               unit
             });
           }
        }

        if (isFinished) {
          const producedValue = inVal > 0 ? inVal : clVal;
          const producedQty = inQty > 0 ? inQty : clQty;
          totalProductionValue += producedValue || 0;
          totalUnitsProduced += producedQty || 0;
          if (!topProductsMap[dispName]) topProductsMap[dispName] = { value: 0, qty: 0, unit };
          topProductsMap[dispName].value += producedValue || 0;
          topProductsMap[dispName].qty += producedQty || 0;
        }

        if (isRaw) {
          const consumedVal = outVal > 0 ? outVal : clVal;
          const consumedQty = outQty > 0 ? outQty : clQty;
          totalRawMaterialCost += consumedVal || 0;
          totalRawMaterialUnits += consumedQty || 0;
          if (!topRawMaterialsMap[dispName]) topRawMaterialsMap[dispName] = { value: 0, qty: 0, unit };
          topRawMaterialsMap[dispName].value += consumedVal || 0;
          topRawMaterialsMap[dispName].qty += consumedQty || 0;
        }
      }
    }

    // Filter out nested children to prevent double-counting in the UI
    for (const groupName in closingStockSummary) {
      const items = closingStockSummary[groupName].items;
      const topLevel = [];
      let i = 0;
      while (i < items.length) {
        const parent = items[i];
        topLevel.push(parent);
        
        let j = i + 1;
        let childrenSum = 0;
        while (j < items.length) {
          childrenSum += items[j].value;
          if (Math.abs(childrenSum - parent.value) < 1) {
            i = j; // Skip children that sum up to this parent
            break;
          } else if (childrenSum > parent.value + 1) {
            break; // Overshot, not a parent of these items
          }
          j++;
        }
        i++;
      }
      closingStockSummary[groupName].items = topLevel;
    }

    const yieldPercentage = totalRawMaterialUnits > 0 ? (totalUnitsProduced / totalRawMaterialUnits) * 100 : 0;
    const manufacturingMargin = totalProductionValue - totalRawMaterialCost;
    
    const formatInsights = (map: Record<string, {value: number, qty: number, unit: string}>) => {
      return Object.entries(map)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);
    };

    return NextResponse.json({
      success: true,
      kpis: {
        totalProductionValue,
        totalRawMaterialCost,
        manufacturingMargin,
        totalUnitsProduced,
        totalRawMaterialUnits,
        yieldPercentage
      },
      insights: {
        topProducts: formatInsights(topProductsMap),
        topRawMaterials: formatInsights(topRawMaterialsMap)
      },
      trend: [],
      detailedTransactions: [],
      groupSummary: [],
      closingStockSummary
    });
  } catch (err: any) {
    console.error('API Error:', err.message || err, err.stack);
    return NextResponse.json({ error: 'Failed', details: err.message }, { status: 500 });
  }
}
