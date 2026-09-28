

import type { AgentTools } from '@/data/agents'
import type { PersonaCampos } from '@/lib/treino/persona'
import type { BaseOps } from '@/lib/canais/baseOps'
import { renomearNaPersona } from '@/lib/agent-identity'

export interface ChannelConfigSnapshot {
  name: string
  enabled: boolean
  system_prompt: string
  model: string | null
  tools: AgentTools
  skills: string[]
  personaCampos: PersonaCampos
  diretrizes: string[]
}

export interface ChannelConfigDelta {
  name?: string
  enabled?: boolean
  system_prompt?: string
  model?: string | null
  tools?: AgentTools
  skills?: string[]
  personaCampos?: Partial<PersonaCampos>
  diretrizes?: { add?: string[]; remove?: string[] }
  base?: BaseOps 
}

export interface CampoConflito { campo: string; base: string; vivo: string; meu: string }

const NULO = '∅'

export function flatten(s: ChannelConfigSnapshot): Record<string, string> {
  const f: Record<string, string> = {
    name: s.name,
    enabled: s.enabled ? '1' : '0',
    system_prompt: s.system_prompt,
    model: s.model ?? NULO,
    tools: JSON.stringify(s.tools ?? {}),
    skills: JSON.stringify([...(s.skills ?? [])].sort()),
  }
  for (const [k, v] of Object.entries(s.personaCampos ?? {})) f[`persona:${k}`] = JSON.stringify(v)
  for (const d of s.diretrizes ?? []) f[`diretriz:${d}`] = '1'
  return f
}

export function mergeDelta(vivo: ChannelConfigSnapshot, delta: ChannelConfigDelta): ChannelConfigSnapshot {
  const out: ChannelConfigSnapshot = {
    ...vivo,
    tools: { ...vivo.tools },
    skills: [...vivo.skills],
    personaCampos: { ...vivo.personaCampos },
    diretrizes: [...vivo.diretrizes],
  }
  if (delta.name !== undefined) out.name = delta.name
  if (delta.enabled !== undefined) out.enabled = delta.enabled
  if (delta.system_prompt !== undefined) out.system_prompt = delta.system_prompt
  
  
  
  
  
  if (delta.name !== undefined && delta.name !== vivo.name) {
    out.system_prompt = renomearNaPersona(out.system_prompt, vivo.name, delta.name)
  }
  if (delta.model !== undefined) out.model = delta.model
  if (delta.tools !== undefined) out.tools = { ...delta.tools }
  if (delta.skills !== undefined) out.skills = [...delta.skills]
  if (delta.personaCampos) out.personaCampos = { ...out.personaCampos, ...delta.personaCampos }
  if (delta.diretrizes) {
    const set = new Set(out.diretrizes)
    for (const r of delta.diretrizes.remove ?? []) set.delete(r)
    for (const a of delta.diretrizes.add ?? []) set.add(a)
    out.diretrizes = [...set]
  }
  return out
}

function chavesDoDelta(delta: ChannelConfigDelta): Set<string> {
  const ks = new Set<string>()
  for (const k of ['name', 'enabled', 'system_prompt', 'model', 'tools', 'skills'] as const) {
    if (delta[k] !== undefined) ks.add(k)
  }
  for (const campo of Object.keys(delta.personaCampos ?? {})) ks.add(`persona:${campo}`)
  for (const d of [...(delta.diretrizes?.add ?? []), ...(delta.diretrizes?.remove ?? [])]) ks.add(`diretriz:${d}`)
  return ks
}

export function detectarConflitos(
  baseFoto: ChannelConfigSnapshot,
  vivoAtual: ChannelConfigSnapshot,
  delta: ChannelConfigDelta,
): CampoConflito[] {
  const fBase = flatten(baseFoto)
  const fVivo = flatten(vivoAtual)
  const fMeu = flatten(mergeDelta(vivoAtual, delta))
  const out: CampoConflito[] = []
  for (const campo of chavesDoDelta(delta)) {
    const base = fBase[campo] ?? NULO
    const vivo = fVivo[campo] ?? NULO
    if (base !== vivo) out.push({ campo, base, vivo, meu: fMeu[campo] ?? NULO })
  }
  return out
}
