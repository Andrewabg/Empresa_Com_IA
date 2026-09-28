
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemoryCandidate } from '../db/types'


export const CURATOR_MAX_ATTEMPTS = 3

export const CURATOR_RETRY_BACKOFF_MS = 5 * 60_000


export type RetryCandidate = MemoryCandidate & { attempts: number; last_attempt_at: string | null }


export async function listRetryableCandidates(
  db: SupabaseClient,
  cutoffIso: string,
  limit = 25,
  max = CURATOR_MAX_ATTEMPTS,
): Promise<RetryCandidate[]> {
  const { data, error } = await db
    .from('memory_candidates')
    .select('*')
    .eq('status', 'error')
    .lt('attempts', max)
    .or(`last_attempt_at.is.null,last_attempt_at.lt.${cutoffIso}`)
    .order('last_attempt_at', { ascending: true, nullsFirst: true })
    .limit(limit)
  if (error) throw new Error(`listRetryableCandidates: ${error.message}`)
  return (data ?? []) as RetryCandidate[]
}


export async function claimErrorCandidate(db: SupabaseClient, id: number): Promise<RetryCandidate | null> {
  const { data, error } = await db
    .from('memory_candidates')
    .update({ status: 'pending', claimed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'error')
    .select()
  if (error) throw new Error(`claimErrorCandidate ${id}: ${error.message}`)
  return data && data.length === 1 ? (data[0] as RetryCandidate) : null
}


export async function markCandidateFailure(
  db: SupabaseClient,
  id: number,
  priorAttempts: number,
  errorMessage: string,
  max = CURATOR_MAX_ATTEMPTS,
): Promise<{ status: 'error' | 'dead'; attempts: number }> {
  const attempts = priorAttempts + 1
  const status: 'error' | 'dead' = attempts >= max ? 'dead' : 'error'
  const { error } = await db
    .from('memory_candidates')
    .update({
      status,
      attempts,
      last_attempt_at: new Date().toISOString(),
      result: { error: errorMessage, attempts },
    })
    .eq('id', id)
  if (error) throw new Error(`markCandidateFailure ${id}: ${error.message}`)
  return { status, attempts }
}


export async function countDeadCandidates(db: SupabaseClient): Promise<number> {
  const { count, error } = await db
    .from('memory_candidates')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'dead')
  if (error) throw new Error(`countDeadCandidates: ${error.message}`)
  return count ?? 0
}
