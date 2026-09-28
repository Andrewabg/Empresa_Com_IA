import { listIdleUnreflected, listAtivasLongasSemReflexao } from '@/data/messages'
import { REFLECT_ATIVA_MIN_MSGS } from '@/lib/memory/historyWindow'
import {
  enqueueMemoryJob, existsRollupForDate, listClaimableMemoryJobs, listColdMemoryJobs, refsComFalhaRecente,
  requeueMemoryJob, type MemoryJobKind,
} from '@/data/memoryJobs'
import { createLimiter } from '@/lib/concurrency'
import { readBudgetGate } from '@/data/cost'
import { estourouBudget } from '@/lib/cost-guard'
import { serverDb } from '@/server/supabase'
import { runMemoryJob } from './runMemoryJob'
import { measureMemoryHealth, type MemoryHealth, type MemoryHealthDeps } from './memoryHealth'
import { getSetting, setSetting } from '@/data/settings'
import { listBrandsDoInstall } from '@/data/brands'
import { venceuASemana } from '@/lib/memoria/cadenciaSemanal'


export const CHAVE_KIT_SEMANAL = 'memoria_kit_semanal_em'
import { notificar } from '@/server/proativo/notificar'
import {
  deveAvisarMemoriaPerdida, avisoDeMemoriaPerdida, CHAVE_MORTAS_AVISADAS,
} from '@/lib/memoria/avisoDeMemoriaPerdida'

const DEFAULT_IDLE_MS = 10 * 60_000

const DEFAULT_BACKOFF_FALHA_MS = 6 * 60 * 60_000
const DEFAULT_COLD_MS = 5 * 60_000
const DEFAULT_LIMIT = 25
const DEFAULT_POOL = 5

export interface MemoryHeartbeatDeps {
  now?: () => number
  today?: string
  idleMs?: number
  coldMs?: number
  limit?: number
  pool?: number
  listIdle?: (cutoffIso: string, limit: number) => Promise<{ id: string }[]>
  
  listLongas?: (cutoffIso: string, minMsgs: number, limit: number) => Promise<{ id: string }[]>
  
  listFalhas?: (kind: MemoryJobKind, cutoffIso: string) => Promise<Set<string>>
  backoffFalhaMs?: number
  
  listBrands?: () => Promise<{ id: string; operator_id: string }[]>
  
  minMsgsAtiva?: number
  existsRollup?: (date: string) => Promise<boolean>
  enqueue?: (kind: MemoryJobKind, ref: string) => Promise<{ enqueued: boolean }>
  listClaimable?: () => Promise<{ id: string }[]>
  listCold?: (cutoffIso: string) => Promise<{ id: string; attempts: number }[]>
  requeue?: (id: string, attempts: number, lastError: string) => Promise<void>
  fire?: (id: string) => void
  
  checkBudget?: () => Promise<{ spentUsd: number; budgetUsd: number }>
  
  measureHealth?: ((deps: MemoryHealthDeps) => Promise<MemoryHealth>) | null
  
  db?: import('@supabase/supabase-js').SupabaseClient
  
  getSetting?: (k: string) => Promise<string | null>
  setSetting?: (k: string, v: string) => Promise<void>
  notificar?: (i: Parameters<typeof notificar>[0]) => Promise<{ created: boolean }>
}

export interface MemoryHeartbeatResult {
  reflectEnqueued: number; rollupEnqueued: number; fired: number; requeued: number
  
  kitEnqueued?: number
  budgetSkipped?: boolean
  
  health?: MemoryHealth
}


export async function runMemoryHeartbeat(deps: MemoryHeartbeatDeps = {}): Promise<MemoryHeartbeatResult> {
  const now = deps.now ?? (() => Date.now())
  const today = deps.today ?? new Date(now()).toISOString().slice(0, 10)
  const idleMs = deps.idleMs ?? DEFAULT_IDLE_MS
  const coldMs = deps.coldMs ?? DEFAULT_COLD_MS
  const limit = deps.limit ?? DEFAULT_LIMIT
  const listIdle = deps.listIdle ?? ((cutoff: string, n: number) => listIdleUnreflected(cutoff, n))
  
  
  
  let comFalhaRecente = new Set<string>()
  try {
    comFalhaRecente = await (deps.listFalhas ?? refsComFalhaRecente)('reflect', new Date(now() - (deps.backoffFalhaMs ?? DEFAULT_BACKOFF_FALHA_MS)).toISOString())
  } catch (e) { console.warn('[memoryHeartbeat] backoff de falha fail-open:', e) }

  const listLongas = deps.listLongas ?? ((cutoff: string, min: number, n: number) => listAtivasLongasSemReflexao(cutoff, min, n))
  const minMsgsAtiva = deps.minMsgsAtiva ?? REFLECT_ATIVA_MIN_MSGS
  const existsRollup = deps.existsRollup ?? existsRollupForDate
  const enqueue = deps.enqueue ?? enqueueMemoryJob
  const listClaimable = deps.listClaimable ?? listClaimableMemoryJobs
  const listCold = deps.listCold ?? listColdMemoryJobs
  const requeue = deps.requeue ?? requeueMemoryJob
  const pool = deps.pool ?? DEFAULT_POOL
  const limiter = createLimiter(pool)
  const fire = deps.fire ?? ((id: string) => { void limiter.run(() => runMemoryJob(id)).catch((e) => console.warn('[memoryHeartbeat] fire falhou (não-fatal):', e)) })

  let reflectEnqueued = 0, rollupEnqueued = 0, fired = 0, requeued = 0, kitEnqueued = 0

  
  
  
  
  
  
  
  try {
    const read = deps.checkBudget ?? readBudgetGate
    const { spentUsd, budgetUsd } = await read()
    if (estourouBudget(spentUsd, budgetUsd)) {
      return { reflectEnqueued: 0, rollupEnqueued: 0, fired: 0, requeued: 0, kitEnqueued: 0, budgetSkipped: true }
    }
  } catch (e) {
    
    console.warn('[memoryHeartbeat] leitura de budget falhou (fail-open, segue):', e)
  }

  
  try {
    const idle = await listIdle(new Date(now() - idleMs).toISOString(), limit)
    for (const c of idle.filter((c) => !comFalhaRecente.has(c.id))) {
      try { if ((await enqueue('reflect', c.id)).enqueued) reflectEnqueued++ } catch (e) { console.warn('[memoryHeartbeat] enqueue reflect fail-open:', c.id, e) }
    }
  } catch (e) { console.warn('[memoryHeartbeat] listIdle fail-open:', e) }

  
  
  
  
  
  
  try {
    const longas = await listLongas(new Date(now() - idleMs).toISOString(), minMsgsAtiva, limit)
    for (const c of longas.filter((c) => !comFalhaRecente.has(c.id))) {
      try { if ((await enqueue('reflect', c.id)).enqueued) reflectEnqueued++ } catch (e) { console.warn('[memoryHeartbeat] enqueue reflect (ativa longa) fail-open:', c.id, e) }
    }
  } catch (e) { console.warn('[memoryHeartbeat] listLongas fail-open:', e) }

  
  try {
    if (!(await existsRollup(today))) {
      if ((await enqueue('rollup', today)).enqueued) rollupEnqueued++
    }
  } catch (e) { console.warn('[memoryHeartbeat] rollup enqueue fail-open:', e) }

  
  
  
  
  try {
    const marcador = await (deps.getSetting ?? getSetting)(CHAVE_KIT_SEMANAL)
    if (venceuASemana(marcador, now())) {
      const marcas = await (deps.listBrands ?? listBrandsDoInstall)()
      for (const brand of marcas) {
        if ((await enqueue('reflect_kit', `${brand.operator_id}:${brand.id}`)).enqueued) kitEnqueued++
      }
      
      
      await (deps.setSetting ?? setSetting)(CHAVE_KIT_SEMANAL, new Date(now()).toISOString())
    }
  } catch (e) { console.warn('[memoryHeartbeat] reflect_kit enqueue fail-open:', e) }

  
  try {
    for (const j of await listClaimable()) { fire(j.id); fired++ }
  } catch (e) { console.warn('[memoryHeartbeat] dispatch fail-open:', e) }

  
  try {
    const cold = await listCold(new Date(now() - coldMs).toISOString())
    for (const j of cold) {
      try { await requeue(j.id, j.attempts, 'frio: re-enfileirado'); fire(j.id); requeued++ } catch (e) { console.warn('[memoryHeartbeat] cold-requeue fail-open:', j.id, e) }
    }
  } catch (e) { console.warn('[memoryHeartbeat] listCold fail-open:', e) }

  
  
  
  let health: MemoryHealth | undefined
  if (deps.measureHealth !== null) {
    try {
      const measure = deps.measureHealth ?? measureMemoryHealth
      health = await measure({ now, db: deps.db ?? serverDb() })
    } catch (e) { console.warn('[memoryHeartbeat] measureHealth fail-open:', e) }
  }

  
  
  
  
  if (health && health.deadCandidates > 0) {
    try {
      const bruto = await (deps.getSetting ?? getSetting)(CHAVE_MORTAS_AVISADAS)
      const jaAvisadas = bruto === null ? null : Number(bruto)
      if (deveAvisarMemoriaPerdida(health.deadCandidates, jaAvisadas)) {
        const novas = health.deadCandidates - (Number.isFinite(jaAvisadas as number) && (jaAvisadas as number) > 0 ? (jaAvisadas as number) : 0)
        await (deps.notificar ?? notificar)({
          tipo: 'memoria_perdida', urgencia: 'imediata',
          titulo: 'Uma memoria nao chegou ao seu Cerebro',
          corpo: avisoDeMemoriaPerdida(novas),
          
          dedupKey: `memoria_perdida:${health.deadCandidates}`,
        })
        await (deps.setSetting ?? setSetting)(CHAVE_MORTAS_AVISADAS, String(health.deadCandidates))
      }
    } catch (e) { console.warn('[memoryHeartbeat] aviso de memoria perdida fail-open:', e) }
  }

  return { reflectEnqueued, rollupEnqueued, fired, requeued, kitEnqueued, ...(health ? { health } : {}) }
}
