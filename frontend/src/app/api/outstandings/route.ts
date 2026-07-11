import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get('companyName') || 'BKM INDUSTRIES LIMITED';
    const groupFilter = searchParams.get('group'); // 'receivable' or 'payable'

    // 1. Fetch Outstanding Bills
    let query = supabase
      .from('outstanding_bills')
      .select('*')
      .eq('company_name', companyName);
      
    if (groupFilter) {
      query = query.eq('party_group', groupFilter);
    }
    
    const { data: bills, error: billsError } = await query;
    if (billsError) throw billsError;

    // 2. Fetch Ledgers to get credit limits, contact info, etc.
    // In a real app we'd map company_id from companyName, but for now we'll lookup ledger by name
    const partyNames = [...new Set(bills?.map(b => b.party_ledger) || [])];
    const { data: ledgers, error: ledgersError } = await supabase
      .from('ledgers')
      .select('name, credit_limit, credit_days, phone, email, closing_balance');

    const ledgerMap: Record<string, any> = {};
    if (ledgers) {
      ledgers.forEach(l => {
        ledgerMap[l.name] = l;
      });
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();

    // Process data
    const receivables: any[] = [];
    const payables: any[] = [];
    
    let totalReceivables = 0;
    let totalPayables = 0;
    let overdueReceivables = 0;
    let overduePayables = 0;
    let asOnDate: string | null = null;

    // Helper to calculate ageing bucket
    const getAgeBucket = (dueDateStr: string | null) => {
      if (!dueDateStr) return 'Not Due';
      const dueTime = new Date(dueDateStr).getTime();
      if (dueTime >= todayTime) return 'Not Due'; // Not overdue yet
      const diffDays = Math.floor((todayTime - dueTime) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) return '0-30';
      if (diffDays <= 60) return '31-60';
      if (diffDays <= 90) return '61-90';
      return '90+';
    };

    const partySummary: Record<string, any> = {};

    bills?.forEach(bill => {
      const amt = Number(bill.pending_amount) || 0;
      if (amt === 0) return;
      
      if (!asOnDate && bill.as_on_date) {
        asOnDate = bill.as_on_date;
      }

      const isOverdue = bill.due_date && new Date(bill.due_date).getTime() < todayTime;
      const ageBucket = getAgeBucket(bill.due_date);
      
      const party = bill.party_ledger;
      if (!partySummary[party]) {
        const ledInfo = ledgerMap[party] || {};
        partySummary[party] = {
          name: party,
          group: bill.party_group,
          totalPending: 0,
          totalOverdue: 0,
          advances: 0,
          onAccount: 0,
          oldestBillDays: 0,
          creditLimit: ledInfo.credit_limit || 0,
          creditDays: ledInfo.credit_days || 0,
          phone: ledInfo.phone || '',
          email: ledInfo.email || '',
          bills: [],
          buckets: { 'Not Due': 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
        };
      }
      
      const ps = partySummary[party];
      
      if (amt < 0 || bill.bill_type === 'advance') {
        ps.advances += Math.abs(amt);
        ps.totalPending -= Math.abs(amt);
      } 
      else if (bill.bill_type === 'on_account') {
        ps.onAccount += amt;
        ps.totalPending += amt;
      } 
      else {
        ps.totalPending += amt;
        if (isOverdue) {
          ps.totalOverdue += amt;
          const diffDays = Math.floor((todayTime - new Date(bill.due_date).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > ps.oldestBillDays) {
            ps.oldestBillDays = diffDays;
          }
        }
        if (ps.buckets[ageBucket] !== undefined) {
          ps.buckets[ageBucket] += amt;
        }
      }

      ps.bills.push({
        ...bill,
        overdueDays: isOverdue ? Math.floor((todayTime - new Date(bill.due_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
      });
      
      if (bill.party_group === 'receivable') {
        if (amt > 0 && bill.bill_type !== 'advance') totalReceivables += amt;
        else if (amt < 0 || bill.bill_type === 'advance') totalReceivables -= Math.abs(amt);
        if (isOverdue && amt > 0) overdueReceivables += amt;
      } else {
        if (amt > 0 && bill.bill_type !== 'advance') totalPayables += amt;
        else if (amt < 0 || bill.bill_type === 'advance') totalPayables -= Math.abs(amt);
        if (isOverdue && amt > 0) overduePayables += amt;
      }
    });

    Object.values(partySummary).forEach(ps => {
      ps.bills.sort((a: any, b: any) => new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime());
      if (ps.group === 'receivable') {
        receivables.push(ps);
      } else {
        payables.push(ps);
      }
    });
    
    receivables.sort((a, b) => b.totalPending - a.totalPending);
    payables.sort((a, b) => b.totalPending - a.totalPending);

    return NextResponse.json({
      kpis: {
        totalReceivables,
        totalPayables,
        overdueReceivables,
        overduePayables,
        netPosition: totalReceivables - totalPayables,
        asOnDate
      },
      receivables,
      payables
    });
  } catch (err: any) {
    console.error('Outstandings API Error:', err);
    return NextResponse.json({ error: 'Failed to fetch Outstandings data' }, { status: 500 });
  }
}
