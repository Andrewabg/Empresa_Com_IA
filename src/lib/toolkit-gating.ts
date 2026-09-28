
interface ToolFlags { composio?: boolean; composio_toolkits?: string[] }


export const COMPOSIO_TOOLS_LIMIT = 12


export const CATALOG_LIMIT = 200


export const TOOL_SEARCH_TOP_K = 5


export const MIN_TOOLS_PER_TOOLKIT = 3


export function perToolkitLimit(total: number, toolkitCount: number): number {
  if (toolkitCount <= 1) return total
  return Math.max(MIN_TOOLS_PER_TOOLKIT, Math.ceil(total / toolkitCount))
}


export function interleaveRoundRobin<T>(lists: T[][]): T[] {
  const out: T[] = []
  const max = lists.reduce((m, l) => Math.max(m, l.length), 0)
  for (let i = 0; i < max; i++) {
    for (const l of lists) if (i < l.length) out.push(l[i])
  }
  return out
}


export function capVoiceComposioTools<T>(allowed: T[], allowlist?: string[] | null): T[] {
  const hasAllowlist = !!allowlist && allowlist.length > 0
  if (hasAllowlist) return allowed
  return allowed.slice(0, COMPOSIO_TOOLS_LIMIT)
}


export function isToolkitReachable(slug: string, tools: ToolFlags): boolean {
  if (!tools.composio) return false
  const allow = tools.composio_toolkits
  if (!allow || allow.length === 0) return true
  return allow.some((a) => a.toLowerCase() === slug.toLowerCase())
}


export function isActionAllowed(actionSlug: string, allowlist?: string[] | null): boolean {
  if (!allowlist || allowlist.length === 0) return true
  const a = actionSlug.toUpperCase()
  return allowlist.some((tk) => {
    const t = tk.toUpperCase()
    return a === t || a.startsWith(t + '_') 
  })
}


export function allowlistFilter(allowlist?: string[] | null): (args: { toolName: string }) => boolean {
  return (args) => isActionAllowed(args.toolName, allowlist)
}


export function toolkitsForSource(connected: string[], allowlist?: string[] | null): string[] {
  if (!allowlist || allowlist.length === 0) return connected
  const allow = new Set(allowlist.map((a) => a.toLowerCase()))
  return connected.filter((slug) => allow.has(slug.toLowerCase()))
}


export function expandirListaLegada(lista: string[], catalogo: string[]): string[] {
  const exatos = new Set(catalogo.map((u) => u.toLowerCase()))
  const out: string[] = []
  for (const item of lista) {
    const a = item.toLowerCase()
    const irmaos = exatos.has(a) ? [] : catalogo.filter((u) => u.toLowerCase().startsWith(`${a}_`))
    out.push(...(irmaos.length > 0 ? irmaos : [item]))
  }
  return [...new Set(out)]
}

export interface AgentPending { pendingConnect: string[]; pendingEnable: string[] }


export function agentPendingToolkits(required: string[], connected: string[], tools: ToolFlags): AgentPending {
  const conn = new Set(connected.map((s) => s.toLowerCase()))
  const pendingConnect = required.filter((s) => !conn.has(s.toLowerCase()))
  const pendingEnable = required.filter((s) => conn.has(s.toLowerCase()) && !isToolkitReachable(s, tools))
  return { pendingConnect, pendingEnable }
}
