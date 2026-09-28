import { SupabaseClient } from '@supabase/supabase-js'
import { BrainRepo } from '../brain/repo'
import { Sync } from '../brain/sync'

export async function reconcile(db: SupabaseClient, repo: BrainRepo, sync: Sync, embeddingVersion: string): Promise<'full' | 'incremental' | 'noop'> {
  await repo.pull()
  const head = await repo.headSha()
  const { data: ss, error: ssErr } = await db.from('sync_state').select('*').single()
  if (ssErr) throw new Error(`reconcile read sync_state: ${ssErr.message}`)
  if (!ss?.last_synced_sha || ss.embedding_version !== embeddingVersion) { await sync.syncFull(); return 'full' }
  if (ss.last_synced_sha === head) return 'noop'
  await sync.syncIncremental(await repo.changedFiles(ss.last_synced_sha, head), head)
  return 'incremental'
}
