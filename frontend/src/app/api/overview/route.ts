import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase.from('vouchers').select('*');
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data: vouchers, error } = await query;
    if (error) throw error;

    let totalSales = 0;
    let totalPurchases = 0;
    let directExpenses = 0;
    let indirectExpenses = 0;
    let receiptCount = 0;
    let totalReceipts = 0;
    let totalPayments = 0;

    const monthlySales: Record<string, number> = {};
    const monthlyPurchases: Record<string, number> = {};
    
    // Grouping variables for charts
    const salesTrend: any[] = [];
    const purchaseTrend: any[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    vouchers?.forEach((v: any) => {
      const type = v.voucher_type_name?.toLowerCase();
      const val = Number(v.amount) || 0;
      const vDate = new Date(v.date);
      const monthKey = monthNames[vDate.getMonth()];

      if (type.includes('sale')) {
        totalSales += val;
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + val;
      }
      else if (type.includes('purchase')) {
        totalPurchases += val;
        monthlyPurchases[monthKey] = (monthlyPurchases[monthKey] || 0) + val;
      }
      else if (type.includes('receipt')) {
        totalReceipts += val;
        receiptCount++;
      }
      else if (type.includes('payment')) {
        totalPayments += val;
      }
      // For expenses, we'd need ledger mappings, but let's approximate based on payments
    });

    const combinedTrend: any[] = [];
    monthNames.forEach(month => {
      const s = monthlySales[month] || 0;
      const p = monthlyPurchases[month] || 0;
      if (s > 0 || p > 0) {
        if (monthlySales[month]) salesTrend.push({ name: month, total: s });
        if (monthlyPurchases[month]) purchaseTrend.push({ name: month, total: p });
        combinedTrend.push({ month, sales: s, purchases: p, margin: s - p });
      }
    });

    const liveData = {
      sales: totalSales,
      purchases: totalPurchases,
      grossProfit: totalSales - totalPurchases - directExpenses,
      netProfit: totalSales - totalPurchases - directExpenses - indirectExpenses,
      totalReceipts,
      totalPayments,
      salesTrend: salesTrend.length ? salesTrend : [{name: 'No Data', total: 0}],
      purchaseTrend: purchaseTrend.length ? purchaseTrend : [{name: 'No Data', total: 0}],
      combinedTrend: combinedTrend.length ? combinedTrend : [{month: 'No Data', sales: 0, purchases: 0, margin: 0}],
      cashFlowData: [
        { name: 'In', in: totalReceipts, out: 0 },
        { name: 'Out', in: 0, out: totalPayments }
      ]
    };

    return NextResponse.json(liveData);
  } catch (err: any) {
    console.error("Overview API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
