
import type { SupabaseClient } from '@supabase/supabase-js'


export async function pathsComPrPendente(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db
    .from('approvals')
    .select('path')
    .eq('kind', 'brain_pr')
    .eq('status', 'pending')
    .not('path', 'is', null)
  if (error) throw new Error(`pathsComPrPendente: ${error.message}`)

  const out = new Set<string>()
  for (const row of (data ?? []) as Array<{ path: string | null }>) {
    const p = row.path?.trim()
    if (p) out.add(p)
  }
  return out
}
