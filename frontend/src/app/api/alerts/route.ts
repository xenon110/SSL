import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const activeCompany = cookieStore.get('active-company')?.value || 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)';
    const decodedName = decodeURIComponent(activeCompany);
    
    // Find company ID
    const { data: comp } = await supabase.from('companies').select('id').eq('name', decodedName).single();
    if (!comp) return NextResponse.json([]);
    
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('company_id', comp.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Map to required keys for GenericDashboardView format: id, type, message
    const formattedAlerts = (alerts || []).map((a: any) => ({
      id: a.id,
      type: a.type || 'info',
      message: a.message || a.title
    }));
    
    return NextResponse.json(formattedAlerts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
