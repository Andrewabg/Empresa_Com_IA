




import type { ExecuteToolFn } from '@composio/core'
import type { AcaoModes } from '@/lib/canais/acaoPolitica'


export interface AcaoSimulada {
  toolkit: string | null
  slug: string
  args: Record<string, unknown>
  
  modo: 'hitl' | 'direto'
}


export function makeExecuteFnDry(
  coletor: AcaoSimulada[],
  opts: { modes: AcaoModes | null },
) {
  const modesLower: Record<string, 'hitl' | 'direto'> = {}
  for (const [k, v] of Object.entries(opts.modes ?? {})) modesLower[k.toLowerCase()] = v

  return (toolkitBySlug: Map<string, string>) =>
    (async (slug: string, input: Record<string, unknown>) => {
      const toolkit = toolkitBySlug.get(slug) ?? null
      const modo: 'hitl' | 'direto' = (toolkit && modesLower[toolkit.toLowerCase()]) || 'hitl'
      coletor.push({ toolkit, slug, args: input ?? {}, modo })
      return { data: { message: 'Feito. (simulado — nenhuma ação real foi executada)' }, error: null, successful: true }
    }) as ExecuteToolFn
}
