import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value;
    
    if (!activeCompany) {
      return NextResponse.json({ error: 'No active company selected' }, { status: 400 });
    }

    const decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    
    if (!comp) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Fetch highly aggregated data from Materialized Views instead of raw vouchers
    const { data: dailySales } = await fetchAllData(
        supabase.from('mv_daily_sales').select('date, total_sales, voucher_count').eq('company_id', comp.id)
    );

    const { data: customerSales } = await fetchAllData(
        supabase.from('mv_customer_sales').select('tx_count').eq('company_id', comp.id)
    );

    let revenueToday = 0;
    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let revenueThisQuarter = 0;
    let revenueThisYear = 0;
    let totalRevenue = 0;
    let numberOfSales = 0;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);
    const currentYearStr = currentYear.toString();
    const currentMonthStr = now.toISOString().slice(0, 7);
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

    (dailySales || []).forEach((row: any) => {
        const d = row.date;
        const amt = Number(row.total_sales) || 0;
        const count = Number(row.voucher_count) || 0;

        totalRevenue += amt;
        numberOfSales += count;

        if (d === todayStr) revenueToday += amt;
        if (d.startsWith(currentMonthStr)) revenueThisMonth += amt;
        if (d.startsWith(lastMonthStr)) revenueLastMonth += amt;
        if (d.startsWith(currentYearStr)) revenueThisYear += amt;
        
        const vDate = new Date(d);
        if (vDate.getFullYear() === currentYear && Math.floor(vDate.getMonth() / 3) === currentQuarter) {
            revenueThisQuarter += amt;
        }
    });

    const averageInvoiceValue = numberOfSales > 0 ? (totalRevenue / numberOfSales) : 0;
    
    let revenueGrowth = 0;
    if (revenueLastMonth > 0) {
      revenueGrowth = ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
    }

    let uniqueCustomers = 0;
    let repeatCustomers = 0;
    (customerSales || []).forEach((c: any) => {
        uniqueCustomers++;
        if (Number(c.tx_count) > 1) repeatCustomers++;
    });
    const repeatCustomerPercent = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    return NextResponse.json({
      data: {
        "Revenue Today": revenueToday,
        "Revenue This Month": revenueThisMonth,
        "Revenue Last Month": revenueLastMonth,
        "Revenue This Quarter": revenueThisQuarter,
        "Revenue This Year": revenueThisYear,
        "Average Invoice Value": averageInvoiceValue,
        "Number of Sales": numberOfSales,
        "Revenue Growth %": `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`,
        "Repeat Customer %": `${repeatCustomerPercent.toFixed(1)}%`,
      }
    });
  } catch (error: any) {
    console.error("Revenue API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
