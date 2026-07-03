import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 1000;

type FilterFn = (query: any) => any;

/**
 * Fetches ALL rows from a Supabase table, bypassing the default 1000-row limit
 * by paginating in chunks of PAGE_SIZE using offset-based range.
 *
 * IMPORTANT: filters are applied BEFORE `.range()` to avoid override issues.
 *
 * @param table   - The table name to query.
 * @param select  - The columns to select (default "*").
 * @param filters - Optional callback that applies .gte(), .lt(), .order(), etc.
 */
export async function fetchAllRows<T = any>(
  table: string,
  select: string = "*",
  filters?: FilterFn
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;

  while (true) {
    // Build base query, apply user filters first, then add range last.
    let query = supabase.from(table).select(select, { count: "exact" });

    if (filters) {
      query = filters(query);
    }

    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      allRows = allRows.concat(data as T[]);
    }

    // Stop if we received fewer rows than a full page, or reached total count.
    const fetched = allRows.length;
    const total = count ?? null;

    if (!data || data.length < PAGE_SIZE) break;
    if (total !== null && fetched >= total) break;

    from += PAGE_SIZE;
  }

  return allRows;
}
