
import type { AgentTools } from '@/data/agents'

const BOOL_TOOL_KEYS = ['buscarCerebro', 'proporMemoria', 'composio', 'emitirArtefato', 'gerarImagem'] as const
const ARRAY_TOOL_KEYS = ['required_toolkits'] as const

export interface MergeResult {
  tools?: AgentTools
  error?: string
  requiredChanged?: boolean   
}

export function mergeToolsPatch(existing: AgentTools, incoming: unknown): MergeResult {
  if (typeof incoming !== 'object' || incoming === null) return { error: 'tools inválido' }
  const t = incoming as Record<string, unknown>
  const tools: AgentTools = { ...existing }

  for (const k of BOOL_TOOL_KEYS) {
    const v = t[k]
    if (v !== undefined) {
      if (typeof v !== 'boolean') return { error: `tools.${k} deve ser boolean` }
      tools[k] = v
    }
  }

  let requiredChanged = false
  for (const k of ARRAY_TOOL_KEYS) {
    const v = t[k]
    if (v !== undefined) {
      if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
        return { error: `tools.${k} deve ser array de strings` }
      }
      requiredChanged = JSON.stringify(existing[k] ?? []) !== JSON.stringify(v)
      tools[k] = v as string[]
    }
  }
  return { tools, requiredChanged }
}
