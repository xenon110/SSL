import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

const getEmptyAuditState = () => ({
  activityLogs: [],
  manualEdits: [],
  approvals: [],
  syncLogs: [],
  reportLogs: [],
  insightLogs: [],
  recentVouchers: [],
  reconciliationItems: [],
  kpis: {
    totalVouchers: 0,
    cancelledVouchers: 0,
    totalLedgers: 0,
    totalStockItems: 0,
    lastSync: null
  },
  migrationStatus: {
    tablesCreated: false
  }
});

export async function GET() {
  try {
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    
    let companyId = null;
    let decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (comp) {
      companyId = comp.id;
    } else {
      return NextResponse.json(getEmptyAuditState());
    }

    // Parallelize all the independent queries
    const [
      { data: activityLogs, error: actErr },
      { data: manualEdits, error: manErr },
      { data: approvals, error: appErr },
      { data: reportLogs, error: repErr },
      { data: insightLogs, error: insErr },
      { data: reconciliationItems, error: recErr },
      { data: recentVouchers },
      { count: totalVouchers },
      { count: cancelledVouchers },
      { count: deletedVouchers },
      { count: totalLedgers },
      { count: totalStockItems },
      { data: syncLogs }
    ] = await Promise.all([
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('manual_adjustments').select('*, audit_logs(*)').order('created_at', { ascending: false }).limit(50),
      supabase.from('edit_approvals').select('*, manual_adjustments(*, audit_logs(*))').order('requested_at', { ascending: false }).limit(50),
      supabase.from('report_access_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('insight_audit_logs').select('*').order('generated_at', { ascending: false }).limit(20),
      supabase.from('reconciliation_items').select('*').limit(50),
      supabase.from('vouchers').select('id, tally_guid, voucher_number, voucher_type_name, party_ledger_name, amount, date, is_cancelled, is_deleted, is_optional, updated_at, narration, reference, entered_by, altered_by').eq('company_id', companyId).order('updated_at', { ascending: false }).limit(50),
      supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('is_cancelled', true).eq('company_id', companyId),
      supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('is_deleted', true).eq('company_id', companyId),
      supabase.from('ledgers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('stock_items').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(20)
    ]);

    return NextResponse.json({
      activityLogs: activityLogs || [],
      manualEdits: manualEdits || [],
      approvals: approvals || [],
      syncLogs: syncLogs || [],
      reportLogs: reportLogs || [],
      insightLogs: insightLogs || [],
      recentVouchers: recentVouchers || [],
      reconciliationItems: reconciliationItems || [],
      kpis: {
        totalVouchers: totalVouchers || 0,
        cancelledVouchers: (cancelledVouchers || 0) + (deletedVouchers || 0),
        totalLedgers: totalLedgers || 0,
        totalStockItems: totalStockItems || 0,
        lastSync: syncLogs && syncLogs.length > 0 ? syncLogs[0] : null
      },
      migrationStatus: {
        tablesCreated: !actErr && !manErr && !appErr && !repErr && !insErr && !recErr
      }
    });

  } catch (error: any) {
    console.error('Audit API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// export const runtime = 'edge';
