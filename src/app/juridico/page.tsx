
import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { getMembro } from '@/server/auth/membro'
import { getAgentRow } from '@/data/agents'
import { roomConversation, listMessages, listRoomThreads, getConversationForOperator } from '@/data/messages'
import { getFichaJuridica } from '@/data/fichaJuridica'
import { listContratos } from '@/data/contratos'
import { listPrazos, listPrazosAtivos } from '@/data/prazos'
import { JuridicoClient } from './JuridicoClient'
import type { ChatMessage } from '../conversa/useChatStream'
import type { ThreadItem } from '@/lib/conversas/thread'
import type { NotaCitada } from '@/server/tools/buscarCerebro'
import { toContratoView, type ContratoView } from '@/lib/juridico/types'
import { toPrazoView, type PrazoView } from '@/lib/juridico/prazosTipos'
import { renderFichaJuridica, EMPTY_FICHA_JURIDICA, type FichaJuridica } from '@/lib/juridico/ficha'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Jurídico',
  description: 'Escritório jurídico — o Alan.',
}

const AGENT_ID = 'juridico'

export default async function JuridicoPage({
  searchParams,
}: {
  searchParams?: Promise<{ c?: string }>
}) {
  const cookieStore = await cookies()
  const operator = await requireOperator(cookieStore)
  const sp = (await searchParams) ?? {}

  
  
  
  
  let ehDono = false
  try { ehDono = (await getMembro(cookieStore))?.papel === 'dono' } catch (err) {
    console.warn('[/juridico] leitura do papel falhou (radar fica no escopo do operador):', err)
  }

  
  const agentRowP = getAgentRow(AGENT_ID)

  let ficha: FichaJuridica = EMPTY_FICHA_JURIDICA
  let contratos: ContratoView[] = []
  let initialPrazos: PrazoView[] = []

  const fichaLoadP: Promise<void> = (async () => {
    const [fichaR, contratosR, prazosR] = await Promise.allSettled([
      getFichaJuridica(operator.id),
      listContratos(operator.id, AGENT_ID),
      ehDono ? listPrazosAtivos() : listPrazos(operator.id, { status: 'ativo' }),
    ])
    if (fichaR.status === 'fulfilled') ficha = fichaR.value
    else console.warn('[/juridico] getFichaJuridica falhou (fail-open):', fichaR.reason)
    if (contratosR.status === 'fulfilled') contratos = contratosR.value.map(toContratoView)
    else console.warn('[/juridico] listContratos falhou (fail-open):', contratosR.reason)
    if (prazosR.status === 'fulfilled') initialPrazos = prazosR.value.map(toPrazoView)
    else console.warn('[/juridico] listPrazos falhou (fail-open):', prazosR.reason)
  })()

  const agentRow = await agentRowP
  const agentInstalled = !!agentRow && agentRow.enabled
  const agentName = agentRow?.name ?? 'Alan'

  
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
        console.warn('[/juridico] listRoomThreads falhou (fail-open):', e)
        return [] as ThreadItem[]
      })
    : Promise.resolve([] as ThreadItem[])
  const [msgRows, , initialThreads] = await Promise.all([roomP, fichaLoadP, threadsP])

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

  
  
  const ritualPendente = agentInstalled && renderFichaJuridica(ficha) === ''

  return (
    <JuridicoClient
      
      
      key={`${AGENT_ID}:${conversationId ?? 'nova'}`}
      agentId={AGENT_ID}
      agentName={agentName}
      agentInstalled={agentInstalled}
      vozDesligada={agentRow?.voz_desligada ?? false}
      initialMessages={initialMessages}
      initialConversationId={conversationId}
      initialContratos={contratos}
      initialFicha={ficha}
      initialPrazos={initialPrazos}
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
