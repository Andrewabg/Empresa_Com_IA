
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { getAgentRow } from '@/data/agents'
import { roomConversation, listMessages, listRoomThreads, getConversationForOperator } from '@/data/messages'
import { getDefaultBrand } from '@/data/brands'
import { getBrandVoice } from '@/data/brandVoice'
import { listPecasComUltimaVersao, toPecaView } from '@/data/pecas'
import { listSwipes, toSwipeView } from '@/data/swipes'
import { listCampanhas, toCampanhaView } from '@/data/campanhas'
import { listCrew } from '@/data/crew'
import { CopyClient } from './CopyClient'
import type { ChatMessage } from '../conversa/useChatStream'
import type { ThreadItem } from '@/lib/conversas/thread'
import type { NotaCitada } from '@/server/tools/buscarCerebro'
import type { PecaView, SwipeView, CampanhaView } from '@/lib/estudio/types'
import { renderBrandVoice, type BrandVoice } from '@/lib/estudio/brandVoice'
import type { CrewMember } from '@/data/crew'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Copy',
  description: 'Estúdio do copywriter — a Lia.',
}

const AGENT_ID = 'copywriter'

export default async function CopyPage({
  searchParams,
}: {
  searchParams?: Promise<{ c?: string }>
}) {
  const cookieStore = await cookies()
  const operator = await requireOperator(cookieStore)
  const sp = (await searchParams) ?? {}

  
  
  const [agentRow, b, crew] = await Promise.all([
    getAgentRow(AGENT_ID),
    getDefaultBrand(operator.id).catch((e: unknown) => {
      console.warn('[/copy] carga da marca/peças falhou (fail-open):', e)
      return null
    }),
    listCrew().catch((e: unknown) => {
      console.warn('[/copy] listCrew falhou (fail-open):', e)
      return [] as CrewMember[]
    }),
  ])

  const agentInstalled = !!agentRow && agentRow.enabled
  const agentName = agentRow?.name ?? 'Lia'

  
  
  const brand: { id: string; nome: string; slug: string } | null = b
    ? { id: b.id, nome: b.nome, slug: b.slug }
    : null

  
  
  
  let brandVoice: BrandVoice | null = null
  let pecas: PecaView[] = []
  let initialSwipes: SwipeView[] = []
  let initialCampanhas: CampanhaView[] = []

  const brandLoadP: Promise<void> = b
    ? (async () => {
        const [bvR, pecasR, swipesR, campR] = await Promise.allSettled([
          getBrandVoice(operator.id, b.id),
          listPecasComUltimaVersao(operator.id, b.id, 'copywriter'),
          listSwipes(operator.id, b.id),
          listCampanhas(operator.id, b.id),
        ])
        if (bvR.status === 'fulfilled') brandVoice = bvR.value
        else console.warn('[/copy] getBrandVoice falhou (fail-open):', bvR.reason)
        if (swipesR.status === 'fulfilled') initialSwipes = swipesR.value.map(toSwipeView)
        else console.warn('[/copy] listSwipes falhou (fail-open):', swipesR.reason)
        if (campR.status === 'fulfilled') initialCampanhas = campR.value.map(toCampanhaView)
        else console.warn('[/copy] listCampanhas falhou (fail-open):', campR.reason)
        if (pecasR.status === 'fulfilled') {
          
          
          
          pecas = pecasR.value.map((r) => toPecaView({ ...r, versoes: r.ultimaVersao ? [r.ultimaVersao] : [] }))
        } else console.warn('[/copy] listPecas falhou (fail-open):', pecasR.reason)
      })()
    : Promise.resolve()

  let conversationId: string | null = null
  
  
  const salaP = async () => {
    const escolhida = sp.c ? await getConversationForOperator(sp.c, operator.id) : null
    return escolhida && escolhida.agent_id === AGENT_ID
      ? escolhida
      : roomConversation(operator.id, AGENT_ID)
  }
  const roomP: Promise<Awaited<ReturnType<typeof listMessages>>> = agentInstalled
    ? salaP().then((conv) => {
        conversationId = conv.id
        return listMessages(conv.id)
      })
    : Promise.resolve([])

  
  const threadsP: Promise<ThreadItem[]> = agentInstalled
    ? (listRoomThreads(operator.id, AGENT_ID) as unknown as Promise<ThreadItem[]>).catch((e: unknown) => {
        console.warn('[/copy] listRoomThreads falhou (fail-open):', e)
        return [] as ThreadItem[]
      })
    : Promise.resolve([] as ThreadItem[])
  const [msgRows, , initialThreads] = await Promise.all([roomP, brandLoadP, threadsP])

  const initialMessages: ChatMessage[] = []
  for (const row of msgRows) {
    if (row.role !== 'user' && row.role !== 'assistant') continue
    const citations = extractCitations(row.tool_payload)
    initialMessages.push({
      id: row.id,
      role: row.role,
      content: row.content ?? '',
      ...(citations ? { citations } : {}),
    })
  }

  
  
  const ritualPendente = agentInstalled && (!brandVoice || renderBrandVoice(brandVoice) === '')

  return (
    <CopyClient
      
      
      key={`${AGENT_ID}:${conversationId ?? 'nova'}`}
      agentId={AGENT_ID}
      agentName={agentName}
      agentInstalled={agentInstalled}
      vozDesligada={agentRow?.voz_desligada ?? false}
      initialMessages={initialMessages}
      initialConversationId={conversationId}
      initialPecas={pecas}
      initialSwipes={initialSwipes}
      initialCampanhas={initialCampanhas}
      brandVoice={brandVoice}
      brandName={brand?.nome ?? null}
      crew={crew}
      ritualPendente={ritualPendente}
      initialThreads={initialThreads}
    />
  )
}


function extractCitations(toolPayload: unknown): NotaCitada[] | undefined {
  if (!toolPayload || typeof toolPayload !== 'object') return undefined
  const notes = (toolPayload as { citations?: unknown }).citations
  if (Array.isArray(notes) && notes.length) return notes as NotaCitada[]
  return undefined
}
