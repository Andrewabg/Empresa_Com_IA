
import { cookies } from 'next/headers'
import { requireMembro } from '@/server/auth/membro'
import { listAgents, listAgentsIncluindoDesligados } from '@/data/agents'
import { listCanais } from '@/data/canais'
import { AGENT_MODELS } from '@/server/agent/agentModels'
import { ensureCooSeeded } from '@/server/agent/ensureCooSeeded'
import { syncInstalledCargos } from '@/server/agent/store/syncInstalledCargos'
import { hydrateToolkitRegistry, list as listToolkits } from '@/server/config/toolkitRegistry'
import { getSetting } from '@/data/settings'
import { getCargoCatalog } from '@/server/agent/store/cargoCatalog'
import { getCustomTools } from '@/server/custom/registryTools'
import { missaoHumana } from '@/lib/agentes/fichaHumana'
import { listTasksByAgent } from '@/data/tasks'
import { readLicenseCache } from '@/server/license/cache'
import { getLicenseState } from '@/lib/license-state'
import { tituloDoObjetivo } from '@/lib/tarefas/tituloDoObjetivo'
import { AgentesClient } from './AgentesClient'
import type { Agent, TarefaUI } from './types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Agentes',
  description: 'Quem trabalha aqui.',
}

export default async function AgentesPage({
  searchParams,
}: {
  
  
  searchParams: Promise<{ agent?: string }>
}) {
  
  
  
  
  const { papel } = await requireMembro(await cookies())
  const isDono = papel === 'dono'
  await ensureCooSeeded() 
  await syncInstalledCargos() 
  const { agent } = await searchParams
  const agents = await listAgents()

  
  
  
  
  let desligados: { id: string; name: string; role: string; dismissed_at: string }[] = []
  try {
    desligados = (await listAgentsIncluindoDesligados())
      .filter((a): a is typeof a & { dismissed_at: string } => a.dismissed_at !== null)
      .map((a) => ({ id: a.id, name: a.name, role: a.role, dismissed_at: a.dismissed_at }))
  } catch (e) {
    console.warn('[/agentes] leitura dos desligados falhou (fail-open):', e)
  }

  
  
  let canalAgentIds: string[] = []
  try {
    canalAgentIds = [...new Set((await listCanais()).map((c) => c.agent_id))]
  } catch (e) {
    console.warn('[/agentes] listCanais falhou (fail-open):', e)
  }
  
  
  
  await hydrateToolkitRegistry()
  const toolkitNames: Record<string, string> = Object.fromEntries(listToolkits().map((t) => [t.slug, t.name]))

  
  const technicalMode = (await getSetting('ui_technical_mode')) === '1'

  
  const catalogo = await getCargoCatalog({ cacheOnly: true })
  const porId = new Map(catalogo.map((c) => [c.id, { tagline: c.tagline ?? null, descricao: c.descricao ?? null }]))
  const fichas: Record<string, { tagline: string | null; descricao: string | null }> = {}
  for (const a of agents) fichas[a.id] = missaoHumana({ id: a.id, role: a.role }, porId.get(a.id) ?? null)

  
  const listas = await Promise.all(agents.map((a) => listTasksByAgent(a.id)))
  const tarefas: Record<string, TarefaUI[]> = {}
  agents.forEach((a, i) => {
    tarefas[a.id] = listas[i].slice(0, 5).map((t) => ({ objetivo: tituloDoObjetivo(t.objective), status: t.status }))
  })

  
  
  const agentsOut = technicalMode
    ? agents
    : agents.map(({ system_prompt: _omitida, ...resto }) => resto)

  
  const licenseState = getLicenseState(await readLicenseCache(), Date.now())

  
  
  
  
  let customTools: { id: string; titulo: string; descricao: string }[] = []
  try {
    customTools = getCustomTools().map(({ id, titulo, descricao }) => ({ id, titulo, descricao }))
  } catch (e) {
    console.warn('[/agentes] registro de tools custom inválido (fail-open):', e)
  }

  return (
    <AgentesClient
      agents={agentsOut as Agent[]}
      models={AGENT_MODELS}
      initialSelectedId={agent ?? null}
      toolkitNames={toolkitNames}
      technicalMode={technicalMode}
      fichas={fichas}
      tarefas={tarefas}
      licenseState={licenseState}
      customTools={customTools}
      canalAgentIds={canalAgentIds}
      desligados={desligados}
      isDono={isDono}
    />
  )
}
