import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Use service role key for server-side API routes (bypasses RLS)
// Falls back to anon key for client-side usage
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Utility to fetch all rows from Supabase, bypassing the 1000-row PostgREST limit.
 */
export async function fetchAllData(queryBuilder: any): Promise<{ data: any[] | null, error: any }> {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  
  try {
    while (true) {
      const { data, error } = await queryBuilder.range(from, from + step - 1);
      if (error) return { data: null, error };
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < step) break;
      from += step;
    }
    return { data: allData, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
