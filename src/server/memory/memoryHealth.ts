
import type { SupabaseClient } from '@supabase/supabase-js'
import { getBrain as getBrainDefault, NotConfiguredError, type Brain } from '../brain/runtime'
import { countDeadCandidates as countDeadCandidatesImpl } from '@/data/curatorRetry'
import { lintDoAcervo } from '@/lib/brain/lintDoAcervo'
import { deveMedirLintAcervo } from '@/lib/brain/freioDoLint'

const DAY_MS = 86_400_000


export const LINT_ACERVO_ULTIMA_MEDICAO_KEY = 'memoria_lint_acervo_ultima_em'


export interface MemoryHealth {
  
  drift?: number
  
  staleCandidates: number
  
  deadCandidates: number
  
  lint?: { altas: number; medias: number; primeiros: string[] }
}

export interface MemoryHealthDeps {
  now?: () => number
  db?: SupabaseClient
  getBrain?: () => Promise<Brain>
  
  countNotesDb?: (db: SupabaseClient) => Promise<number>
  
  listNotePaths?: (brain: Brain) => Promise<string[]>
  
  countStaleCandidates?: (db: SupabaseClient, cutoffIso: string) => Promise<number>
  
  countDeadCandidates?: (db: SupabaseClient) => Promise<number>
  
  listNotesIndex?: (db: SupabaseClient) => Promise<{ id: string; path: string }[]>
  
  listAgentScopes?: (db: SupabaseClient) => Promise<{ agente: string; escopos: string[]; contratadoEm: string }[]>
  
  getUltimaMedicaoLint?: (db: SupabaseClient) => Promise<string | null>
  
  setUltimaMedicaoLint?: (db: SupabaseClient, iso: string) => Promise<void>
}


export async function defaultCountNotesDb(db: SupabaseClient): Promise<number> {
  const { count, error } = await db.from('notes').select('id', { count: 'exact', head: true })
  if (error) throw new Error(`countNotesDb: ${error.message}`)
  return count ?? 0
}


export async function defaultCountStaleCandidates(db: SupabaseClient, cutoffIso: string): Promise<number> {
  const { count, error } = await db
    .from('memory_candidates')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lt('created_at', cutoffIso)
  if (error) throw new Error(`countStaleCandidates: ${error.message}`)
  return count ?? 0
}


export async function defaultListNotesIndex(db: SupabaseClient): Promise<{ id: string; path: string }[]> {
  const { data, error } = await db.from('notes').select('id, path')
  if (error) throw new Error(`listNotesIndex: ${error.message}`)
  return (data ?? []) as { id: string; path: string }[]
}


export async function defaultListAgentScopes(db: SupabaseClient): Promise<{ agente: string; escopos: string[]; contratadoEm: string }[]> {
  const { data, error } = await db.from('agents').select('name, brain_read_scopes, created_at').is('dismissed_at', null)
  if (error) throw new Error(`listAgentScopes: ${error.message}`)
  return (data ?? []).map((r: { name: string; brain_read_scopes: string[] | null; created_at: string }) => ({
    agente: r.name, escopos: r.brain_read_scopes ?? [], contratadoEm: r.created_at,
  }))
}


export async function defaultGetUltimaMedicaoLint(db: SupabaseClient): Promise<string | null> {
  const { data, error } = await db.from('settings').select('value').eq('key', LINT_ACERVO_ULTIMA_MEDICAO_KEY).maybeSingle()
  if (error) throw new Error(`getUltimaMedicaoLint: ${error.message}`)
  return (data?.value as string | null) ?? null
}


export async function defaultSetUltimaMedicaoLint(db: SupabaseClient, iso: string): Promise<void> {
  const { error } = await db.from('settings').upsert({ key: LINT_ACERVO_ULTIMA_MEDICAO_KEY, value: iso, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(`setUltimaMedicaoLint: ${error.message}`)
}


export async function measureDrift(deps: MemoryHealthDeps = {}): Promise<number | undefined> {
  const getBrain = deps.getBrain ?? getBrainDefault
  const listNotePaths = deps.listNotePaths ?? ((b: Brain) => b.repo.listNotePaths())
  const countNotesDb = deps.countNotesDb ?? defaultCountNotesDb
  try {
    const brain = await getBrain()
    const [gitPaths, dbCount] = await Promise.all([listNotePaths(brain), countNotesDb(deps.db ?? brain.db)])
    const drift = Math.abs(gitPaths.length - dbCount)
    if (drift > 0) {
      console.warn(`[memoryHealth] DRIFT Git↔DB: ${gitPaths.length} notas no Git vs ${dbCount} indexadas (Δ=${drift}) — nota órfã aguardando reconcile`)
    }
    return drift
  } catch (e) {
    if (e instanceof NotConfiguredError) return undefined
    console.warn('[memoryHealth] measureDrift fail-open:', e instanceof Error ? e.message : e)
    return undefined
  }
}


export async function measureMemoryHealth(deps: MemoryHealthDeps = {}): Promise<MemoryHealth> {
  const now = deps.now ?? (() => Date.now())
  const countStaleCandidates = deps.countStaleCandidates ?? defaultCountStaleCandidates
  const countDeadCandidates = deps.countDeadCandidates ?? countDeadCandidatesImpl

  
  
  
  
  
  
  const getBrain = deps.getBrain ?? getBrainDefault
  const listNotePaths = deps.listNotePaths ?? ((b: Brain) => b.repo.listNotePaths())
  let brainPromise: Promise<Brain> | null = null
  const getBrainMemo = () => (brainPromise ??= getBrain())
  let gitPathsPromise: Promise<string[]> | null = null
  const listNotePathsMemo = (b: Brain) => (gitPathsPromise ??= listNotePaths(b))

  const drift = await measureDrift({ ...deps, getBrain: getBrainMemo, listNotePaths: listNotePathsMemo })

  let staleCandidates = 0
  let deadCandidates = 0
  const db = deps.db
  if (db) {
    const cutoff = new Date(now() - DAY_MS).toISOString()
    try { staleCandidates = await countStaleCandidates(db, cutoff) } catch (e) { console.warn('[memoryHealth] countStaleCandidates fail-open:', e instanceof Error ? e.message : e) }
    try { deadCandidates = await countDeadCandidates(db) } catch (e) { console.warn('[memoryHealth] countDeadCandidates fail-open:', e instanceof Error ? e.message : e) }
  }
  if (staleCandidates > 0 || deadCandidates > 0) {
    console.warn(`[memoryHealth] fila do Curador: ${staleCandidates} candidata(s) 'pending' > 1 dia (presas) + ${deadCandidates} 'dead' (dead-letter)`)
  }

  
  
  
  
  
  
  
  
  
  
  
  let lint: MemoryHealth['lint']
  try {
    const lintDb = deps.db ?? (await getBrainMemo()).db
    const getUltimaMedicaoLint = deps.getUltimaMedicaoLint ?? defaultGetUltimaMedicaoLint
    const setUltimaMedicaoLint = deps.setUltimaMedicaoLint ?? defaultSetUltimaMedicaoLint
    
    
    const ultimaMedicao = await getUltimaMedicaoLint(lintDb).catch(() => null)
    if (deveMedirLintAcervo(ultimaMedicao, now())) {
      
      
      
      try { await setUltimaMedicaoLint(lintDb, new Date(now()).toISOString()) }
      catch (e) { console.warn('[memoryHealth] marcar medição do lint falhou (fail-open):', e instanceof Error ? e.message : e) }

      const listNotesIndex = deps.listNotesIndex ?? defaultListNotesIndex
      const listAgentScopes = deps.listAgentScopes ?? defaultListAgentScopes
      const brain = await getBrainMemo()
      const gitPaths = await listNotePathsMemo(brain)
      const [notasNoIndice, escoposPorAgente] = await Promise.all([
        listNotesIndex(lintDb), listAgentScopes(lintDb),
      ])
      const achados = lintDoAcervo({ notasNoGit: gitPaths, notasNoIndice, escoposPorAgente, agoraMs: now() })
      const altasAchados = achados.filter((a) => a.severidade === 'alta')
      lint = {
        altas: altasAchados.length,
        medias: achados.length - altasAchados.length,
        primeiros: altasAchados.slice(0, 3).map((a) => a.explicacao),
      }
      if (lint.altas > 0) {
        console.warn(`[memoryHealth] lint do acervo: ${lint.altas} achado(s) ALTA (id divergente / escopo vazio)`)
      }
    }
  } catch (e) {
    if (!(e instanceof NotConfiguredError)) console.warn('[memoryHealth] lint fail-open:', e instanceof Error ? e.message : e)
  }

  return { drift, staleCandidates, deadCandidates, ...(lint ? { lint } : {}) }
}
