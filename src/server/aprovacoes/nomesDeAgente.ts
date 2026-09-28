







import { listAgentsSummary as listAgentsSummaryReal } from '@/data/agents'
import { canonicalSlug } from '@/lib/brain-nav'

export interface NomesDeAgenteDeps {
  listAgentsSummary?: () => Promise<{ id: string; name: string }[]>
}


export async function carregarNomesDeAgente(
  deps: NomesDeAgenteDeps = {},
): Promise<Record<string, string>> {
  const listSummary = deps.listAgentsSummary ?? listAgentsSummaryReal
  try {
    const roster = await listSummary()
    const out: Record<string, string> = {}
    for (const a of roster) {
      if (a.name?.trim()) out[canonicalSlug(a.id)] = a.name.trim()
    }
    return out
  } catch {
    return {} 
  }
}
