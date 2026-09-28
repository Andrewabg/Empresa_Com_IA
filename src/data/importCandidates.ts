
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseCandidate } from '@/lib/imports/candidateText'



export interface ReviewCandidate {
  id: number
  titulo: string
  corpo: string
  tipo: string | null
  tags: string[]
  status: string
}




const HASHES_ATIVOS = ['awaiting_review', 'pending_import', 'committed']


export async function existingContentHashes(
  db: SupabaseClient,
  importIds: string[],
  hashes: string[],
): Promise<Set<string>> {
  if (importIds.length === 0 || hashes.length === 0) return new Set()
  const { data, error } = await db
    .from('memory_candidates')
    .select('content_hash')
    .eq('source_type', 'import')
    .in('source_ref', importIds)
    .in('content_hash', hashes)
    .in('status', HASHES_ATIVOS)
  if (error) throw new Error(`existingContentHashes: ${error.message}`)
  const set = new Set<string>()
  for (const r of data ?? []) {
    const h = (r as { content_hash: string | null }).content_hash
    if (h) set.add(h)
  }
  return set
}




export async function listReviewCandidates(
  db: SupabaseClient,
  importId: string,
): Promise<ReviewCandidate[]> {
  const { data, error } = await db
    .from('memory_candidates')
    .select('id, raw_content, suggested_type, suggested_tags, status')
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'awaiting_review')
    .order('id', { ascending: true })
  if (error) throw new Error(`listReviewCandidates: ${error.message}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => {
    const { titulo, corpo } = parseCandidate(r.raw_content ?? '')
    return {
      id: r.id as number,
      titulo,
      corpo,
      tipo: r.suggested_type as string | null,
      tags: (r.suggested_tags as string[]) ?? [],
      status: r.status as string,
    }
  })
}


export async function countAwaitingReview(
  db: SupabaseClient,
  importId: string,
): Promise<number> {
  const { count, error } = await db
    .from('memory_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'awaiting_review')
  if (error) return 0
  return count ?? 0
}




export async function editCandidate(
  db: SupabaseClient,
  importId: string,
  candidateId: number,
  rawContent: string,
  suggestedTags?: string[],
): Promise<boolean> {
  const patch: { raw_content: string; suggested_tags?: string[] } = { raw_content: rawContent }
  if (suggestedTags !== undefined) patch.suggested_tags = suggestedTags
  const { data, error } = await db
    .from('memory_candidates')
    .update(patch)
    .eq('id', candidateId)
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'awaiting_review')
    .select('id')
  if (error) throw new Error(`editCandidate: ${error.message}`)
  return Array.isArray(data) && data.length > 0
}


export async function approveCandidate(
  db: SupabaseClient,
  importId: string,
  candidateId: number,
): Promise<boolean> {
  const { data, error } = await db
    .from('memory_candidates')
    .update({ status: 'pending_import' })
    .eq('id', candidateId)
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'awaiting_review')
    .select('id')
  if (error) throw new Error(`approveCandidate: ${error.message}`)
  return Array.isArray(data) && data.length > 0
}


export async function rejectCandidate(
  db: SupabaseClient,
  importId: string,
  candidateId: number,
): Promise<boolean> {
  const { data, error } = await db
    .from('memory_candidates')
    .update({ status: 'discarded' })
    .eq('id', candidateId)
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'awaiting_review')
    .select('id')
  if (error) throw new Error(`rejectCandidate: ${error.message}`)
  return Array.isArray(data) && data.length > 0
}




export async function approveAll(
  db: SupabaseClient,
  importId: string,
): Promise<number> {
  const { data, error } = await db
    .from('memory_candidates')
    .update({ status: 'pending_import' })
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'awaiting_review')
    .select('id')
  if (error) throw new Error(`approveAll: ${error.message}`)
  return Array.isArray(data) ? data.length : 0
}


export async function rejectAll(
  db: SupabaseClient,
  importId: string,
): Promise<number> {
  const { data, error } = await db
    .from('memory_candidates')
    .update({ status: 'discarded' })
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'awaiting_review')
    .select('id')
  if (error) throw new Error(`rejectAll: ${error.message}`)
  return Array.isArray(data) ? data.length : 0
}


export async function approveSelected(
  db: SupabaseClient,
  importId: string,
  ids: number[],
): Promise<number> {
  if (ids.length === 0) return 0
  const { data, error } = await db
    .from('memory_candidates')
    .update({ status: 'pending_import' })
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'awaiting_review')
    .in('id', ids)
    .select('id')
  if (error) throw new Error(`approveSelected: ${error.message}`)
  return (data ?? []).length
}


export async function rejectSelected(
  db: SupabaseClient,
  importId: string,
  ids: number[],
): Promise<number> {
  if (ids.length === 0) return 0
  const { data, error } = await db
    .from('memory_candidates')
    .update({ status: 'discarded' })
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'awaiting_review')
    .in('id', ids)
    .select('id')
  if (error) throw new Error(`rejectSelected: ${error.message}`)
  return (data ?? []).length
}
