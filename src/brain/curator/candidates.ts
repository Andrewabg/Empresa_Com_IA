import { SupabaseClient } from '@supabase/supabase-js'
export const enqueueCandidate = (db: SupabaseClient, c: object) => db.from('memory_candidates').insert(c)
export const pendingCandidates = (db: SupabaseClient) => db.from('memory_candidates').select('*').eq('status', 'pending')
export const resolveCandidate = (db: SupabaseClient, id: number, status: string, result: object) =>
  db.from('memory_candidates').update({ status, result, processed_at: new Date().toISOString() }).eq('id', id)
