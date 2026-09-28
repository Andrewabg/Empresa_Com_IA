
import { getComposioClient, composioUserId, type ComposioClient } from '../actions/composio'
import { listAgentsSummary, type AgentTools } from '@/data/agents'
import { listNoAuthToolkitSlugs } from './noAuthToolkits'
import { listarContasConectadas, type ClientDeContas } from '@/server/actions/contasConectadas'
import {
  displayName as registryDisplayName,
  meta as registryMeta,
  list as registryList,
  hydrateToolkitRegistry,
} from './toolkitRegistry'

export interface ToolkitConnection {
  slug: string
  name: string
  connected: boolean
  status?: string
  requiredBy: string[]
  icon?: string
  category?: string
  
  semAuth?: boolean
}
export interface ConnectionsReport {
  configured: boolean
  healthOk: boolean
  toolkits: ToolkitConnection[]
  pendingRequired: string[]
}
export interface ActivationField { name: string; label: string; required: boolean; type: string; description?: string }

export interface ActivationPlan { mode: 'managed' | 'byo' | 'apikey' | 'none'; fields?: ActivationField[] }

interface RawAccount { slug: string; status: string }

export interface ConnectionsDeps {
  getClient?: () => Promise<ComposioClient | null>
  listConnected?: (c: ComposioClient, userId: string) => Promise<RawAccount[]>
  getAgents?: () => Promise<{ name: string; tools: AgentTools }[]>
  
  hydrate?: () => Promise<void>
  
  listNoAuth?: () => Promise<string[]>
  now?: () => number
}


export function toolkitDisplayName(slug: string): string {
  return registryDisplayName(slug)
}


export function resolveActivationPlan(meta: { managedAvailable: boolean; initiationFields: ActivationField[] }): ActivationPlan {
  return meta.managedAvailable ? { mode: 'managed' } : { mode: 'byo', fields: meta.initiationFields }
}






interface RawAuthField { name: string; displayName?: string; type?: string; required?: boolean; description?: string }
interface SchemeDetail {
  mode?: string
  fields?: {
    authConfigCreation?: { required?: RawAuthField[]; optional?: RawAuthField[] }
    connectedAccountInitiation?: { required?: RawAuthField[]; optional?: RawAuthField[] }
  }
}
export interface ToolkitAuthMeta {
  composioManagedAuthSchemes?: string[]
  authConfigDetails?: SchemeDetail[]
  
  noAuth?: boolean
}

function mapField(f: RawAuthField): ActivationField {
  return { name: f.name, label: f.displayName ?? f.name, required: f.required ?? false, type: f.type ?? 'text', ...(f.description ? { description: f.description } : {}) }
}


export function planActivationFromToolkit(meta: ToolkitAuthMeta): ActivationPlan {
  const details = meta.authConfigDetails ?? []
  
  if ((meta.composioManagedAuthSchemes ?? []).some((s) => s.toUpperCase().includes('OAUTH'))) {
    return { mode: 'managed' }
  }
  
  const apikey = details.find((d) => (d.mode ?? '').toUpperCase() === 'API_KEY')
  if (apikey) {
    return { mode: 'apikey', fields: (apikey.fields?.connectedAccountInitiation?.required ?? []).map(mapField) }
  }
  
  const oauth = details.find((d) => (d.mode ?? '').toUpperCase().includes('OAUTH'))
  if (oauth) {
    return { mode: 'byo', fields: (oauth.fields?.authConfigCreation?.required ?? []).map(mapField) }
  }
  
  
  
  if (meta.noAuth === true) return { mode: 'none' }
  if (details.length > 0 && details.every((d) => (d.mode ?? '').toUpperCase() === 'NO_AUTH')) {
    return { mode: 'none' }
  }
  return { mode: 'byo', fields: [] }
}


export function toolkitDispensaConexao(meta: ToolkitAuthMeta): boolean {
  return planActivationFromToolkit(meta).mode === 'none'
}

const TTL_MS = 60_000
let _accounts: { at: number; rows: RawAccount[] } | null = null
let _report: { at: number; report: ConnectionsReport } | null = null
export function invalidateConnectionsCache(): void { _accounts = null; _report = null }

async function defaultListConnected(c: ComposioClient, userId: string): Promise<RawAccount[]> {
  
  
  return await listarContasConectadas(c as unknown as ClientDeContas, userId)
}

async function loadAccounts(deps: ConnectionsDeps): Promise<RawAccount[]> {
  const now = deps.now ?? Date.now
  if (_accounts && now() - _accounts.at < TTL_MS) return _accounts.rows
  const getClient = deps.getClient ?? getComposioClient
  const listConnected = deps.listConnected ?? defaultListConnected
  try {
    const c = await getClient() 
    const rows = c ? await listConnected(c, composioUserId()) : []
    _accounts = { at: now(), rows }
    return rows
  } catch {
    _accounts = { at: now(), rows: [] } 
    return []
  }
}


export async function listConnectedToolkitSlugs(deps: ConnectionsDeps = {}): Promise<string[]> {
  const [rows, semAuth] = await Promise.all([
    loadAccounts(deps),
    (deps.listNoAuth ?? listNoAuthToolkitSlugs)(),
  ])
  const ativos = rows.filter((a) => a.status.toUpperCase() === 'ACTIVE').map((a) => a.slug)
  return [...new Set([...ativos, ...semAuth])]
}


async function fetchConnections(deps: ConnectionsDeps): Promise<{ configured: boolean; healthy: boolean; rows: RawAccount[] }> {
  const getClient = deps.getClient ?? getComposioClient
  const listConnected = deps.listConnected ?? defaultListConnected
  let c: ComposioClient | null
  try { c = await getClient() } catch { return { configured: false, healthy: false, rows: [] } }
  if (!c) return { configured: false, healthy: false, rows: [] }
  try { return { configured: true, healthy: true, rows: await listConnected(c, composioUserId()) } }
  catch { return { configured: true, healthy: false, rows: [] } }
}


export async function checkToolkitConnections(deps: ConnectionsDeps = {}): Promise<ConnectionsReport> {
  const now = deps.now ?? Date.now
  if (_report && now() - _report.at < TTL_MS) return _report.report

  
  
  
  
  
  const hydrate = deps.hydrate ?? hydrateToolkitRegistry
  const hydrateP = hydrate().catch(() => {})
  
  
  
  const getAgents = deps.getAgents ?? (async () => (await listAgentsSummary()).map((a) => ({ name: a.name, tools: a.tools })))
  
  
  const listNoAuth = deps.listNoAuth ?? listNoAuthToolkitSlugs
  const [conn, agents, semAuthSlugs] = await Promise.all([fetchConnections(deps), getAgents(), listNoAuth()])

  if (!conn.configured || !conn.healthy) {
    const report: ConnectionsReport = { configured: conn.configured, healthOk: conn.configured && conn.healthy, toolkits: [], pendingRequired: [] }
    _report = { at: now(), report }
    return report
  }

  await hydrateP

  
  
  const accounts = conn.rows
  const semAuth = new Set(semAuthSlugs.map((s) => s.toLowerCase()))
  const dispensaConexao = (slug: string) => semAuth.has(slug.toLowerCase())
  const activeSlugs = new Set(accounts.filter((a) => a.status.toUpperCase() === 'ACTIVE').map((a) => a.slug))
  
  
  const statusBySlug = new Map<string, string>()
  for (const a of accounts) {
    if (statusBySlug.get(a.slug) === undefined || a.status.toUpperCase() === 'ACTIVE') statusBySlug.set(a.slug, a.status)
  }

  const requiredBy = new Map<string, string[]>()
  for (const ag of agents) {
    for (const slug of ag.tools?.required_toolkits ?? []) {
      requiredBy.set(slug, [...(requiredBy.get(slug) ?? []), ag.name])
    }
  }

  
  
  const allSlugs = new Set<string>([
    ...accounts.map((a) => a.slug),
    ...requiredBy.keys(),
    ...registryList().map((t) => t.slug),
  ])
  const toolkits: ToolkitConnection[] = [...allSlugs].sort().map((slug) => {
    const m = registryMeta(slug)
    return {
      slug,
      name: toolkitDisplayName(slug), 
      
      connected: activeSlugs.has(slug) || dispensaConexao(slug),
      status: statusBySlug.get(slug),
      ...(dispensaConexao(slug) ? { semAuth: true } : {}),
      requiredBy: [...new Set(requiredBy.get(slug) ?? [])], 
      ...(m?.icon ? { icon: m.icon } : {}),
      ...(m?.category ? { category: m.category } : {}),
    }
  })
  const pendingRequired = [...requiredBy.keys()]
    .filter((slug) => !activeSlugs.has(slug) && !dispensaConexao(slug))
    .sort()

  const report: ConnectionsReport = { configured: true, healthOk: true, toolkits, pendingRequired }
  _report = { at: now(), report }
  return report
}
