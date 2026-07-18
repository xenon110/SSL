import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

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

const getEmptyInventoryState = () => ({
  kpis: {
    totalProducts: 0, inwardQty: 0, inwardValue: 0, outwardQty: 0, outwardValue: 0,
    openingValue: 0, closingValue: 0, grossValue: 0, consumption: 0, grossProfit: 0,
    profitPerc: 0, riskItemsCount: 0
  },
  allProducts: [], fastMoving: [], slowMoving: [], trendData: [], detailedLedger: []
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Handle Active Company Filtering
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    
    let companyId = null;
    const decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (comp) {
      companyId = comp.id;
    } else {
      const { data: bkmComp } = await supabase.from('companies').select('id').eq('name', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)').single();
      if (bkmComp) {
        companyId = bkmComp.id;
      } else {
        return NextResponse.json(getEmptyInventoryState());
      }
    }

    let query = supabase
      .from('voucher_inventory')
      .select(`
        stock_item_name,
        actual_qty,
        billed_qty,
        amount,
        is_inward,
        vouchers!inner(
          id,
          date,
          voucher_type_name,
          voucher_number,
          party_ledger_name,
          tally_guid
        )
      `)
      .eq('vouchers.is_deleted', false)
      .eq('vouchers.is_cancelled', false)
      .eq('vouchers.is_optional', false);

    if (companyId) {
      query = query.eq('vouchers.company_id', companyId);
    }

    if (endDate) {
      query = query.lte('vouchers.date', endDate);
    }

    const { data: inventoryLines, error } = await fetchAllData(query);
    const { data: stockItems, error: stockItemsError } = await supabase
      .from('stock_items')
      .select('*')
      .eq('company_id', companyId);

    if (error) throw error;

    const productStats: Record<string, any> = {};

    stockItems?.forEach(item => {
      productStats[item.name] = {
        name: item.name,
        parentGroup: item.parent_group || 'Uncategorized',
        baseUnits: item.base_units || 'nos',
        
        // Running values (from start of Tally books begin)
        runningQty: Math.abs(Number(item.opening_balance_qty) || 0),
        runningVal: Math.abs(Number(item.opening_balance_value) || 0),

        // Period totals
        openingQty: Math.abs(Number(item.opening_balance_qty) || 0),
        openingVal: Math.abs(Number(item.opening_balance_value) || 0),
        inQty: 0,
        inVal: 0,
        outQty: 0,
        outVal: 0,
        closingQty: 0,
        closingVal: 0,
        consumption: 0,
        grossValue: 0,
        grossProfit: 0,
        profitPerc: 0
      };
    });

    let totalInwardValue = 0;
    let totalInwardQty = 0;
    let totalOutwardValue = 0;
    let totalOutwardQty = 0;

    const timeBuckets: Record<string, any> = {};
    const detailedLedger: any[] = [];

    const startDateTime = startDate ? new Date(startDate).getTime() : 0;

    // Chronologically sort inventory lines so WAC calculation is accurate
    const sortedLines = [...(inventoryLines || [])].sort((a: any, b: any) => {
      const aDate = a.vouchers?.date ? new Date(a.vouchers.date).getTime() : 0;
      const bDate = b.vouchers?.date ? new Date(b.vouchers.date).getTime() : 0;
      return aDate - bDate;
    });

    sortedLines.forEach((inv: any) => {
      const v = inv.vouchers;
      if (!v) return;

      const vType = (v.voucher_type_name || '').toLowerCase();
      // Skip order vouchers (Sales Order, Purchase Order, Job Work Order) as they don't affect physical stock
      if (vType.includes('order')) return;

      const vTime = new Date(v.date).getTime();
      const isBeforeStart = startDateTime > 0 && vTime < startDateTime;

      if (!isBeforeStart) {
        const bucket = getTimeBucket(v.date, startDate, endDate);
        if (!timeBuckets[bucket.label]) {
          timeBuckets[bucket.label] = { label: bucket.label, sortKey: bucket.sortKey, inQty: 0, outQty: 0 };
        }
      }

      const pName = inv.stock_item_name || "Unknown Product";
      const qty = Number(inv.actual_qty || inv.billed_qty) || 0;
      const val = Number(inv.amount) || 0;

      if (!productStats[pName]) {
        productStats[pName] = {
          name: pName,
          parentGroup: 'Uncategorized',
          baseUnits: 'nos',
          runningQty: 0,
          runningVal: 0,
          openingQty: 0,
          openingVal: 0,
          inQty: 0,
          inVal: 0,
          outQty: 0,
          outVal: 0,
          closingQty: 0,
          closingVal: 0,
          consumption: 0,
          grossValue: 0,
          grossProfit: 0,
          profitPerc: 0
        };
      }

      const p = productStats[pName];

      if (inv.is_inward) {
        // Inward (Purchase/Receipt)
        p.runningQty += qty;
        p.runningVal += val;

        if (!isBeforeStart) {
          totalInwardValue += val;
          totalInwardQty += qty;
          p.inQty += qty;
          p.inVal += val;
          const bucket = getTimeBucket(v.date, startDate, endDate);
          if (timeBuckets[bucket.label]) timeBuckets[bucket.label].inQty += qty;
        }
      } else {
        // Outward (Sale/Delivery)
        // Cost of goods sold (COGS) is based on running Weighted Average Cost * qty
        const costPrice = p.runningQty > 0 ? (p.runningVal / p.runningQty) * qty : 0;
        p.runningQty -= qty;
        p.runningVal -= costPrice;

        if (!isBeforeStart) {
          totalOutwardValue += val;
          totalOutwardQty += qty;
          p.outQty += qty;
          p.outVal += val; // sales revenue
          p.consumption += costPrice; // cost value
          const bucket = getTimeBucket(v.date, startDate, endDate);
          if (timeBuckets[bucket.label]) timeBuckets[bucket.label].outQty += qty;
        }
      }

      // If we are still before the start date, the "opening" of the period is rolled forward
      if (isBeforeStart) {
        p.openingQty = p.runningQty;
        p.openingVal = p.runningVal;
      }

      if (!isBeforeStart) {
        detailedLedger.push({
          id: v.voucher_number || v.tally_guid.substring(0, 8),
          date: v.date,
          type: inv.is_inward ? 'INWARD' : 'OUTWARD',
          voucherType: v.voucher_type_name,
          product: pName,
          party: v.party_ledger_name || 'Cash',
          qty: qty,
          rate: qty > 0 ? val / qty : 0,
          amount: val
        });
      }
    });

    const allProducts = Object.values(productStats).map((p: any) => {
      // Calculate Closing Balance
      p.closingQty = p.runningQty;
      p.closingVal = p.runningVal;

      // Calculate rates
      p.openingRate = p.openingQty !== 0 ? Math.abs(p.openingVal / p.openingQty) : 0;
      p.inRate = p.inQty !== 0 ? Math.abs(p.inVal / p.inQty) : 0;
      p.outRate = p.outQty !== 0 ? Math.abs(p.outVal / p.outQty) : 0;
      p.closingRate = p.closingQty !== 0 ? Math.abs(p.closingVal / p.closingQty) : 0;
      
      // Gross Value = outward value (selling price from vouchers)
      p.grossValue = p.outVal;
      
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

    let minDate: string | null = null;
    let maxDate: string | null = null;
    inventoryLines?.forEach((inv: any) => {
      const v = inv.vouchers;
      if (v && v.date) {
        if (!minDate || v.date < minDate) minDate = v.date;
        if (!maxDate || v.date > maxDate) maxDate = v.date;
      }
    });

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
      detailedLedger,
      dateBounds: { minDate, maxDate }
    });

  } catch (error: any) {
    console.error('Inventory API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
