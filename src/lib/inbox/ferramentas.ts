





import type { AgentTools } from '@/data/agents'

export interface FerramentaView {
  slug: string
  name: string
  
  connected: boolean
  
  required: boolean
  
  ligada: boolean
  
  modo: 'hitl' | 'direto'
}


function titleCase(slug: string): string {
  return slug
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function montarFerramentas(
  tools: AgentTools,
  report: { slug: string; name: string; connected: boolean }[],
): FerramentaView[] {
  const allow = new Set((tools.composio_toolkits ?? []).map((s) => s.toLowerCase()))
  const required = new Set((tools.required_toolkits ?? []).map((s) => s.toLowerCase()))
  const modes: Record<string, 'hitl' | 'direto'> = {}
  for (const [k, v] of Object.entries(tools.composio_action_modes ?? {})) modes[k.toLowerCase()] = v

  
  const meta = new Map<string, { slug: string; name: string; connected: boolean }>()
  for (const r of report) meta.set(r.slug.toLowerCase(), { slug: r.slug, name: r.name, connected: r.connected })

  const keys = new Set<string>([...allow, ...required])
  for (const r of report) if (r.connected) keys.add(r.slug.toLowerCase())

  const out: FerramentaView[] = []
  for (const key of keys) {
    const m = meta.get(key)
    const slug = m?.slug ?? key
    out.push({
      slug,
      name: m?.name ?? titleCase(slug),
      connected: m?.connected ?? false,
      required: required.has(key),
      ligada: allow.has(key) || required.has(key),
      modo: modes[key] ?? 'hitl',
    })
  }
  out.sort((a, b) => a.slug.localeCompare(b.slug))
  return out
}
