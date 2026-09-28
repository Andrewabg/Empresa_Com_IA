

import { getAgentRow as getAgentRowReal, updateAgent as updateAgentReal, type AgentTools } from '@/data/agents'
import { getPersonaCampos as getCamposReal, setPersonaCampos as setCamposReal } from '@/data/treino'
import { getDirectives as getDirectivesReal, removeDirective as removeDirectiveReal } from '@/data/agentDirectives'
import { applyDirective as applyDirectiveReal } from '@/server/tools/registrarDiretriz'
import type { ChannelConfigSnapshot } from '@/lib/canais/configSnapshot'

export interface ChannelConfigDeps {
  getAgentRow?: typeof getAgentRowReal
  getPersonaCampos?: typeof getCamposReal
  getDirectives?: typeof getDirectivesReal
  updateAgent?: typeof updateAgentReal
  setPersonaCampos?: typeof setCamposReal
  applyDirective?: typeof applyDirectiveReal
  removeDirective?: typeof removeDirectiveReal
}


export async function readLiveSnapshot(agentId: string, deps: ChannelConfigDeps = {}): Promise<ChannelConfigSnapshot> {
  const getAgentRow = deps.getAgentRow ?? getAgentRowReal
  const getCampos = deps.getPersonaCampos ?? getCamposReal
  const getDir = deps.getDirectives ?? getDirectivesReal

  const row = await getAgentRow(agentId)
  if (!row) throw new Error(`readLiveSnapshot: agente ${agentId} não existe`)

  const [campos, dir] = await Promise.all([getCampos(agentId), getDir(agentId)])

  return {
    name: row.name,
    enabled: row.enabled,
    system_prompt: row.system_prompt,
    model: row.model,
    tools: (row.tools ?? {}) as AgentTools,
    skills: row.skills ?? [],
    personaCampos: campos,
    diretrizes: (dir.diretrizes ?? []).map((d) => d.texto),
  }
}


export async function applySnapshot(
  agentId: string,
  alvo: ChannelConfigSnapshot,
  vivoAtual: Pick<ChannelConfigSnapshot, 'diretrizes'>,
  deps: ChannelConfigDeps = {},
): Promise<void> {
  const updateAgent = deps.updateAgent ?? updateAgentReal
  const setCampos = deps.setPersonaCampos ?? setCamposReal
  const applyDir = deps.applyDirective ?? applyDirectiveReal
  const removeDir = deps.removeDirective ?? removeDirectiveReal

  await updateAgent(agentId, {
    name: alvo.name,
    enabled: alvo.enabled,
    system_prompt: alvo.system_prompt,
    model: alvo.model,
    tools: alvo.tools,
    skills: alvo.skills,
  })
  await setCampos(agentId, alvo.personaCampos)

  const antes = new Set(vivoAtual.diretrizes)
  const depois = new Set(alvo.diretrizes)
  for (const t of alvo.diretrizes) if (!antes.has(t)) await applyDir({ agentId, diretriz: t })
  for (const t of vivoAtual.diretrizes) if (!depois.has(t)) await removeDir(agentId, t)
}
