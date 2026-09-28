
import { getBrain as getBrainDefault, NotConfiguredError, type Brain } from './runtime'
import { reconcileResilient } from './reconcileResilient'
import { resgatarNotasSemMd } from './resgateNotasSemMd'
import { withCloneLock } from './cloneLock'

export type BrainReconcileResult =
  | { status: 'ok'; mode: 'full' | 'incremental' | 'noop' }
  | { status: 'skipped' } 
  | { status: 'failed'; error: string }

export interface BrainReconcileDeps {
  getBrain?: () => Promise<Brain>
  
  reconcile?: (b: Brain) => Promise<'full' | 'incremental' | 'noop'>
  
  resgatar?: (b: Brain) => Promise<unknown>
}

export async function runBrainReconcileHeartbeat(deps: BrainReconcileDeps = {}): Promise<BrainReconcileResult> {
  const getBrain = deps.getBrain ?? getBrainDefault
  const reconcile = deps.reconcile ?? ((b: Brain) => reconcileResilient(b.db, b.repo, b.sync, b.embedder.version()))
  const resgatar = deps.resgatar ?? ((b: Brain) => resgatarNotasSemMd(b.repo))
  try {
    const b = await getBrain()
    
    
    
    
    
    
    const mode = await withCloneLock(async () => {
      
      
      
      await resgatar(b)
      return reconcile(b)
    })
    return { status: 'ok', mode }
  } catch (e) {
    if (e instanceof NotConfiguredError) return { status: 'skipped' }
    console.warn('[heartbeat] reconcile do Cérebro fail-open:', e instanceof Error ? e.message : e)
    return { status: 'failed', error: e instanceof Error ? e.message : String(e) }
  }
}
