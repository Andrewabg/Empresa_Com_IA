
import { getBrain as getBrainDefault, NotConfiguredError, type Brain } from '../brain/runtime'
import {
  listEpisodicNeedingReembed as listNeedingImpl,
  updateEpisodicEmbedding as updateEmbImpl,
  type EpisodicReembedRow,
} from '@/data/episodicMemory'
import { getSetting as getSettingImpl, setSetting as setSettingImpl } from '@/data/settings'


export const EPISODIC_VERSION_KEY = 'episodic_embedding_version'

const DEFAULT_BATCH = 50          
const DEFAULT_MAX_PER_TICK = 200  

export type ReembedResult =
  | { status: 'noop' }                              
  | { status: 'ok'; reembedded: number; done: boolean } 
  | { status: 'skipped' }                           
  | { status: 'failed'; error: string; reembedded: number }

export interface ReembedEpisodicDeps {
  getBrain?: () => Promise<Brain>
  
  currentVersion?: (b: Brain) => string
  
  embed?: (b: Brain, texts: string[]) => Promise<number[][]>
  listNeeding?: (b: Brain, version: string, limit: number, afterId?: string | null) => Promise<EpisodicReembedRow[]>
  updateEmbedding?: (b: Brain, id: string, embedding: number[], version: string) => Promise<void>
  getSetting?: typeof getSettingImpl
  setSetting?: typeof setSettingImpl
  batchSize?: number
  maxRowsPerTick?: number
}


export async function reembedEpisodicHeartbeat(deps: ReembedEpisodicDeps = {}): Promise<ReembedResult> {
  const getBrain = deps.getBrain ?? getBrainDefault
  const currentVersion = deps.currentVersion ?? ((b: Brain) => b.embedder.version())
  const embed = deps.embed ?? ((b: Brain, texts: string[]) => b.embedder.embedAll(texts))
  const listNeeding = deps.listNeeding ?? ((b, v, lim, after) => listNeedingImpl(b.db, v, lim, after))
  const updateEmbedding = deps.updateEmbedding ?? ((b, id, emb, v) => updateEmbImpl(b.db, id, emb, v))
  const getSetting = deps.getSetting ?? getSettingImpl
  const setSetting = deps.setSetting ?? setSettingImpl
  const batchSize = Math.max(1, deps.batchSize ?? DEFAULT_BATCH)
  const maxPerTick = Math.max(batchSize, deps.maxRowsPerTick ?? DEFAULT_MAX_PER_TICK)

  let brain: Brain
  try {
    brain = await getBrain()
  } catch (e) {
    if (e instanceof NotConfiguredError) return { status: 'skipped' }
    console.warn('[heartbeat] re-embed episódico: getBrain fail-open:', e instanceof Error ? e.message : e)
    return { status: 'failed', error: e instanceof Error ? e.message : String(e), reembedded: 0 }
  }

  const version = currentVersion(brain)

  
  
  
  try {
    const marker = await getSetting(EPISODIC_VERSION_KEY)
    if (marker === version) return { status: 'noop' }
  } catch (e) {
    console.warn('[heartbeat] re-embed episódico: leitura do marcador fail-open (segue p/ scan):', e)
  }

  let reembedded = 0
  let afterId: string | null = null
  try {
    while (reembedded < maxPerTick) {
      
      const limit = Math.min(batchSize, maxPerTick - reembedded)
      const rows = await listNeeding(brain, version, limit, afterId)
      if (rows.length === 0) {
        
        
        
        try { await setSetting(EPISODIC_VERSION_KEY, version) } catch (e) {
          console.warn('[heartbeat] re-embed episódico: setSetting do marcador fail-open:', e)
        }
        return { status: 'ok', reembedded, done: true }
      }

      const vecs = await embed(brain, rows.map((r) => r.summary))
      for (let i = 0; i < rows.length; i++) {
        const vec = vecs[i]
        if (!vec?.length) continue 
        await updateEmbedding(brain, rows[i].id, vec, version)
        reembedded++
        afterId = rows[i].id
      }
      
      
      if (rows.length > 0 && afterId === null) break
    }
    
    return { status: 'ok', reembedded, done: false }
  } catch (e) {
    
    
    console.warn('[heartbeat] re-embed episódico fail-open:', e instanceof Error ? e.message : e)
    return { status: 'failed', error: e instanceof Error ? e.message : String(e), reembedded }
  }
}
