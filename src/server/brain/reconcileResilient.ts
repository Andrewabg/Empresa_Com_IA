
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BrainRepo } from '../../brain/repo'
import type { Sync } from '../../brain/sync'
import { reconcile } from '../../webhook/reconcile'


export function isStaleShaError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('bad object') ||
    msg.includes('bad revision') ||
    msg.includes('unknown revision') ||
    msg.includes('not a valid object name') ||
    msg.includes('ambiguous argument')
  )
}


export async function reconcileResilient(
  db: SupabaseClient,
  repo: BrainRepo,
  sync: Sync,
  embeddingVersion: string,
): Promise<'full' | 'incremental' | 'noop'> {
  try {
    return await reconcile(db, repo, sync, embeddingVersion)
  } catch (err) {
    if (!isStaleShaError(err)) throw err
    console.warn(
      '[reconcileResilient] last_synced_sha não existe no clone (repo recriado/force-push?) — zerando sync_state p/ syncFull limpo:',
      err instanceof Error ? err.message : err,
    )
    
    const { error } = await db.from('sync_state').update({ last_synced_sha: null }).eq('id', 1)
    if (error) throw new Error(`reconcileResilient reset sync_state: ${error.message}`)
    
    return await reconcile(db, repo, sync, embeddingVersion)
  }
}
