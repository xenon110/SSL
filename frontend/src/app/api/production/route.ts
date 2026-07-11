import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch vouchers with inventory items
    let query = supabase
      .from('vouchers')
      .select('*, voucher_inventory(*)');

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: vouchers, error } = await query;
    // Fetch stock item masters to get parent_group
    const { data: stockItems, error: stockItemsError } = await supabase.from('stock_items').select('*');

    if (error) throw error;

    // Build a fast lookup: item name -> parent_group
    const groupLookup: Record<string, string> = {};
    stockItems?.forEach(item => {
      groupLookup[item.name] = item.parent_group || 'Uncategorized';
    });

    // These are the REAL groups from Tally
    // Raw Material inputs: Raw Material, TIN Component, Chemicals & INK, Packing Material, Store Material, ALUMINIUM ITEM
    // Finished outputs: Finished Goods
    // Projects: Burnpur Project, Raj Mahal Project
    // WIP: WIP
    const RAW_GROUPS = new Set(['Raw Material', 'TIN Component', 'Chemicals & INK', 'Packing Material', 'Store Material', 'ALUMINIUM ITEM']);
    const FINISHED_GROUPS = new Set(['Finished Goods']);
    const PROJECT_GROUPS = new Set(['Burnpur Project', 'Raj Mahal Project']);

    let totalProductionValue = 0;
    let totalRawMaterialCost = 0;
    let totalUnitsProduced = 0;
    let totalRawMaterialUnits = 0;

    const topProductsMap: Record<string, { value: number, qty: number, unit: string }> = {};
    const topRawMaterialsMap: Record<string, { value: number, qty: number, unit: string }> = {};
    
    const monthlyTrend: Record<string, { month: string, sortKey: string, producedValue: number, rawMaterialCost: number }> = {};

    // Per-group summary for the Stock Summary style breakdown
    const groupSummary: Record<string, {
      name: string,
      inQty: number, inVal: number,
      outQty: number, outVal: number,
      items: Record<string, { name: string, inQty: number, inVal: number, outQty: number, outVal: number, unit: string }>
    }> = {};

    const detailedVouchers: any[] = [];
    
    (vouchers || []).forEach(v => {
      const dateObj = new Date(v.date);
      const monthStr = dateObj.toLocaleString('default', { month: 'short' }) + ' ' + dateObj.getFullYear().toString().slice(-2);
      const sortKey = dateObj.getFullYear() + String(dateObj.getMonth() + 1).padStart(2, '0');

      if (!monthlyTrend[sortKey]) {
        monthlyTrend[sortKey] = { month: monthStr, sortKey, producedValue: 0, rawMaterialCost: 0 };
      }

      const vType = (v.voucher_type_name || '').toLowerCase();
      // Skip order vouchers (Sales Order, Purchase Order, Job Work Order)
      if (vType.includes('order')) return;

      let isProductionVoucher = false;

      (v.voucher_inventory || []).forEach((inv: any) => {
        const qty = Math.abs(Number(inv.actual_qty || inv.billed_qty) || 0);
        const amount = Math.abs(Number(inv.amount) || 0);
        const itemName = inv.stock_item_name || 'Unknown';
        const parentGroup = groupLookup[itemName] || 'Uncategorized';
        
        // Get or find stock item for base_units
        const stockItem = stockItems?.find(s => s.name === itemName);
        const unit = stockItem?.base_units || 'nos';

        const isRaw = RAW_GROUPS.has(parentGroup);
        const isFinished = FINISHED_GROUPS.has(parentGroup);
        const isProject = PROJECT_GROUPS.has(parentGroup);

        // Initialize group summary
        if (!groupSummary[parentGroup]) {
          groupSummary[parentGroup] = { name: parentGroup, inQty: 0, inVal: 0, outQty: 0, outVal: 0, items: {} };
        }
        if (!groupSummary[parentGroup].items[itemName]) {
          groupSummary[parentGroup].items[itemName] = { name: itemName, inQty: 0, inVal: 0, outQty: 0, outVal: 0, unit };
        }

        // Track inward/outward per group for the Stock Summary style table
        if (inv.is_inward) {
          groupSummary[parentGroup].inQty += qty;
          groupSummary[parentGroup].inVal += amount;
          groupSummary[parentGroup].items[itemName].inQty += qty;
          groupSummary[parentGroup].items[itemName].inVal += amount;
        } else {
          groupSummary[parentGroup].outQty += qty;
          groupSummary[parentGroup].outVal += amount;
          groupSummary[parentGroup].items[itemName].outQty += qty;
          groupSummary[parentGroup].items[itemName].outVal += amount;
        }

        // Production logic:
        // Finished Goods OUTWARD = Goods Sold/Dispatched = Production Output Value
        // Raw Material/Component OUTWARD = Materials Consumed = Raw Material Cost
        // Also count: Finished Goods INWARD from Stock Journals = Goods Manufactured
        
        if ((isFinished || isProject) && !inv.is_inward) {
          // Outward of Finished Goods = Sales/Dispatch value
          totalProductionValue += amount;
          totalUnitsProduced += qty;
          monthlyTrend[sortKey].producedValue += amount;
          isProductionVoucher = true;
          
          if (!topProductsMap[itemName]) topProductsMap[itemName] = { value: 0, qty: 0, unit };
          topProductsMap[itemName].value += amount;
          topProductsMap[itemName].qty += qty;
        } else if (isRaw && !inv.is_inward) {
          // Outward of Raw Materials = Consumed in production
          totalRawMaterialCost += amount;
          totalRawMaterialUnits += qty;
          monthlyTrend[sortKey].rawMaterialCost += amount;
          isProductionVoucher = true;
          
          if (!topRawMaterialsMap[itemName]) topRawMaterialsMap[itemName] = { value: 0, qty: 0, unit };
          topRawMaterialsMap[itemName].value += amount;
          topRawMaterialsMap[itemName].qty += qty;
        }
      });
      
      if (isProductionVoucher) {
        detailedVouchers.push(v);
      }
    });

    const formatInsights = (map: Record<string, {value: number, qty: number, unit: string}>) => {
      return Object.entries(map)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);
    };

    // Build group summary array for the frontend table
    const groupSummaryArray = Object.values(groupSummary).map(g => ({
      ...g,
      items: Object.values(g.items).sort((a, b) => b.outVal - a.outVal)
    })).sort((a, b) => b.outVal - a.outVal);

    return NextResponse.json({
      kpis: {
        totalProductionValue,
        totalRawMaterialCost,
        totalUnitsProduced,
        totalRawMaterialUnits,
        manufacturingMargin: totalProductionValue - totalRawMaterialCost,
        yieldPercentage: totalRawMaterialUnits > 0 ? (totalUnitsProduced / totalRawMaterialUnits) * 100 : 0
      },
      insights: {
        topProducts: formatInsights(topProductsMap),
        topRawMaterials: formatInsights(topRawMaterialsMap)
      },
      groupSummary: groupSummaryArray,
      trend: Object.values(monthlyTrend).sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
      detailedTransactions: detailedVouchers
    });
  } catch (err: any) {
    console.error('Production API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch Production data' }, { status: 500 });
  }
}
