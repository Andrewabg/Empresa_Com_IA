
import { cookies } from 'next/headers'
import { requireMembro } from '@/server/auth/membro'
import { getAgentRow } from '@/data/agents'
import { roomConversation, listMessages, listRoomThreads, getConversationForOperator } from '@/data/messages'
import { getDefaultBrand } from '@/data/brands'
import { getDirecaoArte } from '@/data/brandVoice'
import { listPecasComUltimaVersao } from '@/data/pecas'
import { listReferenciasByConversation, listStorageRefsByIds } from '@/data/artifacts'
import { serverDb } from '@/server/supabase'
import { DesignClient } from './DesignClient'
import type { ChatMessage } from '../conversa/useChatStream'
import type { ThreadItem } from '@/lib/conversas/thread'
import type { NotaCitada } from '@/server/tools/buscarCerebro'
import { toCriativoView, type CriativoView } from '@/lib/design/types'
import { coletarArtifactIds, montarInitialUrls } from '@/lib/design/artifactUrls'
import { renderDirecaoArte, type DirecaoArte } from '@/lib/design/direcaoArte'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Design',
  description: 'Estúdio do designer — o Téo.',
}

const AGENT_ID = 'designer'

interface MarcaBundle {
  brand: { id: string; nome: string; slug: string } | null
  direcao: DirecaoArte | null
  initialCriativos: CriativoView[]
}


async function carregarMarca(operatorId: string): Promise<MarcaBundle> {
  const b = await getDefaultBrand(operatorId)
  if (!b) return { brand: null, direcao: null, initialCriativos: [] }
  const [direcao, pecas] = await Promise.all([
    getDirecaoArte(operatorId, b.id),
    listPecasComUltimaVersao(operatorId, b.id, 'designer'),
  ])
  const initialCriativos = pecas.map((p) =>
    toCriativoView(
      { id: p.id, brand_id: p.brand_id, formato: p.formato, titulo: p.titulo, status: p.status, origem: p.origem, position: p.position, brief: p.brief },
      p.ultimaVersao
        ? { n: p.ultimaVersao.n, variacoes: p.ultimaVersao.variacoes, veredito: p.ultimaVersao.veredito, critica: p.ultimaVersao.critica }
        : undefined,
    ),
  )
  return { brand: { id: b.id, nome: b.nome, slug: b.slug }, direcao, initialCriativos }
}

export default async function DesignPage({
  searchParams,
}: {
  searchParams?: Promise<{ c?: string }>
}) {
  const cookieStore = await cookies()
  const { user: operator, papel } = await requireMembro(cookieStore)
  const sp = (await searchParams) ?? {}

  
  const agentRowP = getAgentRow(AGENT_ID)
  const marcaP = carregarMarca(operator.id).catch((e): MarcaBundle => {
    console.warn('[/design] carga da marca/criativos falhou (fail-open):', e)
    return { brand: null, direcao: null, initialCriativos: [] }
  })

  const agentRow = await agentRowP
  const agentInstalled = !!agentRow && agentRow.enabled
  const agentName = agentRow?.name ?? 'Téo'

  
  let conversationId: string | null = null
  const initialMessages: ChatMessage[] = []
  if (agentInstalled) {
    
    
    const escolhida = sp.c ? await getConversationForOperator(sp.c, operator.id) : null
    const conversation = escolhida && escolhida.agent_id === AGENT_ID
      ? escolhida
      : await roomConversation(operator.id, AGENT_ID)
    conversationId = conversation.id
    for (const row of await listMessages(conversation.id)) {
      if (row.role !== 'user' && row.role !== 'assistant') continue
      const citations = extractCitations(row.tool_payload)
      initialMessages.push({
        id: row.id,
        role: row.role,
        content: row.content ?? '',
        ...(citations ? { citations } : {}),
      })
    }
  }

  const { brand, direcao, initialCriativos } = await marcaP

  
  let initialReferencias: { id: string; titulo: string }[] = []
  let initialUrls: Record<string, string> = {}
  try {
    
    
    const critIds = coletarArtifactIds(initialCriativos)
    const [refRows, storageRefs] = await Promise.all([
      conversationId && brand ? listReferenciasByConversation(conversationId) : Promise.resolve([]),
      listStorageRefsByIds(critIds),
    ])
    initialReferencias = refRows.map((r) => ({ id: r.id, titulo: r.title }))

    
    
    const refMap = new Map(storageRefs.map((r) => [r.id, r.storage_ref]))
    const pares: { artifactId: string; storageRef: string }[] = []
    for (const id of critIds) {
      const sr = refMap.get(id)
      if (sr) pares.push({ artifactId: id, storageRef: sr })
    }
    for (const r of refRows) {
      if (r.storage_ref) pares.push({ artifactId: r.id, storageRef: r.storage_ref })
    }

    if (pares.length) {
      
      const { data, error } = await serverDb().storage.from('artifacts').createSignedUrls(pares.map((p) => p.storageRef), 3600)
      if (error) console.warn('[/design] createSignedUrls falhou (fail-open):', error)
      initialUrls = montarInitialUrls(pares, data ?? [])
    }
  } catch (e) {
    console.warn('[/design] referências/assinaturas falharam (fail-open):', e)
  }

  
  let initialThreads: ThreadItem[] = []
  if (agentInstalled) {
    try {
      initialThreads = (await listRoomThreads(operator.id, AGENT_ID)) as unknown as ThreadItem[]
    } catch (e) {
      console.warn('[/design] listRoomThreads falhou (fail-open):', e)
    }
  }

  
  const ritualPendente = agentInstalled && (!direcao || renderDirecaoArte(direcao) === '')

  return (
    <DesignClient
      
      
      key={`${AGENT_ID}:${conversationId ?? 'nova'}`}
      agentId={AGENT_ID}
      agentName={agentName}
      agentInstalled={agentInstalled}
      vozDesligada={agentRow?.voz_desligada ?? false}
      initialMessages={initialMessages}
      initialConversationId={conversationId}
      initialCriativos={initialCriativos}
      initialReferencias={initialReferencias}
      initialUrls={initialUrls}
      direcaoArte={direcao}
      brandName={brand?.nome ?? null}
      ritualPendente={ritualPendente}
      initialThreads={initialThreads}
      isDono={papel === 'dono'}
    />
  )
}


function extractCitations(toolPayload: unknown): NotaCitada[] | undefined {
  if (!toolPayload || typeof toolPayload !== 'object') return undefined
  const notes = (toolPayload as { citations?: unknown }).citations
  if (Array.isArray(notes) && notes.length) return notes as NotaCitada[]
  return undefined
}
