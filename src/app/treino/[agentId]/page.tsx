
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { requireOperator } from '@/server/auth/session'
import { getAgentRow } from '@/data/agents'
import { listarCasos, listarTestes, listarCorrecoesAtivas } from '@/data/treino'
import { readLiveSnapshot } from '@/server/canais/channelConfig'
import { getDraft } from '@/data/agentConfigDrafts'
import { listBaseByAgent } from '@/data/baseConhecimento'
import { checkToolkitConnections } from '@/server/config/connections'
import { listCanais } from '@/data/canais'
import { atendeAlgumCanal } from '@/lib/canais/atendentes'
import { getCustomTools } from '@/server/custom/registryTools'
import { SalaClient } from './SalaClient'
import type { ConfigInicial } from './parts/config/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params
  return {
    title: `Treino · ${decodeURIComponent(agentId)}`,
    description: 'Sala de Treino — corrija o atendente por conversa.',
  }
}

export default async function SalaPage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  await requireOperator(await cookies())

  const { agentId } = await params
  const id = decodeURIComponent(agentId)

  const agentRow = await getAgentRow(id).catch(() => null)
  if (!agentRow) notFound()

  let casos: Awaited<ReturnType<typeof listarCasos>> = []
  let testes: Awaited<ReturnType<typeof listarTestes>> = []
  let correcoes: Awaited<ReturnType<typeof listarCorrecoesAtivas>> = []

  try {
    ;[casos, testes, correcoes] = await Promise.all([
      listarCasos(id),
      listarTestes(id),
      listarCorrecoesAtivas(id),
    ])
  } catch (e) {
    console.warn(`[treino/${id}] loader fail-open:`, e)
  }

  
  
  
  
  
  let isCanal = false
  try {
    const canais = await listCanais()
    isCanal = !agentRow.is_primary && atendeAlgumCanal(id, canais)
  } catch (e) {
    console.warn(`[treino/${id}] listCanais fail-open:`, e)
  }

  
  
  
  let initialConfig: ConfigInicial | null = null
  if (isCanal) {
    try {
      const [live, draft, base, connReport] = await Promise.all([
        readLiveSnapshot(id),
        getDraft(id),
        listBaseByAgent(id),
        checkToolkitConnections(),
      ])
      const baseSnapshot = draft?.base_snapshot ?? live
      const customTools = getCustomTools().map(({ id, titulo, descricao }) => ({ id, titulo, descricao }))
      initialConfig = {
        baseSnapshot,
        delta: draft?.delta ?? null,
        temRascunho: !!draft,
        base,
        toolkits: connReport.toolkits.map((t) => ({ slug: t.slug, name: t.name, connected: t.connected })),
        customTools,
        contadores: {
          diretrizes: live.diretrizes.length,
          playbooks: base.filter((e) => e.tipo === 'playbook').length,
          fatos: base.filter((e) => e.tipo === 'fato').length,
          aprendizados: correcoes.length,
        },
      }
    } catch (e) {
      console.warn(`[treino/${id}] config bundle fail-open:`, e)
      initialConfig = null
    }
  }

  return (
    <SalaClient
      agentId={id}
      agentName={agentRow.name}
      initialCasos={casos}
      initialTestes={testes}
      initialCorrecoes={correcoes}
      isCanal={isCanal}
      initialConfig={initialConfig}
    />
  )
}
