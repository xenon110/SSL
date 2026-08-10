import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';
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

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    
    let companyId = null;
    let decodedName = decodeURIComponent(activeCompany);
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (comp) {
      companyId = comp.id;
    } else {
      const { data: bkmComp } = await supabase.from('companies').select('id').eq('name', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)').single();
      if (bkmComp) {
        companyId = bkmComp.id;
      } else {
        return NextResponse.json(getEmptyAuditState());
      }
    }

    // Defensively fetch new tables (graceful fallback if migration not run yet)
    
    // 1. Audit Logs (Activity Log) - Uses user_id/action, no company_id directly usually, but if there's company_id we filter.
    // For now, assuming audit_logs doesn't have company_id, we will filter by something else or just skip filter if not in schema.
    // Actually, sync logs has it. Let's just do vouchers, ledgers, stock_items.
    const { data: activityLogs, error: actErr } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: manualEdits, error: manErr } = await supabase
      .from('manual_adjustments')
      .select('*, audit_logs(*)')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: approvals, error: appErr } = await supabase
      .from('edit_approvals')
      .select('*, manual_adjustments(*, audit_logs(*))')
      .order('requested_at', { ascending: false })
      .limit(50);

    const { data: reportLogs, error: repErr } = await supabase
      .from('report_access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: insightLogs, error: insErr } = await supabase
      .from('insight_audit_logs')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(20);
      
    const { data: reconciliationItems, error: recErr } = await supabase
      .from('reconciliation_items')
      .select('*')
      .limit(50);
    
    // Legacy Voucher Fetch
    const { data: recentVouchers } = await supabase
      .from('vouchers')
      .select('id, tally_guid, voucher_number, voucher_type_name, party_ledger_name, amount, date, is_cancelled, is_deleted, is_optional, updated_at, narration, reference, entered_by, altered_by, voucher_ledgers(*), voucher_inventory(*)')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(50);

    // Kpis
    const { count: totalVouchers } = await supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: cancelledVouchers } = await supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('is_cancelled', true).eq('company_id', companyId);
    const { count: deletedVouchers } = await supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('is_deleted', true).eq('company_id', companyId);
    const { count: totalLedgers } = await supabase.from('ledgers').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
    const { count: totalStockItems } = await supabase.from('stock_items').select('*', { count: 'exact', head: true }).eq('company_id', companyId);

    // 4. Sync Logs
    const { data: syncLogs, error: syncErr } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

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

export const runtime = 'edge';
