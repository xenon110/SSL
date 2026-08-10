import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
import { cookies } from 'next/headers';

const getEmptyOutstandingsState = () => ({
  kpis: {
    totalReceivables: 0,
    totalPayables: 0,
    overdueReceivables: 0,
    overduePayables: 0,
    netPosition: 0,
    asOnDate: null
  },
  receivables: [],
  payables: []
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupFilter = searchParams.get('group'); // 'receivable' or 'payable'
    const endDate = searchParams.get('endDate');

    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value;
    const companyName = activeCompany ? decodeURIComponent(activeCompany) : searchParams.get('companyName') || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';

    // Verify company exists
    const { data: comp } = await supabase.from('companies').select('id').eq('name', companyName).single();
    if (!comp) {
      return NextResponse.json(getEmptyOutstandingsState());
    }

    // 1. Fetch from Materialized View (Pre-calculated in PostgreSQL)
    let query = supabase
      .from('mv_party_outstandings')
      .select('*')
      .eq('company_name', companyName);
      
    if (groupFilter) {
      query = query.eq('party_group', groupFilter);
    }
    
    // Note: Filtering by endDate on a materialized view isn't perfect unless the MV tracks bills individually. 
    // If exact point-in-time filtering is required, a SQL function (RPC) should be used.
    // For now, we return the pre-calculated latest data.
    
    const { data: mvData, error: mvError } = await fetchAllData(query);
    if (mvError) {
        // Fallback or handle error. If the MV doesn't exist yet, this will fail.
        console.error('Materialized view fetch error. Ensure mv_party_outstandings is created:', mvError);
        throw mvError;
    }

    // 2. Fetch Ledgers to get credit limits, contact info, etc.
    const { data: ledgers, error: ledgersError } = await supabase
      .from('ledgers')
      .select('name, credit_limit, credit_days, phone, email, closing_balance, parent_group');

    const ledgerMap: Record<string, any> = {};
    if (ledgers) {
      (ledgers || []).forEach(l => {
        ledgerMap[l.name] = l;
      });
    }

    // Process data
    const receivables: any[] = [];
    const payables: any[] = [];
    
    let totalReceivables = 0;
    let totalPayables = 0;
    let overdueReceivables = 0;
    let overduePayables = 0;
    let asOnDate: string | null = null;

    (mvData || []).forEach(row => {
      const party = row.party_ledger;
      const ledInfo = ledgerMap[party] || {};
      
      if (!asOnDate && row.as_on_date) {
        asOnDate = row.as_on_date;
      }
      
      const ps = {
        name: party,
        group: row.party_group,
        parentGroup: ledInfo.parent_group || (row.party_group === 'receivable' ? 'Sundry Debtors' : 'Sundry Creditors'),
        totalPending: Number(row.total_pending) || 0,
        totalOverdue: Number(row.total_overdue) || 0,
        advances: Number(row.advances) || 0,
        onAccount: Number(row.on_account) || 0,
        oldestBillDays: Number(row.oldest_bill_days) || 0,
        creditLimit: ledInfo.credit_limit || 0,
        creditDays: ledInfo.credit_days || 0,
        phone: ledInfo.phone || '',
        email: ledInfo.email || '',
        bills: [], // Bills are omitted to save memory. Fetch them on-demand via a separate API if needed.
        buckets: {
          'Not Due': Number(row.bucket_not_due) || 0,
          '0-30': Number(row.bucket_0_30) || 0,
          '31-60': Number(row.bucket_31_60) || 0,
          '61-90': Number(row.bucket_61_90) || 0,
          '90+': Number(row.bucket_90_plus) || 0
        }
      };

      if (row.party_group === 'receivable') {
        receivables.push(ps);
        totalReceivables += ps.totalPending;
        overdueReceivables += ps.totalOverdue;
      } else {
        payables.push(ps);
        totalPayables += ps.totalPending;
        overduePayables += ps.totalOverdue;
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

export const runtime = 'edge';
