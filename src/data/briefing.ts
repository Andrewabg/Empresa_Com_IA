
import { serverDb } from '../server/supabase'
import { listRecentEvents } from './events'
import { listPending, listResolvidasRecentes } from './approvals'
import { listPrazosAtivos } from './prazos'
import { agentName, canonicalSlug } from '@/lib/brain-nav'
import type { DesfechoRecente, PendenteBriefing } from '@/lib/briefing/tipos'
import type { MockBriefing } from '../mock/types'
import { periodoDaHora, type PeriodoDia } from '@/lib/periodoDia'
import { TZ_FALLBACK } from '@/lib/relogio'
import { toPrazoView } from '@/lib/juridico/prazosTipos'
import { contarPrazosQueEntraramNaJanela } from '@/lib/briefing/movimentoDoBriefing'


function greetingFor(hourLocal: number, name: string): string {
  const p = periodoDaHora(hourLocal)
  if (p === 'manha') return `Bom dia, ${name}`
  if (p === 'tarde') return `Boa tarde, ${name}`
  return `Boa noite, ${name}`
}


async function todaySpendUsd(dateStr: string): Promise<number> {
  try {
    const db = serverDb()
    
    const dayStart = new Date(`${dateStr}T00:00:00Z`).toISOString()
    const dayEnd   = new Date(`${dateStr}T24:00:00Z`).toISOString()
    const { data, error } = await db
      .from('cost_events')
      .select('amount_usd')
      .gte('created_at', dayStart)
      .lt('created_at', dayEnd)
    if (error) {
      console.warn('[briefing] todaySpendUsd error:', error.message)
      return 0
    }
    return (data ?? []).reduce((s, r) => s + Number(r.amount_usd), 0)
  } catch {
    return 0
  }
}


export async function getGastoDoDiaUsd(now: Date, timezone: string): Promise<number> {
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now)
  return todaySpendUsd(dateStr)
}


async function memoryCountLast24h(now: Date): Promise<number> {
  try {
    const db = serverDb()
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await db
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'memory')
      .gte('created_at', since)
    if (error) {
      console.warn('[briefing] memoryCountLast24h error:', error.message)
      return 0
    }
    return count ?? 0
  } catch {
    return 0
  }
}


export async function getBriefing(
  operatorName: string,
  now: Date = new Date(),
  timezone: string = TZ_FALLBACK,
): Promise<
  MockBriefing & {
    memCount: number
    pendingCount: number
    spendUsd: number
    periodo: PeriodoDia
    pendentes: PendenteBriefing[]
    desfechosRecentes: DesfechoRecente[]
  }
> {
  
  const rawHour = Number(
    new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: timezone }).format(now),
  )
  
  const hourLocal = rawHour === 24 ? 0 : rawHour
  const periodo = periodoDaHora(hourLocal)
  const greeting = greetingFor(hourLocal, operatorName)

  
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now) 

  
  
  
  
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const [memCount, pending, spendUsd, recentEvents, desfechosRecentes] = await Promise.all([
    memoryCountLast24h(now),
    listPending(),
    todaySpendUsd(dateStr),
    listRecentEvents(10),
    listResolvidasRecentes(since24h),
  ])

  const pendingCount = pending.length
  const spendStr = spendUsd.toFixed(2)

  const body =
    `Nas últimas 24h: ${memCount} ${memCount === 1 ? 'memória nova' : 'memórias novas'}, ` +
    `${pendingCount} ${pendingCount === 1 ? 'aprovação pendente' : 'aprovações pendentes'}, ` +
    `US$ ${spendStr} gastos hoje.`

  
  const seenLabels = new Set<string>()
  const highlights: string[] = []
  for (const ev of recentEvents) {
    if (highlights.length >= 3) break
    if (!seenLabels.has(ev.label)) {
      seenLabels.add(ev.label)
      highlights.push(ev.label)
    }
  }

  
  
  
  const pendentes: PendenteBriefing[] = pending.map((a) => {
    const slug = a.agent ?? ''
    const nome = slug ? agentName(canonicalSlug(slug)) : ''
    const agente = nome && nome !== slug ? nome : null
    return { titulo: a.title ?? '', agente }
  })

  
  
  
  return { greeting, body, date: dateStr, highlights, memCount, pendingCount, spendUsd, periodo, pendentes, desfechosRecentes }
}


export interface FatosNegocio {
  
  tarefasConcluidas: number
  
  tarefasFalhadas: number
  
  atendimentosAguardando: number
  
  rotinasQueRodaram: number
  
  prazosNaJanela: number
  
  leiturasFalharam: string[]
}


async function contarTarefasPorStatus24h(status: 'done' | 'failed', now: Date): Promise<number> {
  const db = serverDb()
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await db
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', status)
    .gte('updated_at', since)
  if (error) throw new Error(`contarTarefasPorStatus24h(${status}): ${error.message}`)
  return count ?? 0
}


async function contarRotinasQueRodaram24h(now: Date): Promise<number> {
  const db = serverDb()
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await db
    .from('rotinas')
    .select('*', { count: 'exact', head: true })
    .gte('ultima_execucao', since)
  if (error) throw new Error(`contarRotinasQueRodaram24h: ${error.message}`)
  return count ?? 0
}


async function contarPrazosQueEntraram24h(now: Date, timezone: string): Promise<number> {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now)
  const desde = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const prazos = (await listPrazosAtivos()).map((r) => ({ prazo: toPrazoView(r), criadoEm: r.created_at }))
  return contarPrazosQueEntraramNaJanela(prazos, hoje, desde)
}


async function contarAtendimentosAguardando24h(now: Date): Promise<number> {
  const db = serverDb()
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await db
    .from('conversas_externas')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'aguardando_humano')
    .gte('updated_at', since)
  if (error) throw new Error(`contarAtendimentosAguardando24h: ${error.message}`)
  return count ?? 0
}


export async function getFatosNegocio(now: Date, timezone: string): Promise<FatosNegocio> {
  const falhas: string[] = []
  const ler = async (chave: string, fn: () => Promise<number>): Promise<number> => {
    try {
      return await fn()
    } catch (e) {
      console.warn(`[briefing] getFatosNegocio.${chave} falhou (fail-open, 0):`, e)
      falhas.push(chave)
      return 0
    }
  }
  const [tarefasConcluidas, tarefasFalhadas, atendimentosAguardando, rotinasQueRodaram, prazosNaJanela] =
    await Promise.all([
      ler('tarefasConcluidas', () => contarTarefasPorStatus24h('done', now)),
      ler('tarefasFalhadas', () => contarTarefasPorStatus24h('failed', now)),
      ler('atendimentosAguardando', () => contarAtendimentosAguardando24h(now)),
      ler('rotinasQueRodaram', () => contarRotinasQueRodaram24h(now)),
      ler('prazosNaJanela', () => contarPrazosQueEntraram24h(now, timezone)),
    ])
  return { tarefasConcluidas, tarefasFalhadas, atendimentosAguardando, rotinasQueRodaram, prazosNaJanela, leiturasFalharam: falhas }
}
