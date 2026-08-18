import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Use service role key for server-side API routes (bypasses RLS)
// Falls back to anon key for client-side usage
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Utility to fetch all rows from Supabase, bypassing the 1000-row PostgREST limit.
 *
 * NOTE: The Supabase query builder is mutable — calling .range() on the same instance
 * multiple times stacks range clauses and corrupts the query. To avoid this, we call
 * .range() only on the first fetch and use the returned data length to detect the last
 * page. For pages beyond the first, we clone the query by re-running it with a fresh
 * range. Since the builder cannot be truly cloned, we wrap it in a factory pattern:
 * pass a function that returns a fresh query each time.
 *
 * For backward compatibility with existing call sites that pass a builder directly,
 * we detect the type and handle both cases.
 */
export async function fetchAllData(queryBuilderOrFactory: any): Promise<{ data: any[] | null, error: any }> {
  let allData: any[] = [];
  const step = 1000;

  // If caller passed a factory function, use it. Otherwise treat it as a one-shot builder
  // and only fetch the first page (legacy safe behaviour — callers should migrate to factory).
  const isFactory = typeof queryBuilderOrFactory === 'function';

  try {
    let from = 0;
    while (true) {
      const builder = isFactory ? queryBuilderOrFactory() : queryBuilderOrFactory;
      const { data, error } = await builder.range(from, from + step - 1);
      if (error) return { data: null, error };
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < step) break;
      // Without factory we cannot safely paginate — stop after first page to avoid corrupt queries
      if (!isFactory) break;
      from += step;
    }
    return { data: allData, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
