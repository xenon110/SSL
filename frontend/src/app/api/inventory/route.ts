import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

const getEmptyInventoryState = () => ({
  kpis: {
    totalProducts: 0, inwardQty: 0, inwardValue: 0, outwardQty: 0, outwardValue: 0,
    openingValue: 0, closingValue: 0, grossValue: 0, consumption: 0, grossProfit: 0,
    profitPerc: 0, riskItemsCount: 0
  },
  allProducts: [], fastMoving: [], slowMoving: [], trendData: [], detailedLedger: [],
  dateBounds: { minDate: null, maxDate: null }
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    
    let companyId = null;
    const decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (comp) {
      companyId = comp.id;
    } else {
        return NextResponse.json(getEmptyInventoryState());
    }

    // Fetch from Materialized View and Stock Items
    const [
      { data: inventorySummary },
      { data: stockItems }
    ] = await Promise.all([
      fetchAllData(supabase.from('mv_inventory_summary').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('stock_items').select('*').eq('company_id', companyId))
    ]);

    let totalInwardValue = 0;
    let totalInwardQty = 0;
    let totalOutwardValue = 0;
    let totalOutwardQty = 0;
    let totalOpeningValue = 0;
    let totalClosingValue = 0;
    let totalGrossValue = 0;
    let totalConsumption = 0;

    const summaryMap = new Map();
    (inventorySummary || []).forEach((row: any) => {
        summaryMap.set(row.product_name, row);
    });

    const allProducts = (stockItems || []).map((item: any) => {
        const pName = item.name;
        const summary = summaryMap.get(pName) || {};

        const openingQty = Math.abs(Number(item.opening_balance_qty) || 0);
        const openingVal = Math.abs(Number(item.opening_balance_value) || 0);

        const inQty = Number(summary.total_inward_qty) || 0;
        const inVal = Number(summary.total_inward_value) || 0;
        
        const outQty = Number(summary.total_outward_qty) || 0;
        const outVal = Number(summary.total_outward_value) || 0;

        const closingQty = openingQty + inQty - outQty;
        // WAC approximation for closing value
        const totalAvailQty = openingQty + inQty;
        const totalAvailVal = openingVal + inVal;
        const wac = totalAvailQty > 0 ? totalAvailVal / totalAvailQty : 0;
        const consumption = wac * outQty;
        const closingVal = totalAvailVal - consumption;

        const grossProfit = outVal - consumption;
        const profitPerc = outVal > 0 ? (grossProfit / outVal) * 100 : 0;

        totalInwardQty += inQty;
        totalInwardValue += inVal;
        totalOutwardQty += outQty;
        totalOutwardValue += outVal;
        totalOpeningValue += openingVal;
        totalClosingValue += closingVal;
        totalGrossValue += outVal;
        totalConsumption += consumption;

        return {
            name: pName,
            parentGroup: item.parent_group || 'Uncategorized',
            openingQty, openingVal,
            inQty, inVal,
            outQty, outVal,
            closingQty, closingVal,
            consumption,
            grossValue: outVal,
            grossProfit,
            profitPerc,
            openingRate: openingQty > 0 ? openingVal / openingQty : 0,
            inRate: inQty > 0 ? inVal / inQty : 0,
            outRate: outQty > 0 ? outVal / outQty : 0,
            closingRate: closingQty > 0 ? closingVal / closingQty : 0,
        };
    });

    const fastMoving = [...allProducts].filter(p => p.outQty > 0).sort((a, b) => b.outQty - a.outQty).slice(0, 10);
    const slowMoving = [...allProducts].filter(p => p.inQty > 0).sort((a, b) => (a.outQty === 0 && a.inQty > 0 ? -1 : 1)).slice(0, 10);

    let totalGrossProfit = totalGrossValue - totalConsumption;
    let totalProfitPerc = totalGrossValue > 0 ? (totalGrossProfit / totalGrossValue) * 100 : 0;

    return NextResponse.json({
      kpis: {
        totalProducts: allProducts.length,
        inwardQty: totalInwardQty,
        inwardValue: totalInwardValue,
        outwardQty: totalOutwardQty,
        outwardValue: totalOutwardValue,
        openingValue: totalOpeningValue,
        closingValue: totalClosingValue,
        grossValue: totalGrossValue,
        consumption: totalConsumption,
        grossProfit: totalGrossProfit,
        profitPerc: totalProfitPerc,
        riskItemsCount: slowMoving.filter(s => s.outQty === 0).length
      },
      allProducts,
      fastMoving,
      slowMoving,
      trendData: [], // Omitted to save edge bandwidth (requires separate view for daily trend)
      detailedLedger: [], 
      dateBounds: { minDate: null, maxDate: null }
    });

  } catch (error: any) {
    console.error('Inventory API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
