
import { serverDb } from '@/server/supabase'
import { embedTexto, embeddingVersionCanais } from './embed'
import {
  listBaseNeedingReembed as listNeedingImpl,
  updateBaseEmbedding as updateEmbImpl,
  listEntradasSemChunk as listSemChunkImpl,
  replaceChunksEntrada as replaceChunksImpl,
  type BaseReembedRow,
} from '@/data/baseConhecimento'
import { chunkarEntrada, LIMIAR_CHUNK_CHARS } from '@/lib/canais/chunkBase'
import { getSetting as getSettingImpl, setSetting as setSettingImpl } from '@/data/settings'


export const BASE_VERSION_KEY = 'base_embedding_version'


export const BASE_CHUNK_KEY = 'base_chunk_version'
export const CHUNK_VERSION = 'v1'

const DEFAULT_BATCH = 50          
const DEFAULT_MAX_PER_TICK = 200  

export type ReembedBaseResult =
  | { status: 'noop'; chunked?: number }                 
  | { status: 'ok'; reembedded: number; done: boolean; chunked?: number }  
  | { status: 'skipped'; chunked?: number }              
  | { status: 'failed'; error: string; reembedded: number; chunked?: number }

export interface ReembedBaseDeps {
  
  currentVersion?: () => string
  
  embed?: (texto: string) => Promise<number[]>
  listNeeding?: (version: string, limit: number, afterId?: string | null) => Promise<BaseReembedRow[]>
  updateEmbedding?: (id: string, embedding: number[], version: string) => Promise<void>
  getSetting?: typeof getSettingImpl
  setSetting?: typeof setSettingImpl
  batchSize?: number
  maxRowsPerTick?: number
  
  listSemChunk?: (limit: number, minChars: number) => Promise<BaseReembedRow[]>
  replaceChunks?: typeof replaceChunksImpl
  
  maxChunkEntradasPerTick?: number
}


async function backfillChunks(deps: ReembedBaseDeps, version: string): Promise<number> {
  const embed = deps.embed ?? embedTexto
  const getSetting = deps.getSetting ?? getSettingImpl
  const setSetting = deps.setSetting ?? setSettingImpl
  const listSemChunk = deps.listSemChunk ?? ((limit, min) => listSemChunkImpl(limit, min))
  const replaceChunks = deps.replaceChunks ?? replaceChunksImpl
  const teto = Math.max(1, deps.maxChunkEntradasPerTick ?? 20)
  
  
  
  
  const marcador = `${CHUNK_VERSION}:${version}`

  try {
    if ((await getSetting(BASE_CHUNK_KEY)) === marcador) return 0
  } catch (e) {
    console.warn('[heartbeat] backfill de chunks: marcador fail-open (segue p/ scan):', e)
  }

  let chunked = 0
  try {
    while (chunked < teto) {
      const rows = await listSemChunk(Math.min(10, teto - chunked), LIMIAR_CHUNK_CHARS)
      if (rows.length === 0) {
        try { await setSetting(BASE_CHUNK_KEY, marcador) } catch (e) {
          console.warn('[heartbeat] backfill de chunks: setSetting fail-open:', e)
        }
        return chunked
      }
      let avancou = false
      for (const r of rows) {
        const pedacos = chunkarEntrada(r.titulo, r.conteudo)
        
        
        
        const alvo = pedacos.length > 0 ? pedacos : [{ ordem: 0, texto: `${r.titulo}\n${r.conteudo}`.trim() }]
        const comVetor: Array<{ ordem: number; texto: string; embedding: number[] }> = []
        for (const p of alvo) {
          const vec = await embed(p.texto)
          if (vec?.length) comVetor.push({ ...p, embedding: vec })
        }
        if (comVetor.length !== alvo.length) continue 
        await replaceChunks(r.id, comVetor)
        chunked++
        avancou = true
      }
      if (!avancou) break 
    }
  } catch (e) {
    
    
    console.warn('[heartbeat] backfill de chunks fail-open:', e instanceof Error ? e.message : e)
  }
  return chunked
}


function textoDaEntrada(r: BaseReembedRow): string {
  return `${r.titulo}\n${r.conteudo}`
}


export async function reembedBaseHeartbeat(deps: ReembedBaseDeps = {}): Promise<ReembedBaseResult> {
  const currentVersion = deps.currentVersion ?? embeddingVersionCanais
  const embed = deps.embed ?? embedTexto
  const listNeeding = deps.listNeeding ?? ((v, lim, after) => listNeedingImpl(serverDb(), v, lim, after))
  const updateEmbedding = deps.updateEmbedding ?? ((id, emb, v) => updateEmbImpl(serverDb(), id, emb, v))
  const getSetting = deps.getSetting ?? getSettingImpl
  const setSetting = deps.setSetting ?? setSettingImpl
  const batchSize = Math.max(1, deps.batchSize ?? DEFAULT_BATCH)
  const maxPerTick = Math.max(batchSize, deps.maxRowsPerTick ?? DEFAULT_MAX_PER_TICK)

  const version = currentVersion()

  
  
  
  let markerBate = false
  try {
    markerBate = (await getSetting(BASE_VERSION_KEY)) === version
  } catch (e) {
    console.warn('[heartbeat] re-embed base: leitura do marcador fail-open (segue p/ scan):', e)
  }
  
  
  
  if (markerBate) return { status: 'noop', chunked: await backfillChunks(deps, version) }

  let reembedded = 0
  let afterId: string | null = null
  try {
    while (reembedded < maxPerTick) {
      const limit = Math.min(batchSize, maxPerTick - reembedded)
      const rows = await listNeeding(version, limit, afterId)
      if (rows.length === 0) {
        
        
        
        try { await setSetting(BASE_VERSION_KEY, version) } catch (e) {
          console.warn('[heartbeat] re-embed base: setSetting do marcador fail-open:', e)
        }
        
        
        return { status: 'ok', reembedded, done: true, chunked: await backfillChunks(deps, version) }
      }

      
      
      for (const r of rows) {
        const vec = await embed(textoDaEntrada(r))
        if (!vec?.length) continue 
        await updateEmbedding(r.id, vec, version)
        
        
        
        
        try { await (deps.replaceChunks ?? replaceChunksImpl)(r.id, []) } catch (e) {
          console.warn('[heartbeat] re-embed base: limpeza de pedaços fail-open:', e)
        }
        reembedded++
        afterId = r.id
      }
      
      
      if (rows.length > 0 && afterId === null) break
    }
    
    return { status: 'ok', reembedded, done: false }
  } catch (e) {
    
    
    
    const msg = e instanceof Error ? e.message : String(e)
    if (reembedded === 0 && /openai_api_key ausente/.test(msg)) return { status: 'skipped' }
    console.warn('[heartbeat] re-embed base fail-open:', msg)
    return { status: 'failed', error: msg, reembedded }
  }
}
