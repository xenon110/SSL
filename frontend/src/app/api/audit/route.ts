import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'BKM INDUSTRIES LIMITED';

    // Get company ID
    const { data: comp } = await supabase
      .from('companies')
      .select('id')
      .eq('name', company)
      .single();

    const companyId = comp?.id;

    // Defensively fetch new tables (graceful fallback if migration not run yet)
    
    // 1. Audit Logs (Activity Log)
    const { data: activityLogs, error: actErr } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // 2. Manual Adjustments
    const { data: manualEdits, error: manErr } = await supabase
      .from('manual_adjustments')
      .select('*, audit_logs(*)')
      .order('created_at', { ascending: false })
      .limit(50);

    // 3. Edit Approvals
    const { data: approvals, error: appErr } = await supabase
      .from('edit_approvals')
      .select('*, manual_adjustments(*, audit_logs(*))')
      .order('requested_at', { ascending: false })
      .limit(50);

    // 4. Sync Logs
    const { data: syncLogs, error: syncErr } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // 5. Report Logs
    const { data: reportLogs, error: repErr } = await supabase
      .from('report_access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // 6. Insight Logs
    const { data: insightLogs, error: insErr } = await supabase
      .from('insight_audit_logs')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(20);
      
    // 7. Reconciliation Items
    const { data: reconciliationItems, error: recErr } = await supabase
      .from('reconciliation_items')
      .select('*')
      .limit(50);
      
    // Legacy Voucher Fetch (for Reconciliation / backward compatibility)
    const { data: recentVouchers } = await supabase
      .from('vouchers')
      .select('id, tally_guid, voucher_number, voucher_type_name, party_ledger_name, amount, date, is_cancelled, is_deleted, is_optional, updated_at, narration, reference, entered_by, altered_by, voucher_ledgers(*), voucher_inventory(*)')
      .order('updated_at', { ascending: false })
      .limit(50);

    // Kpis
    const { count: totalVouchers } = await supabase.from('vouchers').select('*', { count: 'exact', head: true });
    const { count: cancelledVouchers } = await supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('is_cancelled', 'true');
    const { count: deletedVouchers } = await supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('is_deleted', 'true');
    const { count: totalLedgers } = await supabase.from('ledgers').select('*', { count: 'exact', head: true });
    const { count: totalStockItems } = await supabase.from('stock_items').select('*', { count: 'exact', head: true });

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
