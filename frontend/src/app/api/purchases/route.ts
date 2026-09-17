import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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
  detailedTransactions: [],
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
    let decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (comp) {
      companyId = comp.id;
    } else {
      return NextResponse.json(getEmptyPurchasesState());
    }

    if (startDate || endDate) {
      let vQuery = supabase.from('vouchers')
        .select('id, date, amount, party_ledger_name, voucher_type_name, reference')
        .eq('company_id', companyId)
        .eq('is_cancelled', false)
        .eq('is_deleted', false)
        .ilike('voucher_type_name', '%purchase%');
      if (startDate) vQuery = vQuery.gte('date', startDate);
      if (endDate) vQuery = vQuery.lte('date', endDate);

      let debitQuery = supabase.from('vouchers')
        .select('party_ledger_name, amount')
        .eq('company_id', companyId)
        .ilike('voucher_type_name', '%debit note%');
      if (startDate) debitQuery = debitQuery.gte('date', startDate);
      if (endDate) debitQuery = debitQuery.lte('date', endDate);

      const [
        { data: periodPurchases },
        { data: productPurchases },
        { data: debitNotes }
      ] = await Promise.all([
        fetchAllData(vQuery),
        fetchAllData(supabase.from('mv_product_purchases').select('*').eq('company_id', companyId)),
        fetchAllData(debitQuery)
      ]);

      if (!periodPurchases || periodPurchases.length === 0) {
        return NextResponse.json(getEmptyPurchasesState());
      }

      let totalPurchases = 0;
      const supplierMap: Record<string, number> = {};
      const timeBuckets: Record<string, { label: string, sortKey: number, spend: number }> = {};

      periodPurchases.forEach((row: any) => {
        const val = Number(row.amount) || 0;
        totalPurchases += val;

        if (row.party_ledger_name) {
          supplierMap[row.party_ledger_name] = (supplierMap[row.party_ledger_name] || 0) + val;
        }

        const d = new Date(row.date);
        const label = d.toLocaleDateString('default', { month: 'short', year: '2-digit' });
        const sortKey = d.getTime();
        if (!timeBuckets[label]) {
          timeBuckets[label] = { label, sortKey, spend: 0 };
        }
        timeBuckets[label].spend += val;
      });

      const topSuppliersArr = Object.entries(supplierMap)
        .map(([name, purchases]) => ({
          name,
          purchases,
          sales: purchases,
          dependencyPercentage: totalPurchases > 0 ? (purchases / totalPurchases) * 100 : 0
        }))
        .sort((a, b) => b.purchases - a.purchases);

      const purchaseTrend = Object.values(timeBuckets)
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(t => ({ month: t.label, spend: t.spend }));

      const purchasesByProduct = (productPurchases || [])
        .filter((p: any) => Number(p.purchase_amount) > 0)
        .map((p: any) => ({
            name: p.product_name,
            purchases: Number(p.purchase_amount) || 0,
            avgRate: (Number(p.purchase_amount) || 0) / (Number(p.purchase_qty) || 1)
        }))
        .sort((a, b) => b.purchases - a.purchases);

      const defectiveMap: Record<string, { returns: number, count: number }> = {};
      (debitNotes || []).forEach((r: any) => {
        const p = r.party_ledger_name || 'General Supplier';
        if (!defectiveMap[p]) defectiveMap[p] = { returns: 0, count: 0 };
        defectiveMap[p].returns += Number(r.amount) || 0;
        defectiveMap[p].count += 1;
      });
      const defectiveSuppliers = Object.entries(defectiveMap).map(([name, d]) => ({
        name,
        returns: d.returns,
        count: d.count
      })).sort((a, b) => b.returns - a.returns);

      const detailedTransactions = periodPurchases.slice(0, 100).map((r: any, idx: number) => ({
        id: r.reference || r.id || `PO-${idx + 1}`,
        date: r.date,
        supplier: r.party_ledger_name || 'General Supplier',
        product: 'Raw Materials & Supplies',
        amount: Number(r.amount) || 0,
        qty: 1
      }));

      return NextResponse.json({
        kpis: {
          totalPurchases: { value: totalPurchases, growth: 0 },
          avgOrderValue: { value: periodPurchases.length ? totalPurchases / periodPurchases.length : 0, growth: 0 },
          activeSuppliers: { value: topSuppliersArr.length, growth: 0 },
          pendingOrders: { value: 0, growth: 0 }
        },
        purchaseTrend,
        topSuppliers: topSuppliersArr,
        purchasesByProduct,
        defectiveSuppliers,
        detailedTransactions,
        dateBounds: { minDate: startDate, maxDate: endDate }
      });
    }

    // Fetch from Materialized Views concurrently for lifetime view
    const [
      { data: supplierPurchases },
      { data: productPurchases },
      { data: incomeExpense },
      { data: lifetimeVouchers }
    ] = await Promise.all([
      fetchAllData(supabase.from('mv_supplier_purchases').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('mv_product_purchases').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('mv_income_expense').select('*').eq('company_id', companyId).in('tx_type', ['EXPENSE'])),
      fetchAllData(supabase.from('vouchers').select('id, date, amount, party_ledger_name, reference').eq('company_id', companyId).ilike('voucher_type_name', '%purchase%').order('date', { ascending: false }).limit(100))
    ]);

    let totalPurchases = 0;
    let totalTxCount = 0;

    const topSuppliersArr: any[] = [];
    const defectiveSuppliers: any[] = [];

    (supplierPurchases || []).forEach((row: any) => {
        const purch = Number(row.total_purchases) || 0;
        const returns = Number(row.total_returns) || 0;
        
        totalPurchases += purch;
        totalTxCount += Number(row.tx_count) || 0;

        if (purch > 0) {
            topSuppliersArr.push({ name: row.supplier_name, sales: purch, purchases: purch });
        }
        if (returns > 0) {
            defectiveSuppliers.push({ name: row.supplier_name, returns: returns, count: 1 });
        }
    });

    topSuppliersArr.sort((a, b) => b.purchases - a.purchases);
    defectiveSuppliers.sort((a, b) => b.returns - a.returns);
    
    topSuppliersArr.forEach(s => {
        s.dependencyPercentage = totalPurchases > 0 ? (s.purchases / totalPurchases) * 100 : 0;
    });

    const purchasesByProduct = (productPurchases || [])
      .filter((p: any) => Number(p.purchase_amount) > 0)
      .map((p: any) => ({
          name: p.product_name,
          purchases: Number(p.purchase_amount) || 0,
          avgRate: (Number(p.purchase_amount) || 0) / (Number(p.purchase_qty) || 1)
      }))
      .sort((a: any, b: any) => b.purchases - a.purchases);

    const timeBuckets: Record<string, { label: string, sortKey: number, spend: number }> = {};
    (incomeExpense || []).forEach((row: any) => {
        if (row.ledger_name.toLowerCase().includes('purchase')) {
            const date = new Date(row.tx_month);
            const label = date.toLocaleDateString('default', { month: 'short', year: '2-digit' });
            const sortKey = date.getTime();
            
            if (!timeBuckets[label]) {
                timeBuckets[label] = { label, sortKey, spend: 0 };
            }
            timeBuckets[label].spend += Number(row.net_amount) || 0;
        }
    });

    const purchaseTrend = Object.values(timeBuckets)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(t => ({ month: t.label, spend: t.spend }));

    const detailedTransactions = (lifetimeVouchers || []).map((r: any, idx: number) => ({
      id: r.reference || r.id || `PO-${idx + 1}`,
      date: r.date,
      supplier: r.party_ledger_name || 'General Supplier',
      product: 'Raw Materials & Supplies',
      amount: Number(r.amount) || 0,
      qty: 1
    }));

    return NextResponse.json({
      kpis: {
        totalPurchases: { value: totalPurchases, growth: 0 },
        avgOrderValue: { value: totalTxCount > 0 ? totalPurchases / totalTxCount : 0, growth: 0 },
        activeSuppliers: { value: topSuppliersArr.length, growth: 0 },
        pendingOrders: { value: 0, growth: 0 }
      },
      purchaseTrend,
      topSuppliers: topSuppliersArr,
      purchasesByProduct,
      defectiveSuppliers,
      detailedTransactions,
      dateBounds: { minDate: null, maxDate: null }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
