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

    // Fetch from Materialized Views concurrently
    const [
      { data: supplierPurchases },
      { data: productPurchases },
      { data: incomeExpense }
    ] = await Promise.all([
      fetchAllData(supabase.from('mv_supplier_purchases').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('mv_product_purchases').select('*').eq('company_id', companyId)),
      fetchAllData(supabase.from('mv_income_expense').select('*').eq('company_id', companyId).in('tx_type', ['EXPENSE']))
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
    
    // Calculate dependency percentage
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

    // Trend from mv_income_expense (Purchase Accounts)
    const timeBuckets: Record<string, { label: string, sortKey: number, spend: number }> = {};
    (incomeExpense || []).forEach((row: any) => {
        // We look for ledgers that sound like purchases (mapped dynamically in Sync Agent, but we can aggregate all 'Purchase Accounts')
        // We will just aggregate the monthly net_amount for all expense ledgers as a proxy for trend if no purchase accounts exist,
        // but ideally we only want Purchases. 
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

    const timeBucketsArr = Object.values(timeBuckets).sort((a, b) => a.sortKey - b.sortKey).map(t => ({
        month: t.label,
        spend: t.spend,
        budget: t.spend * 1.1
    }));

    return NextResponse.json({
      kpis: {
        totalPurchases: { value: totalPurchases, growth: 0 }, 
        avgOrderValue: { value: totalTxCount > 0 ? totalPurchases / totalTxCount : 0, growth: 0 },
        activeSuppliers: { value: topSuppliersArr.length, growth: 0 },
        pendingOrders: { value: 0, growth: 0 } // Pending orders excluded for performance
      },
      purchaseTrend: timeBucketsArr,
      topSuppliers: topSuppliersArr,
      purchasesByProduct: purchasesByProduct,
      defectiveSuppliers: defectiveSuppliers,
      detailedTransactions: [], // Omitted to save edge bandwidth
      dateBounds: { minDate: null, maxDate: null }
    });
  } catch (err: any) {
    console.error("Purchases API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
