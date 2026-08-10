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

    // Fetch all sales vouchers
    const query = supabase
      .from('vouchers')
      .select('date, amount, party_ledger_name')
      .eq('company_id', comp.id)
      .eq('is_deleted', false)
      .eq('is_cancelled', false)
      .eq('is_optional', false)
      .or('voucher_type_name.ilike.%sales%,voucher_type_name.ilike.%pos invoice%');

    const { data: vouchers, error } = await fetchAllData(query);

    if (error) {
      throw error;
    }

    if (!vouchers || vouchers.length === 0) {
      return NextResponse.json({
        data: {
          "Revenue Today": 0,
          "Revenue This Month": 0,
          "Revenue Last Month": 0,
          "Revenue This Quarter": 0,
          "Revenue This Year": 0,
          "Average Invoice Value": 0,
          "Number of Sales": 0,
          "Revenue Growth %": "0.0%",
          "Repeat Customer %": "0.0%",
        }
      });
    }

    const now = new Date();
    // For reliable date comparisons, normalize to YYYY-MM-DD
    const todayStr = now.toISOString().split('T')[0];
    
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthStr = lastMonthDate.toISOString().slice(0, 7); // YYYY-MM
    
    const currentMonthStr = now.toISOString().slice(0, 7);
    
    const currentQuarter = Math.floor(currentMonth / 3);
    const currentYearStr = currentYear.toString();

    let revenueToday = 0;
    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let revenueThisQuarter = 0;
    let revenueThisYear = 0;
    
    let totalRevenue = 0;
    
    const customerTxCounts: Record<string, number> = {};

    vouchers.forEach((v: any) => {
      const amt = Number(v.amount) || 0;
      const d = v.date; // Format: YYYY-MM-DD
      
      totalRevenue += amt;
      
      if (d === todayStr) {
        revenueToday += amt;
      }
      
      if (d.startsWith(currentMonthStr)) {
        revenueThisMonth += amt;
      }
      
      if (d.startsWith(lastMonthStr)) {
        revenueLastMonth += amt;
      }
      
      if (d.startsWith(currentYearStr)) {
        revenueThisYear += amt;
      }
      
      // Quarter logic
      const vDate = new Date(d);
      if (vDate.getFullYear() === currentYear && Math.floor(vDate.getMonth() / 3) === currentQuarter) {
        revenueThisQuarter += amt;
      }

      // Customer count for repeat customer %
      const customer = v.party_ledger_name || "Cash";
      customerTxCounts[customer] = (customerTxCounts[customer] || 0) + 1;
    });

    const numberOfSales = vouchers.length;
    const averageInvoiceValue = numberOfSales > 0 ? (totalRevenue / numberOfSales) : 0;
    
    let revenueGrowth = 0;
    if (revenueLastMonth > 0) {
      revenueGrowth = ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
    }

    const uniqueCustomers = Object.keys(customerTxCounts).length;
    let repeatCustomers = 0;
    Object.values(customerTxCounts).forEach(count => {
      if (count > 1) repeatCustomers++;
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
