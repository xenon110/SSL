import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const activeCompanyCookie = cookieStore.get('active-company');
    const companyName = activeCompanyCookie?.value;

    if (!companyName) {
      return NextResponse.json({ error: "No active company selected" }, { status: 400 });
    }

    // Get company ID
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', companyName)
      .single();

    if (companyError || !companyData) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Get metrics
    const { data: metricsData, error: metricsError } = await supabase
      .from('dashboard_metrics')
      .select('metrics_data, updated_at')
      .eq('company_id', companyData.id)
      .eq('dashboard_name', 'Executive Summary')
      .single();

    if (metricsError || !metricsData) {
      return NextResponse.json({ error: "No data available yet. Please wait for the sync to complete." }, { status: 404 });
    }

    return NextResponse.json({
      data: metricsData.metrics_data,
      lastUpdated: metricsData.updated_at
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
