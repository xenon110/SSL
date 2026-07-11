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

    // 1. Fetch live data from Supabase
    let query = supabase
      .from('vouchers')
      .select('*, voucher_ledgers(*), voucher_inventory(*)');

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: vouchers, error } = await query;
    const { data: ledgers, error: ledgersError } = await supabase.from('ledgers').select('name, state');

    const isAdjusted = searchParams.get('adjusted') === 'true';

    if (error) {
      console.error("Error fetching vouchers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let activeVouchers = vouchers || [];

    // --- Overlay Manual Adjustments (if requested) ---
    if (isAdjusted && activeVouchers.length > 0) {
      const { data: adjustments, error: adjErr } = await supabase
        .from('manual_adjustments')
        .select('*')
        .eq('state', 'approved')
        .eq('entity_type', 'voucher');
        
      if (!adjErr && adjustments && adjustments.length > 0) {
        const adjMap = new Map();
        adjustments.forEach(adj => {
          if (!adjMap.has(adj.entity_id)) adjMap.set(adj.entity_id, {});
          adjMap.get(adj.entity_id)[adj.field_name] = adj.new_value;
        });

        activeVouchers = activeVouchers.map((v: any) => {
          const overrides = adjMap.get(v.tally_guid);
          if (overrides) {
            // Apply overrides (e.g. amount, is_cancelled, is_deleted)
            return {
              ...v,
              amount: overrides.amount !== undefined ? Number(overrides.amount) : v.amount,
              is_cancelled: overrides.is_cancelled !== undefined ? (overrides.is_cancelled === 'true') : v.is_cancelled,
              is_deleted: overrides.is_deleted !== undefined ? (overrides.is_deleted === 'true') : v.is_deleted,
              party_ledger_name: overrides.party_ledger_name !== undefined ? overrides.party_ledger_name : v.party_ledger_name,
            };
          }
          return v;
        });
      }
    }

    if (!activeVouchers || activeVouchers.length === 0) {
      return NextResponse.json({
        kpis: {
          grossSales: { value: 0, growth: 0 },
          salesReturns: { value: 0, growth: 0 },
          netSales: { value: 0, growth: 0 },
          gstCollected: { value: 0, growth: 0 },
          pendingOrders: { value: 0, growth: 0 }
        },
        salesTrend: [],
        salesByProduct: [],
        salesByRegion: [],
        topCustomers: [],
        detailedTransactions: [],
        returnsByProduct: []
      });
    }

    // 2. Variables for A1 to A12 metrics
    let grossSales = 0; // A1
    let salesReturns = 0; // A7
    let gstCollected = 0; // A9
    let pendingOrdersAmount = 0; // A11

    const timeBuckets: Record<string, { label: string, sortKey: number, sales: number }> = {};
    const productSales: Record<string, { qty: number, amount: number, rateSum: number, count: number }> = {}; // A5, A12
    const customerSales: Record<string, { amount: number, lastTxDate: string }> = {}; // A6 + Churn
    const regionalSales: Record<string, number> = {}; 
    const regionStates: Record<string, Record<string, number>> = {};
    const productReturns: Record<string, { qty: number, amount: number, count: number }> = {};
    const detailedTx: any[] = [];

    const stateToRegion: Record<string, string> = {
      "Delhi": "North Region", "Haryana": "North Region", "Punjab": "North Region", "Uttar Pradesh": "North Region", "Uttarakhand": "North Region", "Himachal Pradesh": "North Region", "Jammu & Kashmir": "North Region", "Chandigarh": "North Region",
      "Maharashtra": "West Region", "Gujarat": "West Region", "Rajasthan": "West Region", "Goa": "West Region", "Dadra & Nagar Haveli and Daman & Diu": "West Region", "Dadra and Nagar Haveli and Daman and Diu": "West Region",
      "Karnataka": "South Region", "Tamil Nadu": "South Region", "Kerala": "South Region", "Andhra Pradesh": "South Region", "Telangana": "South Region", "Puducherry": "South Region",
      "West Bengal": "East Region", "Bihar": "East Region", "Odisha": "East Region", "Jharkhand": "East Region",
      "Madhya Pradesh": "Central Region", "Chhattisgarh": "Central Region",
      "Assam": "North East Region", "Sikkim": "North East Region", "Meghalaya": "North East Region", "Tripura": "North East Region", "Arunachal Pradesh": "North East Region", "Manipur": "North East Region", "Mizoram": "North East Region", "Nagaland": "North East Region"
    };

    const ledgerStateMap: Record<string, string> = {};
    if (ledgers) {
      ledgers.forEach((l: any) => {
        if (l.name && l.state) ledgerStateMap[l.name] = l.state;
      });
    }

    for (const v of activeVouchers) {
      const isSales = v.voucher_type_name.toLowerCase().includes('sales') || v.voucher_type_name === 'POS Invoice';
      const isCreditNote = v.voucher_type_name.toLowerCase().includes('credit note');
      const isOrder = v.voucher_type_name.toLowerCase().includes('sales order');
      const isDelivery = v.voucher_type_name.toLowerCase().includes('delivery note');
      
      const val = Number(v.amount) || 0;
      
      const bucket = getTimeBucket(v.date, startDate, endDate);

      const isSale = isSales;
      const isReturn = isCreditNote || v.voucher_type_name.toLowerCase().includes('return');

      if (isOrder) {
        pendingOrdersAmount += val; // A11
      }

      if (isSale) {
        grossSales += val; // A1
        if (!timeBuckets[bucket.label]) {
          timeBuckets[bucket.label] = { label: bucket.label, sortKey: bucket.sortKey, sales: 0 };
        }
        timeBuckets[bucket.label].sales += val;
        
        if (v.party_ledger_name) {
          if (!customerSales[v.party_ledger_name]) customerSales[v.party_ledger_name] = { amount: 0, lastTxDate: v.date };
          customerSales[v.party_ledger_name].amount += val;
          if (new Date(v.date) > new Date(customerSales[v.party_ledger_name].lastTxDate)) {
            customerSales[v.party_ledger_name].lastTxDate = v.date;
          }
          
          const stateName = ledgerStateMap[v.party_ledger_name] || "Unknown State";
          let region = stateToRegion[stateName];
          if (!region) {
            // Fallback for unrecognized states
            if (stateName !== "Unknown State") {
              region = "Other Region";
            } else {
              region = "Unknown Region";
            }
          }
          
          regionalSales[region] = (regionalSales[region] || 0) + val;
          if (!regionStates[region]) regionStates[region] = {};
          regionStates[region][stateName] = (regionStates[region][stateName] || 0) + val;
        }
      }

      if (isReturn) {
        salesReturns += val; // A7
      }

      // Both Sales and Returns affect GST (Returns reduce GST, but here we just sum GST output for sales)
      if (isSale && v.voucher_ledgers) {
        v.voucher_ledgers.forEach((l: any) => {
          const lName = l.ledger_name?.toLowerCase() || '';
          if (lName.includes('gst') && (lName.includes('output') || lName.includes('cgst') || lName.includes('sgst') || lName.includes('igst'))) {
            gstCollected += Number(l.amount) || 0; // A9
          }
        });
      }

      // Process inventory for Products (A5) and Rates (A12)
      if (isSale && v.voucher_inventory) {
        v.voucher_inventory.forEach((inv: any) => {
          const pName = inv.stock_item_name || "Unknown Product";
          const iVal = Number(inv.amount) || 0;
          const qty = Number(inv.billed_qty) || 1;
          const rate = Number(inv.rate) || (qty > 0 ? iVal / qty : 0);

          if (!productSales[pName]) productSales[pName] = { qty: 0, amount: 0, rateSum: 0, count: 0 };
          productSales[pName].amount += iVal;
          productSales[pName].qty += qty;
          productSales[pName].rateSum += rate;
          productSales[pName].count += 1;
        });
      }

      if (isReturn && v.voucher_inventory) {
        v.voucher_inventory.forEach((inv: any) => {
          const pName = inv.stock_item_name || "Unknown Product";
          const iVal = Number(inv.amount) || 0;
          const qty = Number(inv.billed_qty) || 1;

          if (!productReturns[pName]) productReturns[pName] = { qty: 0, amount: 0, count: 0 };
          productReturns[pName].amount += iVal;
          productReturns[pName].qty += qty;
          productReturns[pName].count += 1;
        });
      }

      // Add to detailed transactions table (A12 price included)
      if (isSale || isReturn) {
        const stateName = ledgerStateMap[v.party_ledger_name] || "Unknown State";
        let regionName = stateToRegion[stateName] || (stateName !== "Unknown State" ? "Other Region" : "Unknown Region");

        detailedTx.push({
          id: v.voucher_number || v.tally_guid.substring(0,8),
          date: v.date,
          customer: v.party_ledger_name || "Cash",
          state: stateName,
          region: regionName,
          type: v.voucher_type_name,
          amount: val,
          items: (v.voucher_inventory || []).map((inv: any) => ({
             product: inv.stock_item_name || "Unknown",
             qty: inv.billed_qty || 0,
             rate: inv.rate || 0,
             amount: inv.amount || 0
          })),
          ledgers: (v.voucher_ledgers || [])
             .filter((l: any) => l.ledger_name !== v.party_ledger_name)
             .map((l: any) => ({
               name: l.ledger_name,
               amount: l.amount
             })),
          product: v.voucher_inventory?.[0]?.stock_item_name || (v.voucher_inventory?.length > 1 ? "Multiple Items" : "None"),
          qty: v.voucher_inventory?.[0]?.billed_qty || 0,
          rate: v.voucher_inventory?.[0]?.rate || 0, // A12
          status: isReturn ? "Returned" : "Completed"
        });
      }
    }

    const netSales = grossSales - salesReturns; // A8

    // Formatting for Charts
    const timeBucketsArr = Object.values(timeBuckets)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(t => ({
        month: t.label,
        sales: t.sales
      }));

    // Transform Customer Sales
    const topCustomersArr = Object.entries(customerSales)
      .map(([name, data]) => ({ name, value: data.amount, lastTxDate: data.lastTxDate }))
      .sort((a, b) => b.value - a.value);

    const churnedCustomers = topCustomersArr
      .filter(c => {
        const lastTx = new Date(c.lastTxDate).getTime();
        const now = new Date().getTime();
        const daysSinceLast = (now - lastTx) / (1000 * 3600 * 24);
        return daysSinceLast > 90; // Haven't ordered in 90 days
      })
      .slice(0, 10); // Top 10 churn risks

    const salesByRegionArr = Object.entries(regionalSales)
      .map(([name, value]) => {
        const states = Object.entries(regionStates[name] || {})
          .map(([stateName, stateSales]) => ({ name: stateName, sales: stateSales }))
          .sort((a, b) => b.sales - a.sales);
        return { name, value, states };
      })
      .sort((a, b) => b.value - a.value);

    const topProductsArr = Object.entries(productSales)
      .map(([name, data]) => ({ 
        name, 
        sales: data.amount, 
        avgRate: data.count > 0 ? data.rateSum / data.count : 0 // A12 Avg
      }))
      .sort((a, b) => b.sales - a.sales);

    const returnsByProductArr = Object.entries(productReturns)
      .map(([name, data]) => ({
        name,
        returns: data.amount,
        qty: data.qty
      }))
      .sort((a, b) => b.returns - a.returns);

    const liveData = {
      kpis: {
        grossSales: { value: grossSales, growth: 0 },
        salesReturns: { value: salesReturns, growth: 0 },
        netSales: { value: netSales, growth: 0 },
        gstCollected: { value: gstCollected, growth: 0 },
        pendingOrders: { value: pendingOrdersAmount, growth: 0 }
      },
      salesTrend: timeBucketsArr,
      salesByProduct: topProductsArr,
      salesByRegion: salesByRegionArr,
      topCustomers: topCustomersArr,
      churnedCustomers: churnedCustomers,
      detailedTransactions: detailedTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      returnsByProduct: returnsByProductArr
    };

    return NextResponse.json(liveData);
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
