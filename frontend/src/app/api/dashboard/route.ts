import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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

const getEmptyState = () => ({
  kpis: { grossSales: { value: 0 }, salesReturns: { value: 0 }, netSales: { value: 0 }, gstCollected: { value: 0 }, pendingOrders: { value: 0 } },
  salesTrend: [], salesByProduct: [], salesByRegion: [], topCustomers: [], churnedCustomers: [], returnsByProduct: []
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    
    const decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (!comp) return NextResponse.json(getEmptyState());
    
    // Fetch aggregated data concurrently
    let salesQuery = supabase.from('mv_daily_sales').select('*').eq('company_id', comp.id);
    if (startDate) salesQuery = salesQuery.gte('date', startDate);
    if (endDate) salesQuery = salesQuery.lte('date', endDate);

    const [
      { data: dailySales },
      { data: productSales },
      { data: regionSales },
      { data: customerSales }
    ] = await Promise.all([
      fetchAllData(salesQuery),
      fetchAllData(supabase.from('mv_product_sales').select('*').eq('company_id', comp.id)),
      fetchAllData(supabase.from('mv_region_sales').select('*').eq('company_id', comp.id)),
      fetchAllData(supabase.from('mv_customer_sales').select('*').eq('company_id', comp.id))
    ]);

    let grossSales = 0;
    let totalReturns = 0;
    const timeBuckets: Record<string, { label: string, sortKey: number, sales: number }> = {};
    
    let minDate: string | null = null;
    let maxDate: string | null = null;

    (dailySales || []).forEach((row: any) => {
        const val = Number(row.total_sales) || 0;
        grossSales += val;
        
        if (!minDate || row.date < minDate) minDate = row.date;
        if (!maxDate || row.date > maxDate) maxDate = row.date;

        const bucket = getTimeBucket(row.date, startDate, endDate);
        if (!timeBuckets[bucket.label]) {
          timeBuckets[bucket.label] = { label: bucket.label, sortKey: bucket.sortKey, sales: 0 };
        }
        timeBuckets[bucket.label].sales += val;
    });

    const timeBucketsArr = Object.values(timeBuckets).sort((a, b) => a.sortKey - b.sortKey).map(t => ({ month: t.label, sales: t.sales }));

    const topCustomersArr = (customerSales || [])
      .map((c: any) => ({ name: c.customer_name, sales: Number(c.total_sales), value: Number(c.total_sales), lastTxDate: c.last_tx_date }))
      .sort((a: any, b: any) => b.sales - a.sales);

    const churnedCustomers = topCustomersArr
      .filter((c: any) => {
        const lastTx = new Date(c.lastTxDate).getTime();
        const daysSinceLast = (new Date().getTime() - lastTx) / (1000 * 3600 * 24);
        return daysSinceLast > 90;
      })
      .slice(0, 10);

    const topProductsArr: any[] = [];
    const returnsByProductArr: any[] = [];
    (productSales || []).forEach((p: any) => {
        const sAmt = Number(p.sales_amount) || 0;
        const rAmt = Number(p.returns_amount) || 0;
        totalReturns += rAmt;
        if (sAmt > 0) {
            topProductsArr.push({ name: p.product_name, sales: sAmt, avgRate: sAmt / (Number(p.sales_qty) || 1) });
        }
        if (rAmt > 0) {
            returnsByProductArr.push({ name: p.product_name, returns: rAmt, qty: Number(p.returns_qty) });
        }
    });

    topProductsArr.sort((a, b) => b.sales - a.sales);
    returnsByProductArr.sort((a, b) => b.returns - a.returns);

    const stateToRegion: Record<string, string> = {
      "Delhi": "North Region", "Haryana": "North Region", "Punjab": "North Region", "Uttar Pradesh": "North Region",
      "Maharashtra": "West Region", "Gujarat": "West Region", "Rajasthan": "West Region",
      "Karnataka": "South Region", "Tamil Nadu": "South Region", "Kerala": "South Region",
      "West Bengal": "East Region", "Bihar": "East Region", "Odisha": "East Region",
      "Madhya Pradesh": "Central Region", "Chhattisgarh": "Central Region"
    };

    const regionMap: Record<string, any> = {};
    (regionSales || []).forEach((r: any) => {
        const stateName = r.state || "Unknown State";
        const regionName = stateToRegion[stateName] || (stateName !== "Unknown State" ? "Other Region" : "Unknown Region");
        
        if (!regionMap[regionName]) {
            regionMap[regionName] = { name: regionName, value: 0, returns: 0, outstanding: 0, invoiceCount: 0, customerCount: 0, states: [] };
        }
        const sSales = Number(r.total_sales) || 0;
        regionMap[regionName].value += sSales;
        regionMap[regionName].returns += Number(r.total_returns) || 0;
        regionMap[regionName].invoiceCount += Number(r.invoice_count) || 0;
        
        regionMap[regionName].states.push({
            name: stateName,
            sales: sSales,
            returns: Number(r.total_returns) || 0,
            invoiceCount: Number(r.invoice_count) || 0
        });
    });

    const salesByRegionArr = Object.values(regionMap).sort((a: any, b: any) => b.value - a.value);

    return NextResponse.json({
      kpis: {
        grossSales: { value: grossSales, growth: 0 },
        salesReturns: { value: totalReturns, growth: 0 },
        netSales: { value: grossSales - totalReturns, growth: 0 },
        gstCollected: { value: 0, growth: 0 }, // Would need another MV to calculate GST properly
        pendingOrders: { value: 0, growth: 0 } // Would need another MV
      },
      salesTrend: timeBucketsArr,
      salesByProduct: topProductsArr,
      salesByRegion: salesByRegionArr,
      topCustomers: topCustomersArr,
      churnedCustomers: churnedCustomers,
      detailedTransactions: [], // Detailed Tx omitted to save edge bandwidth
      pendingOrdersList: [],
      returnsByProduct: returnsByProductArr,
      dateBounds: { minDate, maxDate }
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
