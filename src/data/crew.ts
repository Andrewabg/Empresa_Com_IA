
import { listRecentEvents } from './events'
import { costSummary } from './cost'
import { listPending } from './approvals'
import { listAgents } from './agents'
import { listCanais } from './canais'
import { agentMeta, canonicalSlug } from '../lib/brain-nav'
import { ehEventoDeFimAnormal } from '../lib/conversa/fechamentoDoTurno'
import { cockpitHref, workspaceHref } from '../lib/cockpit'


export const ACTIVE_WINDOW_MS = 15 * 60_000

const EVENT_LIMIT = 200

export interface CrewMember {
  slug: string                 
  name: string                 
  role: string                 
  accent: 'wave' | 'mono'
  
  cockpit: string | null
  
  roster: boolean
  status: 'active' | 'quiet'
  lastEvent: { label: string; at: number; type: 'memory' | 'action' | 'tool' } | null
  outputToday: number
  costMonthUsd: number | null
  pending: number
}

const ASSISTANT_SLUG = 'jarvis'

export async function listCrew(
  now: Date = new Date(),
  timezone = 'UTC',
): Promise<CrewMember[]> {
  const [events, cost, pending, agents, canais] = await Promise.all([
    listRecentEvents(EVENT_LIMIT),
    costSummary(),
    listPending(),
    
    
    listAgents().catch(() => [] as Awaited<ReturnType<typeof listAgents>>),
    
    listCanais().catch(() => [] as Awaited<ReturnType<typeof listCanais>>),
  ])

  
  
  const agentsBySlug = new Map<string, (typeof agents)[number]>()
  for (const row of agents) {
    if (!row.enabled) continue
    agentsBySlug.set(canonicalSlug(row.id), row)
  }

  
  const canalSlugs = new Set<string>()
  for (const c of canais) {
    if (c.enabled) canalSlugs.add(canonicalSlug(c.agent_id))
  }

  
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now) 
  const nowMs = now.getTime()

  
  const costBySlug = new Map<string, number>()
  for (const t of cost.topAgents) {
    const s = canonicalSlug(t.agent)
    costBySlug.set(s, (costBySlug.get(s) ?? 0) + t.usd)
  }

  
  
  
  const pendingBySlug = new Map<string, number>()
  for (const a of pending) {
    const s = canonicalSlug(a.agent ?? ASSISTANT_SLUG)
    pendingBySlug.set(s, (pendingBySlug.get(s) ?? 0) + 1)
  }

  
  
  
  
  
  
  
  
  interface Agg {
    last: CrewMember['lastEvent']
    
    ultimoTrabalhoMs: number | null
    today: number
  }
  const byAgent = new Map<string, Agg>()
  for (const ev of events) {
    if (!ev.agent) continue
    const s = canonicalSlug(ev.agent)
    const atMs = Date.parse(ev.created_at)
    const agg = byAgent.get(s) ?? { last: null, ultimoTrabalhoMs: null, today: 0 }
    
    if (!agg.last) agg.last = { label: ev.label, at: atMs, type: ev.type }
    if (!ehEventoDeFimAnormal(ev.id)) {
      if (agg.ultimoTrabalhoMs === null) agg.ultimoTrabalhoMs = atMs
      
      
      
      if (ev.created_at.slice(0, 10) === todayStr) agg.today += 1
    }
    byAgent.set(s, agg)
  }

  
  
  
  const slugs = new Set<string>([ASSISTANT_SLUG])
  for (const k of agentsBySlug.keys()) slugs.add(k)
  for (const k of byAgent.keys()) slugs.add(k)
  for (const k of costBySlug.keys()) slugs.add(k)
  for (const k of pendingBySlug.keys()) slugs.add(k)

  const members: CrewMember[] = [...slugs].map((slug) => {
    const row = agentsBySlug.get(slug)
    const meta = agentMeta(slug) 
    const agg = byAgent.get(slug)
    const last = agg?.last ?? null
    
    const trabalhoMs = agg?.ultimoTrabalhoMs ?? null
    const status: CrewMember['status'] =
      trabalhoMs !== null && nowMs - trabalhoMs < ACTIVE_WINDOW_MS ? 'active' : 'quiet'
    return {
      slug,
      
      name: row?.name ?? meta.name,
      role: row?.role ?? meta.role,
      accent: row?.is_primary ? 'wave' : (meta.accent ?? 'mono'),
      
      
      
      cockpit: row
        ? workspaceHref({ id: row.id, is_primary: row.is_primary, tools: row.tools }, canalSlugs.has(slug))
        : cockpitHref(null, canalSlugs.has(slug)),
      roster: row !== undefined || slug === ASSISTANT_SLUG,
      status,
      lastEvent: last,
      outputToday: agg?.today ?? 0,
      costMonthUsd: costBySlug.get(slug) ?? null,
      pending: pendingBySlug.get(slug) ?? 0,
    }
  })

  
  members.sort((a, b) => {
    if (a.slug === ASSISTANT_SLUG) return -1
    if (b.slug === ASSISTANT_SLUG) return 1
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    const at = (b.lastEvent?.at ?? 0) - (a.lastEvent?.at ?? 0)
    if (at !== 0) return at
    const byName = a.name.localeCompare(b.name, 'pt-BR')
    if (byName !== 0) return byName
    return a.slug.localeCompare(b.slug) 
  })

  return members
}
