import { NextResponse } from 'next/server';
import { supabase, fetchAllData } from '@/lib/supabase';

export async function GET() {
  try {
    // Check vouchers
    const { data: vouchers, error: vErr, count: vCount } = await supabase
      .from('vouchers')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    // Check ledgers
    const { data: ledgers, error: lErr, count: lCount } = await supabase
      .from('ledgers')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    return NextResponse.json({
      vouchers: {
        count: vCount,
        error: vErr?.message || null,
        sample: vouchers?.slice(0, 2) || []
      },
      ledgers: {
        count: lCount,
        error: lErr?.message || null,
        sample: ledgers?.slice(0, 2) || []
      },
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
