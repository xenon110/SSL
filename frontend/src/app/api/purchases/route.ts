import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { mockDashboardData } from '@/lib/mockData';
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

const getEmptyPurchasesState = () => ({
  kpis: {
    totalPurchases: { value: 0, growth: 0 }, 
    avgOrderValue: { value: 0, growth: 0 },
    activeSuppliers: { value: 0, growth: 0 },
    pendingOrders: { value: 0, growth: 0 }
  },
  purchaseTrend: [],
  topSuppliers: [],
  purchasesByProduct: [],
  defectiveSuppliers: [],
  detailedTransactions: []
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    
    let companyId = null;
    let decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (comp) {
      companyId = comp.id;
    } else {
      const { data: bkmComp } = await supabase.from('companies').select('id').eq('name', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)').single();
      if (bkmComp) {
        companyId = bkmComp.id;
      } else {
        return NextResponse.json(getEmptyPurchasesState());
      }
    }

    let query = supabase
      .from('vouchers')
      .select('*, voucher_ledgers(*), voucher_inventory(*)')
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .eq('is_cancelled', false)
      .eq('is_optional', false)
      .or('voucher_type_name.ilike.%purchase%,voucher_type_name.ilike.%debit note%,voucher_type_name.ilike.%return%,voucher_type_name.ilike.%order%');

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: vouchers, error } = await fetchAllData(query);

    const isAdjusted = searchParams.get('adjusted') === 'true';

    if (error) throw error;

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
          totalPurchases: { value: 0, growth: 0 }, 
          avgOrderValue: { value: 0, growth: 0 },
          activeSuppliers: { value: 0, growth: 0 },
          pendingOrders: { value: 0, growth: 0 }
        },
        purchaseTrend: [],
        topSuppliers: [],
        purchasesByProduct: [],
        detailedTransactions: []
      });
    }

    let totalPurchases = 0;
    const suppliers = new Set();
    const supplierPurchases: Record<string, { amount: number, qty: number, count: number }> = {};
    const productPurchases: Record<string, { qty: number, amount: number, rateSum: number, count: number }> = {};
    const timeBuckets: Record<string, { label: string, sortKey: number, spend: number }> = {};
    const detailedTx: any[] = [];

    const supplierReturns: Record<string, { amount: number, count: number }> = {};
    let totalReturns = 0;
    let pendingOrdersAmount = 0;

    for (const v of activeVouchers) {
      const val = Number(v.amount) || 0;
      const vType = v.voucher_type_name?.toLowerCase() || '';
      const isReturn = vType.includes('debit note') || vType.includes('return');
      const isPurchase = vType.includes('purchase') && !vType.includes('order');
      const isOrder = vType.includes('purchase order') || vType.includes('purchases order');

      const supplierName = v.party_ledger_name || "Cash";
      
      if (isOrder) {
        pendingOrdersAmount += val;
      }
      
      if (isPurchase) {
        totalPurchases += val;
        suppliers.add(supplierName);
        if (!supplierPurchases[supplierName]) supplierPurchases[supplierName] = { amount: 0, qty: 0, count: 0 };
        supplierPurchases[supplierName].amount += val;
        supplierPurchases[supplierName].count += 1;

        const bucket = getTimeBucket(v.date, startDate, endDate);
        if (!timeBuckets[bucket.label]) {
          timeBuckets[bucket.label] = { label: bucket.label, sortKey: bucket.sortKey, spend: 0 };
        }
        timeBuckets[bucket.label].spend += val;
      }

      if (isReturn) {
        totalReturns += val;
        if (!supplierReturns[supplierName]) supplierReturns[supplierName] = { amount: 0, count: 0 };
        supplierReturns[supplierName].amount += val;
        supplierReturns[supplierName].count += 1;
      }

      let firstProduct = "Multiple/None";
      let firstQty = 0;
      let firstRate = 0;

      if (isPurchase && v.voucher_inventory && v.voucher_inventory.length > 0) {
        v.voucher_inventory.forEach((inv: any, idx: number) => {
          const pName = inv.stock_item_name || "Unknown Product";
          const iVal = Number(inv.amount) || 0;
          const qty = Number(inv.billed_qty) || 1;
          const rate = Number(inv.rate) || (qty > 0 ? iVal / qty : 0);

          if (idx === 0) {
            firstProduct = pName;
            firstQty = qty;
            firstRate = rate;
          }

          if (!productPurchases[pName]) productPurchases[pName] = { qty: 0, amount: 0, rateSum: 0, count: 0 };
          productPurchases[pName].amount += iVal;
          productPurchases[pName].qty += qty;
          productPurchases[pName].rateSum += rate;
          productPurchases[pName].count += 1;
          
          supplierPurchases[supplierName].qty += qty;
        });
      }

      detailedTx.push({
        id: v.voucher_number || v.tally_guid.substring(0,8),
        date: v.date,
        supplier: supplierName,
        product: firstProduct,
        qty: firstQty,
        rate: firstRate,
        type: v.voucher_type_name,
        amount: val,
        status: v.voucher_type_name.toLowerCase().includes('return') || v.voucher_type_name.toLowerCase().includes('debit note') ? "Returned" : "Completed"
      });
    }

    // Transform Top Suppliers & Dependency Risk
    const topSuppliersArr = Object.entries(supplierPurchases)
      .map(([name, data]) => ({ 
        name, 
        sales: data.amount, 
        purchases: data.amount, // Set both for chart compatibility
        dependencyPercentage: totalPurchases > 0 ? (data.amount / totalPurchases) * 100 : 0
      }))
      .sort((a, b) => b.purchases - a.purchases);

    const purchasesByProduct = Object.entries(productPurchases)
      .map(([name, data]) => ({ 
        name, 
        purchases: data.amount, 
        avgRate: data.count > 0 ? data.rateSum / data.count : 0 
      }))
      .sort((a, b) => b.purchases - a.purchases);

    const timeBucketsArr = Object.values(timeBuckets)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(t => ({
        month: t.label,
        spend: t.spend,
        budget: t.spend * 1.1 
      }));

    const defectiveSuppliers = Object.entries(supplierReturns)
      .map(([name, data]) => ({ name, returns: data.amount, count: data.count }))
      .sort((a, b) => b.returns - a.returns);

    let minDate: string | null = null;
    let maxDate: string | null = null;
    vouchers?.forEach(v => {
      if (v.date) {
        if (!minDate || v.date < minDate) minDate = v.date;
        if (!maxDate || v.date > maxDate) maxDate = v.date;
      }
    });

    const liveData = {
      kpis: {
        totalPurchases: { value: totalPurchases, growth: 0 }, 
        avgOrderValue: { value: totalPurchases / Math.max(1, activeVouchers.filter((v:any)=>v.voucher_type_name.toLowerCase().includes('purchase') && !v.voucher_type_name.toLowerCase().includes('order')).length), growth: 0 },
        activeSuppliers: { value: suppliers.size, growth: 0 },
        pendingOrders: { value: pendingOrdersAmount, growth: 0 }
      },
      purchaseTrend: timeBucketsArr,
      topSuppliers: topSuppliersArr,
      purchasesByProduct: purchasesByProduct,
      defectiveSuppliers: defectiveSuppliers,
      detailedTransactions: detailedTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      dateBounds: { minDate, maxDate }
    };

    return NextResponse.json(liveData);
  } catch (err: any) {
    console.error("Purchases API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
