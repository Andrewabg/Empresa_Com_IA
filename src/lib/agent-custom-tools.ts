











import type { AgentTools } from '@/data/agents'

export type MergeCustomToolsResult = { tools: AgentTools } | { error: string }

export function mergeCustomToolsPatch(
  existing: AgentTools,
  incoming: unknown,
  idsValidos: string[],
): MergeCustomToolsResult {
  if (typeof incoming !== 'object' || incoming === null) return { error: 'tools custom inválidas' }
  const t = incoming as Record<string, unknown>
  const v = t.custom_tools
  if (v === undefined) return { error: 'nada a atualizar' }
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    return { error: 'custom_tools deve ser array de strings' }
  }
  const validos = new Set(idsValidos)
  const efetivas = [...new Set((v as string[]).filter((id) => validos.has(id)))]
  return { tools: { ...existing, custom_tools: efetivas } }
}
