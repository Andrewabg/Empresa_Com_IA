



import type { AgentTools } from '@/data/agents'

export type IntegracoesPatch = {
  composio_toolkits?: string[]
  required_toolkits?: string[]
  composio_action_modes?: Record<string, 'hitl' | 'direto'>
}
export type MergeIntegracoesResult = { tools: AgentTools } | { error: string }

const KEYS = ['composio_toolkits', 'required_toolkits'] as const

export function mergeIntegracoesPatch(existing: AgentTools, incoming: unknown): MergeIntegracoesResult {
  if (typeof incoming !== 'object' || incoming === null) return { error: 'integrações inválidas' }
  const t = incoming as Record<string, unknown>
  const tools: AgentTools = { ...existing }
  let tocou = false
  for (const k of KEYS) {
    const v = t[k]
    if (v === undefined) continue
    if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
      return { error: `${k} deve ser array de strings` }
    }
    tools[k] = [...new Set(v as string[])]
    tocou = true
  }
  
  
  const modes = t.composio_action_modes
  if (modes !== undefined) {
    if (typeof modes !== 'object' || modes === null || Array.isArray(modes)) {
      return { error: "composio_action_modes deve mapear toolkit → 'hitl' | 'direto'" }
    }
    const validado: Record<string, 'hitl' | 'direto'> = {}
    for (const [slug, modo] of Object.entries(modes as Record<string, unknown>)) {
      if (modo !== 'hitl' && modo !== 'direto') {
        return { error: "composio_action_modes deve mapear toolkit → 'hitl' | 'direto'" }
      }
      validado[slug] = modo
    }
    tools.composio_action_modes = validado
    tocou = true
  }
  if (!tocou) return { error: 'nada a atualizar' }
  return { tools }
}
