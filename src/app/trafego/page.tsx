
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { getAgentRow } from '@/data/agents'
import { roomConversation, listMessages, listRoomThreads, getConversationForOperator } from '@/data/messages'
import { listBlocos, getSnapshotsByIds } from '@/data/trafego'
import { listCrew } from '@/data/crew'
import { getLatestAccountMemory } from '@/data/accountMemory'
import { checkMetaReadHealth, type MetaHealth } from '@/server/config/metaHealth'
import { TrafegoClient } from './TrafegoClient'
import type { ChatMessage } from '../conversa/useChatStream'
import type { ThreadItem } from '@/lib/conversas/thread'
import type { NotaCitada } from '@/server/tools/buscarCerebro'
import type { PainelBlocoComDados } from '@/components/trafego/PainelCanvas'
import type { MetricShape } from '@/lib/trafego/types'
import type { CrewMember } from '@/data/crew'
import type { AccountMemory } from '@/lib/trafego/accountMemory'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tráfego',
  description: 'Painel de tráfego do Rui — leitura do Meta Ads e diagnóstico.',
}

const AGENT_ID = 'gestor-trafego'

export default async function TrafegoPage({
  searchParams,
}: {
  searchParams?: Promise<{ c?: string }>
}) {
  const cookieStore = await cookies()
  const operator = await requireOperator(cookieStore)
  const sp = (await searchParams) ?? {}

  
  
  
  
  const [agentRow, blocoRows, crew, accountMemory, metaHealth] = await Promise.all([
    getAgentRow(AGENT_ID),
    listBlocos(operator.id, AGENT_ID),
    listCrew().catch((e: unknown) => {
      console.warn('[/trafego] listCrew falhou (fail-open):', e)
      return [] as CrewMember[]
    }),
    getLatestAccountMemory(operator.id).catch((e: unknown) => {
      console.warn('[/trafego] getLatestAccountMemory falhou (fail-open):', e)
      return null as { accountId: string; mem: AccountMemory } | null
    }),
    checkMetaReadHealth().catch((e: unknown) => {
      console.warn('[/trafego] checkMetaReadHealth falhou (fail-open):', e)
      return 'expired' as MetaHealth
    }),
  ])

  const agentInstalled = !!agentRow && agentRow.enabled
  const agentName = agentRow?.name ?? 'Rui'

  
  
  let conversationId: string | null = null
  const snapIds = blocoRows.map((b) => b.snapshot_id).filter((id): id is string => !!id)
  
  
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
        console.warn('[/trafego] listRoomThreads falhou (fail-open):', e)
        return [] as ThreadItem[]
      })
    : Promise.resolve([] as ThreadItem[])
  const [rows, snaps, initialThreads] = await Promise.all([roomP, getSnapshotsByIds(operator.id, snapIds), threadsP])

  const initialMessages: ChatMessage[] = []
  for (const row of rows) {
    if (row.role !== 'user' && row.role !== 'assistant') continue
    const citations = extractCitations(row.tool_payload)
    initialMessages.push({
      id: row.id,
      role: row.role,
      content: row.content ?? '',
      ...(citations ? { citations } : {}),
    })
  }

  
  const snapById = new Map(snaps.map((s) => [s.id, s]))
  const initialBlocos: PainelBlocoComDados[] = blocoRows.map((b) => {
    const snap = b.snapshot_id ? snapById.get(b.snapshot_id) : undefined
    return {
      id: b.id,
      type: b.type,
      config: b.config,
      snapshot_id: b.snapshot_id,
      annotation: b.annotation,
      position: b.position,
      status: b.status,
      created_at: b.created_at,
      ...(snap ? { metrics: snap.metrics as MetricShape } : {}),
    }
  })

  return (
    <TrafegoClient
      
      
      key={`${AGENT_ID}:${conversationId ?? 'nova'}`}
      agentId={AGENT_ID}
      agentName={agentName}
      agentInstalled={agentInstalled}
      vozDesligada={agentRow?.voz_desligada ?? false}
      initialMessages={initialMessages}
      initialConversationId={conversationId}
      initialBlocos={initialBlocos}
      crew={crew}
      accountMemory={accountMemory}
      metaHealth={metaHealth}
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
