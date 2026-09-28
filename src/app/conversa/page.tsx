
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireOperator } from '@/server/auth/session'
import { roomConversation, latestRoom, listMessages, getConversationForOperator, listRoomThreads } from '@/data/messages'
import { getAgentRow } from '@/data/agents'
import { getBranding } from '@/server/config/branding'
import { listArtifactsByConversation } from '@/data/artifacts'
import { isAnexoDeConversa } from '@/lib/artifacts'
import { investigacaoDoPayload, type InvestigacaoResumo } from '@/lib/trafego/graph/comoCheguei'
import { getOrCreateOnboardingSession } from '@/data/onboardingSession'
import { listCrew } from '@/data/crew'
import { ConversaClient } from './ConversaClient'
import type { ChatMessage } from './useChatStream'
import type { AnexoNaMensagem } from '@/lib/conversa/anexo'
import type { NotaCitada } from '@/server/tools/buscarCerebro'
import type { ArtifactRow } from '@/data/artifacts'
import type { CrewMember } from '@/data/crew'
import type { Conversation } from '@/data/messages'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Conversa',
  description: 'Falar com o Nathan, seu assistente.',
}

export default async function ConversaPage({ searchParams }: { searchParams: Promise<{ agent?: string; handoff?: string; c?: string; nova?: string; ferias?: string }> }) {
  const cookieStore = await cookies()
  const operator = await requireOperator(cookieStore)
  const sp = await searchParams

  
  
  let agentId: string
  let agentRow = null
  if (sp.agent) {
    agentRow = await getAgentRow(sp.agent)
    
    
    
    
    if (!agentRow || !agentRow.enabled) {
      
      
      
      const aviso = agentRow && !agentRow.enabled ? `&ferias=${encodeURIComponent(agentRow.name)}` : ''
      redirect(sp.nova ? `/conversa?nova=1${aviso}` : `/conversa?${aviso.slice(1)}`)
    }
    agentId = agentRow.id
  } else {
    const last = await latestRoom(operator.id)
    agentId = last?.agent_id ?? 'jarvis'
  }
  
  
  
  if (!agentRow || !agentRow.enabled) agentRow = await getAgentRow(agentId)

  
  
  
  
  
  
  
  
  
  
  if (!agentRow) {
    const { ensurePrimaryAgent } = await import('@/data/agents')
    const { SEED_PRIMARY_AGENT } = await import('@/server/agent/jarvis')
    agentRow = await ensurePrimaryAgent(SEED_PRIMARY_AGENT)
    agentId = agentRow.id
  }

  
  
  
  
  const novaConversa = !!sp.nova
  let conversationId: string | null = null
  const initialMessages: ChatMessage[] = []
  let initialArtifacts: ArtifactRow[] = []

  if (!novaConversa) {
    let conversation: Awaited<ReturnType<typeof roomConversation>>
    if (sp.c) {
      const escolhida = await getConversationForOperator(sp.c, operator.id)
      conversation = escolhida && escolhida.agent_id === agentId
        ? escolhida
        : await roomConversation(operator.id, agentId)
    } else {
      conversation = await roomConversation(operator.id, agentId)
    }
    conversationId = conversation.id

    const rows = await listMessages(conversation.id)
    for (const row of rows) {
      if (row.role !== 'user' && row.role !== 'assistant') continue
      const citations = extractCitations(row.tool_payload)
      const anexos = extractAnexos(row.tool_payload)
      const investigacao = extractInvestigacao(row.tool_payload)
      initialMessages.push({
        id: row.id,
        role: row.role,
        content: row.content ?? '',
        created_at: row.created_at,
        ...(citations ? { citations } : {}),
        ...(anexos ? { anexos } : {}),
        ...(investigacao ? { investigacao } : {}),
      })
    }
    
    
    
    
    
    
    
    
    const artefatos = await listArtifactsByConversation(conversation.id)
    initialArtifacts = artefatos.filter((a) => !isAnexoDeConversa(a))
  }

  
  let crew: CrewMember[] = []
  try {
    crew = await listCrew()
  } catch (e) {
    console.warn('[/conversa] listCrew falhou (fail-open):', e)
  }

  
  let initialThreads: Conversation[] = []
  try {
    initialThreads = await listRoomThreads(operator.id, agentId)
  } catch (e) {
    console.warn('[/conversa] listRoomThreads falhou (fail-open):', e)
  }

  
  
  
  
  
  let interview: { autoOpen: boolean; minDone: boolean; fase: string | null } = {
    autoOpen: false,
    minDone: true,
    fase: null,
  }
  
  
  
  
  let converterDisponivel = false
  try {
    const session = await getOrCreateOnboardingSession(operator.id)
    const faseAtiva = session.fase === 'abertura' || session.fase === 'roteamento' || session.fase === 'entrevista'
    
    
    
    interview = { autoOpen: faseAtiva, minDone: !faseAtiva, fase: session.fase }
    converterDisponivel =
      (session.perfil === 'curioso' || session.perfil === 'sem_empresa' || session.perfil === 'revendedor') &&
      session.fase === 'concluida'
  } catch (e) {
    console.warn('[/conversa] onboarding session falhou (fail-open):', e)
  }

  
  
  const agentName = agentRow?.name ?? (await getBranding()).assistantName

  
  
  
  
  
  
  const abrirOpener =
    interview.autoOpen && agentId === 'jarvis' && initialMessages.length === 0 && !novaConversa

  return (
    <ConversaClient
      key={`${agentId}:${conversationId ?? 'nova'}`}
      initialMessages={initialMessages}
      initialConversationId={conversationId}
      nasceFresh={novaConversa}
      initialArtifacts={initialArtifacts}
      interview={{ autoOpen: abrirOpener, minDone: interview.minDone, fase: interview.fase }}
      converterDisponivel={converterDisponivel && agentId === 'jarvis'}
      agentId={agentId}
      agentName={agentName}
      vozDesligada={agentRow?.voz_desligada ?? false}
      handoff={sp.handoff ?? null}
      crew={crew}
      initialThreads={initialThreads}
      agenteDeFerias={sp.ferias ?? null}
    />
  )
}


function extractCitations(toolPayload: unknown): NotaCitada[] | undefined {
  if (!toolPayload || typeof toolPayload !== 'object') return undefined
  const notes = (toolPayload as { citations?: unknown }).citations
  if (Array.isArray(notes) && notes.length) return notes as NotaCitada[]
  return undefined
}


function extractInvestigacao(toolPayload: unknown): InvestigacaoResumo | undefined {
  if (!toolPayload || typeof toolPayload !== 'object') return undefined
  return investigacaoDoPayload((toolPayload as { investigacao?: unknown }).investigacao) ?? undefined
}


function extractAnexos(toolPayload: unknown): AnexoNaMensagem[] | undefined {
  if (!toolPayload || typeof toolPayload !== 'object') return undefined
  const bruto = (toolPayload as { anexos?: unknown }).anexos
  if (!Array.isArray(bruto)) return undefined
  const anexos: AnexoNaMensagem[] = []
  for (const item of bruto) {
    if (!item || typeof item !== 'object') continue
    const { id, kind, title, bytes } = item as Record<string, unknown>
    if (typeof id !== 'string' || !id) continue
    if (kind !== 'imagem' && kind !== 'documento') continue
    anexos.push({
      id,
      kind,
      title: typeof title === 'string' && title ? title : 'arquivo',
      bytes: typeof bytes === 'number' && Number.isFinite(bytes) && bytes >= 0 ? bytes : 0,
    })
  }
  return anexos.length ? anexos : undefined
}
