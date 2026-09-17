import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';

    const decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();

    if (!comp) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (startDate || endDate) {
      let vQuery = supabase
        .from('vouchers')
        .select('date, amount, voucher_type_name, party_ledger_name')
        .eq('company_id', comp.id)
        .eq('is_cancelled', false)
        .eq('is_deleted', false)
        .ilike('voucher_type_name', '%sales%');

      if (startDate) vQuery = vQuery.gte('date', startDate);
      if (endDate) vQuery = vQuery.lte('date', endDate);

      const { data: periodSales } = await fetchAllData(vQuery);

      if (!periodSales || periodSales.length === 0) {
        return NextResponse.json({
          data: {
            "Total Revenue (Period)": 0,
            "Number of Sales": 0,
            "Average Invoice Value": 0,
            "Unique Customers": 0,
            "Repeat Customer %": "0.0%",
            "Revenue Growth %": "0.0%",
            "is_empty": true
          }
        });
      }

      let periodRevenue = 0;
      const customers: string[] = [];
      const customerSalesMap: Record<string, number> = {};

      periodSales.forEach((r: any) => {
        const amt = Number(r.amount) || 0;
        periodRevenue += amt;
        if (r.party_ledger_name) {
          customers.push(r.party_ledger_name);
          customerSalesMap[r.party_ledger_name] = (customerSalesMap[r.party_ledger_name] || 0) + amt;
        }
      });

      const customerCountMap: Record<string, number> = {};
      customers.forEach(c => {
        customerCountMap[c] = (customerCountMap[c] || 0) + 1;
      });

      const uniqueCustomers = Object.keys(customerCountMap).length;
      const repeatCustomers = Object.values(customerCountMap).filter(cnt => cnt > 1).length;
      const repeatCustomerPercent = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;
      const avgInvoice = periodSales.length > 0 ? periodRevenue / periodSales.length : 0;

      const sortedCustomers = Object.entries(customerSalesMap).sort((a, b) => b[1] - a[1]);
      const topCustomer = sortedCustomers[0] ? sortedCustomers[0][0] : "N/A";
      const topCustomerSales = sortedCustomers[0] ? sortedCustomers[0][1] : 0;

      return NextResponse.json({
        data: {
          "Total Revenue (Period)": periodRevenue,
          "Number of Sales": periodSales.length,
          "Average Invoice Value": avgInvoice,
          "Unique Customers": uniqueCustomers,
          "Repeat Customer %": `${repeatCustomerPercent.toFixed(1)}%`,
          "Top Customer Sales": topCustomerSales,
          "Top Customer": topCustomer,
          "is_empty": false
        }
      });
    }

    // Default lifetime overview
    const { data: dailySales } = await fetchAllData(
      supabase.from('mv_daily_sales').select('date, total_sales, voucher_count').eq('company_id', comp.id)
    );

    const { data: customerSales } = await fetchAllData(
      supabase.from('mv_customer_sales').select('tx_count').eq('company_id', comp.id)
    );

    let totalRevenue = 0;
    let numberOfSales = 0;

    (dailySales || []).forEach((row: any) => {
      totalRevenue += Number(row.total_sales) || 0;
      numberOfSales += Number(row.voucher_count) || 0;
    });

    const averageInvoiceValue = numberOfSales > 0 ? (totalRevenue / numberOfSales) : 0;

    let uniqueCustomers = 0;
    let repeatCustomers = 0;
    (customerSales || []).forEach((c: any) => {
      uniqueCustomers++;
      if (Number(c.tx_count) > 1) repeatCustomers++;
    });
    const repeatCustomerPercent = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    return NextResponse.json({
      data: {
        "Total Revenue": totalRevenue,
        "Average Invoice Value": averageInvoiceValue,
        "Number of Sales": numberOfSales,
        "Repeat Customer %": `${repeatCustomerPercent.toFixed(1)}%`,
      }
    });
  } catch (error: any) {
    console.error("Revenue API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
