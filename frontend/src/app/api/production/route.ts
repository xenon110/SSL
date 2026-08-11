import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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
    if (comp) companyId = comp.id;

    // Fetch from Materialized Views instead of Tally XML
    const [
      { data: invSummary },
      { data: stockItems }
    ] = await Promise.all([
      fetchAllData(supabase.from('mv_inventory_summary').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('stock_items').select('*').eq('company_id', companyId))
    ]);

    const itemGroupMap = new Map();
    const itemStockMap = new Map();
    (stockItems || []).forEach((s: any) => {
        itemGroupMap.set(s.name, s.parent_group || 'Uncategorized');
        itemStockMap.set(s.name, s);
    });

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

    // Calculate closing stock using WAC method similar to inventory API
    const calculateClosingStock = (name: string, inQty: number, inVal: number, outQty: number, outVal: number) => {
        const item = itemStockMap.get(name) || {};
        const openQty = Math.abs(Number(item.opening_balance_qty) || 0);
        const openVal = Math.abs(Number(item.opening_balance_value) || 0);
        
        const totalAvailQty = openQty + inQty;
        const totalAvailVal = openVal + inVal;
        const closingQty = totalAvailQty - outQty;
        
        const wac = totalAvailQty > 0 ? totalAvailVal / totalAvailQty : 0;
        const closingVal = totalAvailVal - (wac * outQty);
        
        return { closingQty, closingVal, consumedVal: wac * outQty };
    };

    (invSummary || []).forEach((row: any) => {
        const name = row.product_name;
        const group = itemGroupMap.get(name);
        const lowerGroup = group.toLowerCase();

        const inQty = Number(row.total_inward_qty) || 0;
        const inVal = Number(row.total_inward_value) || 0;
        const outQty = Number(row.total_outward_qty) || 0;
        const outVal = Number(row.total_outward_value) || 0;

        const { closingQty, closingVal, consumedVal } = calculateClosingStock(name, inQty, inVal, outQty, outVal);

        let finalGroup = 'Uncategorized';
        let isFinished = false;
        let isRaw = false;

        if (lowerGroup === 'raw material') { finalGroup = 'Raw Material'; isRaw = true; }
        else if (lowerGroup === 'finished goods') { finalGroup = 'Finished Goods'; isFinished = true; }
        else if (lowerGroup === 'co product / by product') finalGroup = 'Co Product / By Product';
        else if (lowerGroup === 'store & spares parts') finalGroup = 'Store & Spares Parts';

        const unit = itemStockMap.get(name)?.base_units || 'MT';

        if (closingStockSummary[finalGroup] && closingVal > 0) {
             closingStockSummary[finalGroup].items.push({
               name: name,
               qty: closingQty,
               value: closingVal,
               unit
             });
             closingStockSummary[finalGroup].value += closingVal;
             closingStockSummary[finalGroup].qty += closingQty;
        }

        if (isFinished) {
          totalProductionValue += inVal; // Production inwards
          totalUnitsProduced += inQty;
          if (!topProductsMap[name]) topProductsMap[name] = { value: 0, qty: 0, unit };
          topProductsMap[name].value += inVal;
          topProductsMap[name].qty += inQty;
        }

        if (isRaw) {
          totalRawMaterialCost += consumedVal; // Raw Material consumed
          totalRawMaterialUnits += outQty;
          if (!topRawMaterialsMap[name]) topRawMaterialsMap[name] = { value: 0, qty: 0, unit };
          topRawMaterialsMap[name].value += consumedVal;
          topRawMaterialsMap[name].qty += outQty;
        }
    });

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
    console.error('Production API Error:', err.message || err, err.stack);
    return NextResponse.json({ error: 'Failed', details: err.message }, { status: 500 });
  }
}

export const runtime = 'edge';
