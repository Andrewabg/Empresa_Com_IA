
import { missaoCurta } from '@/lib/workspace/missao'
import type { HiringBrief, FerramentaBrief } from '@/lib/hiring/brief'
import { getAgentRow as getAgentRowReal, updateAgent as updateAgentReal, type AgentRow } from '@/data/agents'
import type { AgentSpec } from '@/server/agent/architect'
import { invalidateAgentCache } from '@/server/agent/jarvis'
import {
  invalidateConnectionsCache,
  listConnectedToolkitSlugs,
  checkToolkitConnections,
} from '@/server/config/connections'
import { getSessionEmAndamento, createSession, patchBrief, type HiringSessionRow } from '@/data/hiringSessions'
import type { CandidatoAntes } from '@/server/agent/wireTypes'
import { RETOMADA_MAX_MS } from '@/lib/hiring/retomada'

export interface SeedDeps {
  connectedSlugs: string[]
  
  nameBySlug: Map<string, string>
}






export function seedBriefFromAgent(row: AgentRow, deps: SeedDeps): HiringBrief {
  const conectados = new Set(deps.connectedSlugs.map((s) => s.toUpperCase()))
  const slugs = [...new Set([...(row.tools.composio_toolkits ?? []), ...(row.tools.required_toolkits ?? [])])]
  const ferramentas: FerramentaBrief[] = slugs.map((slug) => ({
    mencao: slug,
    slug,
    name: deps.nameBySlug.get(slug) ?? slug,
    status: conectados.has(slug.toUpperCase()) ? 'conectada' : 'pendente',
  }))
  return {
    papel: row.role,
    missao: missaoCurta(row.system_prompt, row.role),
    nome: row.name,
    ferramentas,
    ...(slugs.length === 0 ? { semFerramentas: true } : {}),
    fronteiras: [],
    fronteirasPadrao: true, 
  }
}


export function projetarAgenteAtual(
  row: AgentRow,
  deps: { connectedSlugs: string[]; nameBySlug: Map<string, string> },
): CandidatoAntes {
  const conectados = new Set(deps.connectedSlugs.map((s) => s.toUpperCase()))
  const slugs = [...new Set([...(row.tools.composio_toolkits ?? []), ...(row.tools.required_toolkits ?? [])])]
  return {
    missao: missaoCurta(row.system_prompt, row.role),
    ferramentas: slugs.map((slug) => ({
      slug,
      name: deps.nameBySlug.get(slug) ?? slug,
      status: conectados.has(slug.toUpperCase()) ? 'conectada' : 'pendente',
    })),
    budgetUsd: row.budget?.per_task_usd ?? 0,
  }
}

export interface AplicarRevisaoDeps {
  getAgentRow?: (id: string) => Promise<AgentRow | null>
  updateAgent?: (id: string, patch: Partial<AgentRow>) => Promise<AgentRow>
  invalidate?: () => void
  
  availableSkills?: () => Promise<string[]>
}


export async function aplicarRevisao(
  agentId: string, spec: AgentSpec, requiredToolkits: string[], deps: AplicarRevisaoDeps = {},
): Promise<AgentRow> {
  const getRow = deps.getAgentRow ?? getAgentRowReal
  const update = deps.updateAgent ?? updateAgentReal
  const invalidate = deps.invalidate ?? (() => { invalidateAgentCache(); invalidateConnectionsCache() })
  const listSkills = deps.availableSkills ??
    (async () => (await import('@/server/agent/skills/catalog')).listSkillCatalog().then((c) => c.map((e) => e.slug)))

  const existing = await getRow(agentId)
  if (!existing) throw new Error(`aplicarRevisao: agente "${agentId}" não existe`)

  
  
  
  
  const validas = new Set(await listSkills().catch(() => (existing.skills ?? [])))
  const existentesValidas = (existing.skills ?? []).filter((s) => validas.has(s))

  
  
  const tools = {
    ...existing.tools,
    ...spec.tools,
    anotarAprendizado: existing.tools.anotarAprendizado ?? true, 
    composio_toolkits: spec.composio_toolkits,
    required_toolkits: requiredToolkits, 
  }
  const row = await update(agentId, {
    name: spec.name,
    
    system_prompt: spec.system_prompt,
    tools,
    
    
    
    
    
    skills: [...new Set([...existentesValidas, ...spec.skills])],
    brain_read_scopes: spec.brain_read_scopes,
    budget: spec.budget,
  })
  invalidate()
  return row
}

export type StartRevisaoResult =
  | { session: HiringSessionRow }
  | { error: 'agente_inexistente' | 'nao_revisavel' }


export async function startOrResumeRevisao(agentId: string): Promise<StartRevisaoResult> {
  const row = await getAgentRowReal(agentId)
  if (!row) return { error: 'agente_inexistente' }
  if (row.is_primary) return { error: 'nao_revisavel' } 

  
  const atual = await getSessionEmAndamento().catch(() => null)
  if (atual && atual.mode === 'revisao' && atual.agent_id === agentId &&
      Date.now() - Date.parse(atual.updated_at) < RETOMADA_MAX_MS) {
    return { session: atual }
  }

  
  const session = await createSession('revisao', agentId)
  const [connected, report] = await Promise.all([
    listConnectedToolkitSlugs().catch(() => [] as string[]),
    checkToolkitConnections().catch(() => null),
  ])
  const nameBySlug = new Map((report?.toolkits ?? []).map((t) => [t.slug, t.name]))
  const brief = seedBriefFromAgent(row, { connectedSlugs: connected, nameBySlug })
  await patchBrief(session.id, brief)
  return { session: { ...session, brief } }
}
