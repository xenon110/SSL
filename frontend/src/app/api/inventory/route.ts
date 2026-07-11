import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getTimeBucket(dateString: string, startDateStr: string | null, endDateStr: string | null) {
  const d = new Date(dateString);
  let bucketType = 'monthly';
  
  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const diffDays = (end - start) / (1000 * 3600 * 24);
    
    if (diffDays <= 31) bucketType = 'daily';
    else if (diffDays <= 90) bucketType = 'weekly';
    else if (diffDays <= 366) bucketType = 'monthly';
    else bucketType = 'yearly';
  }

  const y = d.getFullYear();
  const m = d.getMonth();
  
  if (bucketType === 'daily') {
    return { label: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }), sortKey: d.getTime() };
  } else if (bucketType === 'weekly') {
    const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    return { label: `Wk of ${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`, sortKey: weekStart.getTime() };
  } else if (bucketType === 'yearly') {
    return { label: y.toString(), sortKey: new Date(y, 0, 1).getTime() };
  } else {
    return { label: d.toLocaleDateString('default', { month: 'short', year: '2-digit' }), sortKey: new Date(y, m, 1).getTime() };
  }
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase
      .from('vouchers')
      .select('*, voucher_inventory(*)');

    // Only filter by endDate in DB, we need prior vouchers to calculate dynamic Opening Balance
    if (endDate) query = query.lte('date', endDate);

    const { data: vouchers, error } = await query;
    const { data: stockItems, error: stockItemsError } = await supabase.from('stock_items').select('*');

    if (error) throw error;

    const productStats: Record<string, any> = {};

    stockItems?.forEach(item => {
      productStats[item.name] = {
        name: item.name,
        parentGroup: item.parent_group || 'Uncategorized',
        baseUnits: item.base_units || 'nos',
        openingQty: Math.abs(Number(item.opening_balance_qty) || 0),
        openingVal: Math.abs(Number(item.opening_balance_value) || 0),
        inQty: 0,
        inVal: 0,
        outQty: 0,
        outVal: 0,
        closingQty: 0,
        closingVal: 0
      };
    });

    let totalInwardValue = 0;
    let totalInwardQty = 0;
    let totalOutwardValue = 0;
    let totalOutwardQty = 0;

    const timeBuckets: Record<string, any> = {};
    const detailedLedger: any[] = [];

    const startDateTime = startDate ? new Date(startDate).getTime() : 0;

    vouchers?.forEach(v => {
      if (!v.voucher_inventory || v.voucher_inventory.length === 0) return;

      const vType = (v.voucher_type_name || '').toLowerCase();
      // Skip order vouchers (Sales Order, Purchase Order, Job Work Order) as they don't affect physical stock
      if (vType.includes('order')) return;

      // Use is_inward flag from each inventory line instead of guessing from voucher type name
      const hasInventory = v.voucher_inventory.some((inv: any) => inv.stock_item_name);

      const vTime = new Date(v.date).getTime();
      const isBeforeStart = startDateTime > 0 && vTime < startDateTime;

      if (!isBeforeStart) {
        const bucket = getTimeBucket(v.date, startDate, endDate);
        if (!timeBuckets[bucket.label]) timeBuckets[bucket.label] = { label: bucket.label, sortKey: bucket.sortKey, inQty: 0, outQty: 0 };
      }

      v.voucher_inventory.forEach((inv: any) => {
        const pName = inv.stock_item_name || "Unknown Product";
        const qty = Number(inv.actual_qty || inv.billed_qty) || 0;
        const val = Number(inv.amount) || 0;
        const rate = Number(inv.rate) || (qty > 0 ? val / qty : 0);

        if (!productStats[pName]) {
          productStats[pName] = {
            name: pName,
            parentGroup: 'Uncategorized',
            baseUnits: 'nos',
            openingQty: 0,
            openingVal: 0,
            inQty: 0,
            inVal: 0,
            outQty: 0,
            outVal: 0,
            closingQty: 0,
            closingVal: 0
          };
        }

        if (isBeforeStart) {
          // Adjust Opening Balance dynamically
          if (inv.is_inward) {
            productStats[pName].openingQty += qty;
            productStats[pName].openingVal += val;
          } else {
            productStats[pName].openingQty -= qty;
            productStats[pName].openingVal -= val;
          }
        } else {
          // Current Period Inwards/Outwards
          if (inv.is_inward) {
            totalInwardValue += val;
            totalInwardQty += qty;
            productStats[pName].inQty += qty;
            productStats[pName].inVal += val;
            const bucket = getTimeBucket(v.date, startDate, endDate);
            if (timeBuckets[bucket.label]) timeBuckets[bucket.label].inQty += qty;
          } else {
            totalOutwardValue += val;
            totalOutwardQty += qty;
            productStats[pName].outQty += qty;
            productStats[pName].outVal += val;
            const bucket = getTimeBucket(v.date, startDate, endDate);
            if (timeBuckets[bucket.label]) timeBuckets[bucket.label].outQty += qty;
          }

          detailedLedger.push({
            id: v.voucher_number || v.tally_guid.substring(0,8),
            date: v.date,
            type: inv.is_inward ? 'INWARD' : 'OUTWARD',
            voucherType: v.voucher_type_name,
            product: pName,
            party: v.party_ledger_name || 'Cash',
            qty: qty,
            rate: rate,
            amount: val
          });
        }
      });
    });

    const allProducts = Object.values(productStats).map((p: any) => {
      // Calculate Closing Balance exactly as Tally does
      p.closingQty = p.openingQty + p.inQty - p.outQty;
      
      // Calculate rates
      p.openingRate = p.openingQty !== 0 ? Math.abs(p.openingVal / p.openingQty) : 0;
      p.inRate = p.inQty !== 0 ? Math.abs(p.inVal / p.inQty) : 0;
      p.outRate = p.outQty !== 0 ? Math.abs(p.outVal / p.outQty) : 0;
      
      p.closingVal = p.openingVal + p.inVal - p.outVal;
      p.closingRate = p.closingQty !== 0 ? Math.abs(p.closingVal / p.closingQty) : 0;

      // Gross Value = outward value (selling price from vouchers)
      p.grossValue = p.outVal;
      
      // Consumption = weighted average cost * outward qty
      // Weighted avg cost = (opening_value + inward_value) / (opening_qty + inward_qty)
      const totalAvailableQty = p.openingQty + p.inQty;
      const totalAvailableVal = p.openingVal + p.inVal;
      const weightedAvgCost = totalAvailableQty > 0 ? totalAvailableVal / totalAvailableQty : 0;
      p.consumption = weightedAvgCost * p.outQty;
      
      // Gross Profit = Gross Value - Consumption
      p.grossProfit = p.grossValue - p.consumption;
      
      // Profit Percentage
      p.profitPerc = p.grossValue > 0 ? (p.grossProfit / p.grossValue) * 100 : 0;

      return p;
    });

    // Top moving products (by outward volume)
    const fastMoving = [...allProducts]
      .filter(p => p.outQty > 0)
      .sort((a, b) => b.outQty - a.outQty)
      .slice(0, 10);

    // Slow moving / Dead stock (high inward, zero/low outward)
    const slowMoving = [...allProducts]
      .filter(p => p.inQty > 0)
      .sort((a, b) => (a.outQty === 0 && a.inQty > 0 ? -1 : 1)) 
      .slice(0, 10);

    const trendData = Object.values(timeBuckets)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(t => ({ month: t.label, inQty: t.inQty, outQty: t.outQty }));

    detailedLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let totalOpeningValue = allProducts.reduce((sum, p) => sum + p.openingVal, 0);
    let totalClosingValue = allProducts.reduce((sum, p) => sum + p.closingVal, 0);
    let totalGrossValue = allProducts.reduce((sum, p) => sum + p.grossValue, 0);
    let totalConsumption = allProducts.reduce((sum, p) => sum + p.consumption, 0);
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
      trendData,
      detailedLedger
    });

  } catch (error: any) {
    console.error('Inventory API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
