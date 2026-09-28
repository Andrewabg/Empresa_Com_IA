



import type { AgentTools } from '@/data/agents'


export const HREF_ENTREGAS = '/entregas'
export const HREF_COPY = '/copy'

export const COCKPIT_FLAGS: ReadonlyArray<readonly [keyof AgentTools, string]> = [
  ['painelTrafego', '/trafego'],
  ['estudioCopy', HREF_COPY],
  ['estudioDesign', '/design'],
  ['escritorioJuridico', '/juridico'],
  
  
  ['painelInstagram', '/instagram'],
]


export function cockpitHref(
  tools: AgentTools | null | undefined,
  temCanal: boolean,
): string | null {
  for (const [flag, href] of COCKPIT_FLAGS) {
    if (tools?.[flag]) return href
  }
  return temCanal ? '/inbox' : null
}


export interface WorkspaceAgentRef {
  id: string
  is_primary: boolean
  tools: AgentTools | null | undefined
}


export function workspaceHref(agent: WorkspaceAgentRef | null, temCanal: boolean): string | null {
  if (!agent) return cockpitHref(null, temCanal)
  if (agent.is_primary) return '/conversa'
  const bespoke = cockpitHref(agent.tools, temCanal)
  if (bespoke) return bespoke
  return `/agente/${encodeURIComponent(agent.id)}`
}


export interface CockpitAgentRef {
  enabled: boolean
  tools: AgentTools | null | undefined
}



export function algumAgenteHabilitadoTem(
  agents: CockpitAgentRef[],
  flags: ReadonlyArray<keyof AgentTools>,
): boolean {
  return agents.some((a) => a.enabled && flags.some((f) => a.tools?.[f] === true))
}


export interface AgenteDonoRef extends CockpitAgentRef {
  id: string
  is_primary: boolean
}


export function agenteComFlag<T extends AgenteDonoRef>(
  agents: T[],
  flags: ReadonlyArray<keyof AgentTools>,
): T | null {
  const comFlag = agents.filter((a) => a.enabled && flags.some((f) => a.tools?.[f] === true))
  if (comFlag.length === 0) return null
  const ordenados = [...comFlag].sort(
    (x, y) =>
      Number(y.is_primary) - Number(x.is_primary) ||
      (x.id < y.id ? -1 : x.id > y.id ? 1 : 0),
  )
  return ordenados[0] ?? null
}


export function agenteDonoDaFlag(
  agents: AgenteDonoRef[],
  flags: ReadonlyArray<keyof AgentTools>,
  padrao: string,
): string {
  const comFlag = agenteComFlag(agents, flags)
  if (comFlag) return comFlag.id
  return agents.find((a) => a.is_primary)?.id ?? padrao
}

export function activeCockpitHrefs(agents: CockpitAgentRef[], hasChannel: boolean): Set<string> {
  const active = new Set<string>()
  for (const a of agents) {
    if (!a.enabled) continue
    for (const [flag, href] of COCKPIT_FLAGS) {
      if (a.tools?.[flag]) active.add(href)
    }
  }
  if (hasChannel) {
    active.add('/inbox')
    active.add('/treino')
  }
  
  
  
  if (active.has(HREF_COPY)) active.add(HREF_ENTREGAS)
  return active
}
