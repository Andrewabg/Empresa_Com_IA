

import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { Agent } from '@mastra/core/agent'
import type { NextCookieStore } from '../supabase'
import type { Papel } from '@/lib/equipe'
import { FORMATO_DA_FALA, FORMATO_DO_CHAT_WEB } from '@/lib/conversa/formatoDoChat'

import { requireMembro } from '../auth/membro'
import { NotConfiguredError } from '../brain/runtime'
import { appendMessage, buscarNoTranscript, createConversation, createRoomConversation, getConversationForOperator, listAnexosDaConversa, listFirstMessages, listRecentMessages, roomConversation } from '../../data/messages'
import { listArtifactIdsByConversation } from '../../data/artifacts'
import { getJarvisAgent, getAgent } from './jarvis'
import { runConversationTurn } from './runConversationTurn'
import type { ResumoTurno } from './conselheiroEvents'
import { criarWebSink } from './webSink'
import { conduzirTurno, capturarSemTool, registrarAderencia } from '../onboarding/conduzirTurno'
import { getOnboardingSession } from '@/data/onboardingSession'
import { progressoNucleo } from '@/lib/onboarding/slots'
import { withTimeout } from '@/lib/withTimeout'
import { textoSubstantivo } from '@/lib/onboarding/roteamento'
import { CITATIONS_DATA_TYPE, CONVERSATION_DATA_TYPE, MENSAGEM_DATA_TYPE, ONBOARDING_DATA_TYPE, type OnboardingProgress } from './wireTypes'
import { readBudgetGate } from '../../data/cost'
import { estourouBudget } from '../../lib/cost-guard'
import { assembleStableMemory, assembleRecallMemory } from '../memory/inject'
import { recallEscopadoDoAgente } from '../memory/agentContext'
import { AMBIENT_RECALL_K } from '@/lib/memory/recallBudget'
import { listAgents, getAgentRow } from '../../data/agents'
import type { AgentRow } from '../../data/agents'
import type { RecentMessage } from '../../data/messages'
import { renderRoster } from '../../lib/roster'
import { SEED_COO_AGENT } from './maestro/cooPersona'
import { blocoRelogio, tzSegura, comContextoNaUltimaMsg } from '../../lib/relogio'
import { precisaRecall, turnoFactualSemGrounding } from '../../lib/memory/recallGate'
import { falaAnteriorDoUsuario, precisaBuscaNoTranscrito } from '@/lib/memory/consultaDeRecall'
import { tituloProvisorio } from '@/lib/conversas/titulo'
import { getSetting } from '../../data/settings'
import { gerarTituloThread } from './tituloThread'
import { BUFFER_MESSAGES, FETCH_MESSAGES } from '@/lib/memory/historyWindow'
import { falasDoDonoDasMensagens } from '@/lib/conversa/falasDoDono'
import { deveInjetarResumo, renderResumoRetomada } from '@/lib/memory/resumoRetomada'
import { ABERTURA_MSGS, renderAberturaConversa } from '@/lib/memory/aberturaConversa'
import { renderTrechosTranscript } from '@/lib/memory/trechosTranscript'
import { enqueueMemoryJob } from '@/data/memoryJobs'
import { latestEpisodicSummary } from '../../data/episodicMemory'
import { serverDb } from '../supabase'
import { marcadorDeAnexo, renderMateriaisConversa } from '@/lib/conversa/materiais'
import type { AnexoNaMensagem } from '@/lib/conversa/anexo'
import { montarPartesDoUsuario, type PartePrompt } from '@/lib/conversa/partes'
import { kickoffPromptDoAgente } from '@/lib/conversa/kickoffPrompt'
import { resolverAnexosDoTurno, type AnexoDoTurno, type MotivoRecusaAnexo } from './anexosDoTurno'
import { passosDoAgente } from '@/lib/turno/passos'








const MAX_STEPS = 8



const BUDGET_EXCEEDED_MESSAGE =
  'O teto de gasto de IA deste mês foi atingido, então pausei as respostas para não estourar sua conta da OpenAI. Ajuste o orçamento mensal em Configurações → Custo para retomar.'





const ANEXO_RECUSADO_MESSAGE: Record<MotivoRecusaAnexo, string> = {
  posse: 'Não encontrei o arquivo que você anexou nesta conversa, então preferi não responder no escuro. Anexe de novo aqui e eu olho na hora.',
  download: 'Não consegui abrir o arquivo que você anexou agora, e não vou comentar um arquivo que não vi. Tente enviar de novo em instantes.',
}







export { CITATIONS_DATA_TYPE, CONVERSATION_DATA_TYPE }


interface ModelChatMessage {
  role: 'user' | 'assistant'
  content: string
}


export interface ChatAgentLike {
  
  
  
  
  stream(messages: unknown, options?: unknown): Promise<{ fullStream: unknown }>
}

export interface RunChatTurnArgs {
  conversationId: string
  userText?: string
  agent: ChatAgentLike
  
  emitConversationId?: boolean
  
  interviewDirective?: string
  
  onboardingProgress?: OnboardingProgress
  
  kickoff?: boolean
  
  kickoffPrompt?: string
  
  memoryBlock?: string
  
  operatorId?: string
  
  papel?: Papel
  
  rosterBlock?: string
  
  materiaisBlock?: string
  
  anexos?: AnexoDoTurno[]
  
  suffixContext?: string
  
  handoffBlock?: string
  
  porVoz?: boolean
  
  historicoPrecarregado?: RecentMessage[]
  
  tz?: string
  
  costAgentId?: string
  
  costModel?: string
  
  checkBudget?: () => Promise<{ spentUsd: number; budgetUsd: number }>
  
  carregarResumoConversa?: (conversationId: string) => Promise<string | null>
  
  aoFimDoTurno?: (resumo: ResumoTurno) => void | Promise<void>
  
  progressoFinal?: () => Promise<OnboardingProgress | null>
  
  maxSteps?: number
}


const TETO_PROGRESSO_FINAL_MS = 1_500


const TETO_POS_TURNO_MS = 8_000


function streamDeMensagemFixa(args: {
  conversationId: string
  texto: string
  textId: string
  emitConversationId?: boolean
}): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (args.emitConversationId) {
        writer.write({ type: CONVERSATION_DATA_TYPE, data: { id: args.conversationId }, transient: true })
      }
      writer.write({ type: 'text-start', id: args.textId })
      writer.write({ type: 'text-delta', id: args.textId, delta: args.texto })
      writer.write({ type: 'text-end', id: args.textId })
    },
    onError: () => 'Erro ao gerar a resposta.',
  })
  return createUIMessageStreamResponse({ stream })
}


export async function runChatTurn(args: RunChatTurnArgs): Promise<Response> {
  const { conversationId, agent, emitConversationId, interviewDirective, onboardingProgress, kickoff, memoryBlock, materiaisBlock, operatorId, papel, rosterBlock, suffixContext, handoffBlock, costAgentId, costModel, checkBudget, carregarResumoConversa, historicoPrecarregado, maxSteps, tz } = args
  const userText = args.userText ?? ''
  const anexos = args.anexos ?? []

  
  
  
  
  
  const textoPersistido = userText.trim().length > 0 ? userText : marcadorDeAnexo(anexos.map((a) => a.nome))
  
  
  
  
  const payloadAnexos: { anexos: AnexoNaMensagem[] } | undefined = anexos.length
    ? { anexos: anexos.map((a) => ({ id: a.id, kind: a.kind, title: a.nome, bytes: a.bytes.byteLength })) }
    : undefined

  
  
  
  
  
  
  
  let budgetEstourou = false
  try {
    const read = checkBudget ?? readBudgetGate
    const { spentUsd, budgetUsd } = await read()
    budgetEstourou = estourouBudget(spentUsd, budgetUsd)
  } catch (e) {
    
    console.warn('[runChatTurn] leitura de budget falhou (fail-open, segue o turno):', e)
    budgetEstourou = false
  }
  if (budgetEstourou) {
    
    
    
    
    
    
    if (!kickoff && textoPersistido) {
      try { await appendMessage(conversationId, 'user', textoPersistido, payloadAnexos) } catch {  }
    }
    return streamDeMensagemFixa({
      conversationId,
      texto: BUDGET_EXCEEDED_MESSAGE,
      textId: 'jarvis-budget',
      emitConversationId,
    })
  }

  
  
  
  
  
  
  
  
  
  
  
  const [prior, seenArtifactIdsArr] = await Promise.all([
    historicoPrecarregado ?? listRecentMessages(conversationId, FETCH_MESSAGES),
    listArtifactIdsByConversation(conversationId).catch(() => [] as string[]),
  ])
  const seenArtifactIds = new Set<string>(seenArtifactIdsArr)
  
  
  
  
  const validas: ModelChatMessage[] = prior
    .filter(
      (m) =>
        m.content != null &&
        m.content !== '' &&
        
        (m.role === 'user' || m.role === 'assistant'),
    )
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }))
  const history: ModelChatMessage[] = validas.slice(-BUFFER_MESSAGES)

  
  
  
  let resumoRetomadaBlock: string | undefined
  
  
  
  let aberturaBlock: string | undefined
  
  
  let trechosBlock: string | undefined
  if (deveInjetarResumo(validas.length, BUFFER_MESSAGES)) {
    try {
      const carregar = carregarResumoConversa ?? ((id: string) => latestEpisodicSummary(serverDb(), id))
      const resumo = await carregar(conversationId)
      const bloco = resumo ? renderResumoRetomada(resumo) : ''
      if (bloco) resumoRetomadaBlock = bloco
      else {
        
        
        
        
        
        console.warn(
          `[runChatTurn] histórico truncado SEM resumo do thread (conversa ${conversationId}, ${validas.length} msgs válidas): repondo pela âncora de abertura e pedindo reflexão.`,
        )
        void enqueueMemoryJob('reflect', conversationId).catch((e) => {
          console.warn('[runChatTurn] enqueue de reflexão na truncagem fail-open:', e)
        })
      }
    } catch (e) {
      console.warn('[runChatTurn] resumo de retomada fail-open (segue sem o bloco):', e)
    }
    try {
      const primeiras = await listFirstMessages(conversationId, ABERTURA_MSGS * 3)
      const bloco = renderAberturaConversa(
        primeiras
          .filter((m) => (m.role === 'user' || m.role === 'assistant') && !!m.content)
          
          
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content as string, socorro: m.socorro })),
      )
      if (bloco) aberturaBlock = bloco
    } catch (e) {
      console.warn('[runChatTurn] âncora de abertura fail-open (segue sem o bloco):', e)
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    if (!kickoff && costAgentId && operatorId && precisaBuscaNoTranscrito(userText)) {
      try {
        const idsNaJanela = prior.slice(-BUFFER_MESSAGES).map((m) => m.id)
        const achados = await buscarNoTranscript({
          operatorId,
          agentId: costAgentId,
          query: userText,
          limite: 2,
          conversationId,
          excluirIds: idsNaJanela,
        })
        trechosBlock = renderTrechosTranscript(achados) || undefined
      } catch (e) {
        console.warn('[runChatTurn] auto-recall do transcrito fail-open (segue sem o bloco):', e)
      }
    }
  }

  
  
  
  
  
  
  
  const agentMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | PartePrompt[] }> = []
  
  
  
  
  
  agentMessages.push({ role: 'system', content: FORMATO_DO_CHAT_WEB })
  if (rosterBlock) agentMessages.push({ role: 'system', content: rosterBlock })
  if (memoryBlock) agentMessages.push({ role: 'system', content: memoryBlock })
  
  
  
  if (materiaisBlock) agentMessages.push({ role: 'system', content: materiaisBlock })
  if (interviewDirective) agentMessages.push({ role: 'system', content: interviewDirective })
  if (handoffBlock) agentMessages.push({ role: 'system', content: handoffBlock })
  
  if (aberturaBlock) agentMessages.push({ role: 'system', content: aberturaBlock })
  if (resumoRetomadaBlock) agentMessages.push({ role: 'system', content: resumoRetomadaBlock })
  agentMessages.push(...history)
  if (kickoff) {
    agentMessages.push({
      role: 'user',
      content: args.kickoffPrompt ?? 'Comece a entrevista agora: faça a primeira pergunta (uma só, calorosa).',
    })
  } else {
    
    agentMessages.push({ role: 'user', content: montarPartesDoUsuario(userText, anexos) })
  }
  
  
  
  
  
  
  const sufixoDoTurno = [suffixContext, trechosBlock, args.porVoz ? FORMATO_DA_FALA : undefined].filter(Boolean).join('\n\n') || undefined
  const messagesParaAgente = sufixoDoTurno ? comContextoNaUltimaMsg(agentMessages, sufixoDoTurno) : agentMessages

  
  
  
  
  if (!kickoff) await appendMessage(conversationId, 'user', textoPersistido, payloadAnexos)

  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      const textId = 'jarvis-text'
      const webSink = criarWebSink(writer, textId)

      
      
      
      
      
      if (emitConversationId) {
        writer.write({ type: CONVERSATION_DATA_TYPE, data: { id: conversationId }, transient: true })
      }
      
      
      if (onboardingProgress) {
        writer.write({ type: ONBOARDING_DATA_TYPE, data: onboardingProgress, transient: true })
      }
      writer.write({ type: 'text-start', id: textId })

      
      
      
      
      
      const resumo = await runConversationTurn(agent, messagesParaAgente, webSink, {
        conversationId,
        operatorId,
        papel,
        costAgentId,
        costModel,
        maxSteps: maxSteps ?? MAX_STEPS,
        emitConversationId: false,
        seenArtifactIds,
        
        
        falaDoDono: userText,
        
        
        
        
        falasDoDono: falasDoDonoDasMensagens([...history, { role: 'user', content: userText }]),
        tz,
      })

      
      
      if (resumo.messageId) {
        writer.write({ type: MENSAGEM_DATA_TYPE, data: { id: resumo.messageId }, transient: true })
      }
      writer.write({ type: 'text-end', id: textId })

      
      
      
      
      
      
      
      
      if (args.aoFimDoTurno) {
        try {
          await withTimeout(
            Promise.resolve(args.aoFimDoTurno(resumo)),
            TETO_POS_TURNO_MS,
            'aoFimDoTurno',
          )
        } catch (e) {
          console.warn('[runChatTurn] gancho pós-turno falhou (turno segue):', e)
        }
      }

      
      
      if (args.progressoFinal) {
        try {
          const atualizado = await withTimeout(
            args.progressoFinal(),
            TETO_PROGRESSO_FINAL_MS,
            'progressoFinal',
          )
          if (atualizado) writer.write({ type: ONBOARDING_DATA_TYPE, data: atualizado, transient: true })
        } catch (e) {
          console.warn('[runChatTurn] releitura do progresso falhou (indicador segue defasado):', e)
        }
      }
    },
    onError: (error) => {
      console.error('[runChatTurn] stream error:', error)
      return 'Erro ao gerar a resposta.'
    },
  })

  return createUIMessageStreamResponse({ stream: uiStream })
}

export interface HandleChatArgs {
  conversationId?: string
  userText?: string
  cookies: NextCookieStore
  
  kickoff?: boolean
  
  fresh?: boolean
  
  agentId?: string
  
  handoff?: string
  
  focoContratoId?: string
  
  porVoz?: boolean
  
  anexoIds?: string[]
}


export async function resolverConversaId(args: {
  conversationId?: string
  fresh?: boolean
  operatorId: string
  agentId: string
  userText?: string
}): Promise<{ id: string; createdNew: boolean }> {
  if (args.conversationId) {
    const propria = await getConversationForOperator(args.conversationId, args.operatorId)
    if (propria) return { id: propria.id, createdNew: false }
  }
  if (args.fresh) {
    const c = await createRoomConversation(args.operatorId, args.agentId, tituloProvisorio(args.userText ?? ''), true)
    return { id: c.id, createdNew: true }
  }
  const room = await roomConversation(args.operatorId, args.agentId)
  return { id: room.id, createdNew: true }
}


export interface GanchoPosTurnoDeps {
  capturar: typeof capturarSemTool
  aderencia: typeof registrarAderencia
}


export function montarGanchoPosTurno(
  args: {
    agentId: string
    kickoff: boolean
    
    slotAtivo: string | undefined
    
    recemRoteado: boolean
    userText: string
    operatorId: string
    conversationId: string
  },
  deps: GanchoPosTurnoDeps = { capturar: capturarSemTool, aderencia: registrarAderencia },
): ((resumo: ResumoTurno) => Promise<void>) | undefined {
  const { agentId, kickoff, slotAtivo, recemRoteado, userText, operatorId, conversationId } = args
  if (agentId !== 'jarvis' || kickoff || !slotAtivo || !textoSubstantivo(userText)) return undefined
  return async (resumo: ResumoTurno) => {
    
    
    
    
    
    
    if (!recemRoteado) {
      await deps.capturar({
        operatorId,
        conversationId,
        slotId: slotAtivo,
        userText,
        toolNames: resumo.toolNames,
      }).catch(() => 'ignorado' as const)
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    if (!resumo.textoDeSocorro && !resumo.fechamentoUsado) {
      await deps.aderencia({
        operatorId,
        conversationId,
        slotId: slotAtivo,
        textoDoTurno: resumo.text,
      }).catch(() => 'ignorado' as const)
    }
  }
}


export async function handleChat(args: HandleChatArgs): Promise<Response> {
  const { cookies, kickoff } = args
  const membro = await requireMembro(cookies)
  const operator = membro.user

  
  let agentId = args.agentId ?? 'jarvis'
  let agent: Agent
  let agentRow: AgentRow | null = null
  try {
    agentRow = await getAgentRow(agentId)
    if (!agentRow || !agentRow.enabled) {
      
      agentId = 'jarvis'
      agentRow = await getAgentRow('jarvis')
      agent = await getJarvisAgent()
    } else if (agentId === 'jarvis') {
      agent = await getJarvisAgent()   
    } else {
      try {
        agent = await getAgent(agentId)
      } catch (e) {
        if (e instanceof NotConfiguredError) throw e
        
        
        agentId = 'jarvis'
        agentRow = await getAgentRow('jarvis')
        agent = await getJarvisAgent()
      }
    }
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return Response.json({ needsConfig: true }, { status: 200 })
    }
    throw err
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const stableP = assembleStableMemory({ operatorId: operator.id }).then((s) => s || undefined)
  
  
  
  
  
  
  const conversaCedoP: Promise<{ id: string; createdNew: boolean }> | undefined = kickoff
    ? undefined
    : resolverConversaId({
        conversationId: args.conversationId,
        fresh: args.fresh,
        operatorId: operator.id,
        agentId,
        userText: args.userText,
      })
  
  
  
  
  const historicoP: Promise<RecentMessage[] | undefined> = conversaCedoP
    ? conversaCedoP
        .then((c) => listRecentMessages(c.id, FETCH_MESSAGES))
        .catch((e) => {
          console.warn('[handleChat] histórico da sala falhou (fail-open, o turno relê adiante):', e)
          return undefined
        })
    : Promise.resolve(undefined)
  
  
  const recallP = kickoff || !precisaRecall(args.userText ?? '')
    ? Promise.resolve<string | undefined>(undefined)
    : (async () => {
        
        
        
        const excluirCaminho = agentId === 'jarvis'
          && (await getSetting('company_identity_provisional').catch(() => null)) === 'true'
          ? (c: string) => c === 'identidade/empresa.md'
          : undefined
        
        
        
        
        
        
        const recall = recallEscopadoDoAgente(agentRow, { excluirCaminho })
        
        
        
        const falaAnterior = falaAnteriorDoUsuario((await historicoP) ?? [], args.userText ?? '')
        return (await assembleRecallMemory(args.userText ?? '', AMBIENT_RECALL_K, { recall, falaAnterior })) || undefined
      })()

  
  
  
  
  
  
  let directive: string | undefined
  let needed = false
  let onboardingProgress: OnboardingProgress | undefined
  
  let slotAtivo: string | undefined
  
  
  let recemRoteado = false
  if (agentId === 'jarvis') {
    const r = await conduzirTurno({
      operatorId: operator.id,
      conversationId: args.conversationId,
      userText: args.userText,
      kickoff: !!kickoff,
    })
    directive = r.directive
    needed = r.needed
    slotAtivo = r.slotAtivo
    recemRoteado = !!r.recemRoteado
    
    if (r.fase === 'abertura' || r.fase === 'roteamento' || r.fase === 'entrevista') {
      onboardingProgress = { fase: r.fase, cobertos: r.cobertos, total: r.total }
    }
  } else if (agentId === 'copywriter') {
    try {
      const { getDefaultBrand } = await import('@/data/brands')
      const { getBrandVoice } = await import('@/data/brandVoice')
      const { listPecas } = await import('@/data/pecas')
      const { renderBrandVoice } = await import('@/lib/estudio/brandVoice')
      const { brandCoverage, temDnaDaMarca } = await import('@/lib/estudio/brandCoverage')
      const { brandInterviewDirective } = await import('@/lib/estudio/brandInterviewDirective')
      const brand = await getDefaultBrand(operator.id)
      const voice = brand ? await getBrandVoice(operator.id, brand.id) : null
      
      
      const temDna = !!voice && temDnaDaMarca(voice)
      const cov = voice ? brandCoverage(voice) : { faltando: [], minDone: false }
      
      
      
      const hasPecas = brand ? (await listPecas(operator.id, brand.id, 'copywriter')).length > 0 : false
      const presentePendente = cov.minDone && !hasPecas
      needed = !cov.minDone || presentePendente 
      if (needed) directive = brandInterviewDirective(cov.faltando, temDna)
      
    } catch (e) {
      console.warn('[handleChat] brandCoverage falhou (fail-open):', e)
    }
  } else if (agentId === 'designer') {
    try {
      const { getDefaultBrand } = await import('@/data/brands')
      const { getDirecaoArte } = await import('@/data/brandVoice')
      const { renderDirecaoArte } = await import('@/lib/design/direcaoArte')
      const { designCoverage, temDirecaoDeArte } = await import('@/lib/design/designCoverage')
      const { designInterviewDirective } = await import('@/lib/design/designInterviewDirective')
      const { designBriefsDirective } = await import('@/lib/design/designBriefsDirective')
      const { designArtesDirective } = await import('@/lib/design/designArtesDirective')
      const { briefCoverage } = await import('@/lib/design/briefCoverage')
      const { toCriativoView } = await import('@/lib/design/types')
      const { listPecasComUltimaVersao } = await import('@/data/pecas')
      const { listReferenciasByConversation } = await import('@/data/artifacts')
      const brand = await getDefaultBrand(operator.id)
      const direcao = brand ? await getDirecaoArte(operator.id, brand.id) : null
      
      const temDirecao = !!direcao && temDirecaoDeArte(direcao)
      const cov = direcao ? designCoverage(direcao) : { cobertos: [], faltando: [], minDone: false }
      
      
      
      const pecasList = brand ? await listPecasComUltimaVersao(operator.id, brand.id, 'designer') : []
      const hasCriativos = pecasList.length > 0
      const presentePendente = cov.minDone && !hasCriativos
      needed = !cov.minDone || presentePendente
      const partes: string[] = []
      if (needed) partes.push(designInterviewDirective(cov.faltando, temDirecao))
      
      
      const abertos = pecasList.filter((p) => p.status === 'brief').map((p) => {
        const v = toCriativoView(p, undefined)
        return { id: p.id, titulo: p.titulo || 'Anúncio', pendentes: briefCoverage(v.brief ?? {}).pendentes.map((g) => g.label) }
      })
      const blocoBriefs = designBriefsDirective(abertos)
      if (blocoBriefs) partes.push(blocoBriefs)
      
      
      const geradas = pecasList
        .filter((p) => p.status !== 'brief' && p.status !== 'arquivada')
        .map((p) => ({
          id: p.id,
          titulo: p.titulo || 'Anúncio',
          status: p.status,
          provas: p.ultimaVersao?.variacoes?.length ?? 0,
          updatedAt: p.updated_at,
        }))
      const blocoArtes = designArtesDirective(geradas)
      if (blocoArtes) partes.push(blocoArtes)
      
      
      
      const convIdRefs = args.conversationId ?? (await roomConversation(operator.id, 'designer')).id
      const refs = await listReferenciasByConversation(convIdRefs)
      if (refs.length) {
        partes.push(['FOTOS DE REFERÊNCIA disponíveis nesta conversa (enviadas pelo operador; use referenciaId em gerarCriativo para remixar):',
          ...refs.map((r) => `- ${r.id} — ${r.title}`)].join('\n'))
      }
      if (partes.length) directive = partes.join('\n\n')
    } catch (e) {
      console.warn('[handleChat] designCoverage falhou (fail-open):', e)
    }
  } else if (agentId === 'juridico') {
    try {
      const { getFichaJuridica } = await import('@/data/fichaJuridica')
      const { fichaCoverage, temFichaJuridica, juridicoDirective, resumoMesa, resumoModelos } = await import('@/lib/juridico/directive')
      const { listContratos } = await import('@/data/contratos')
      const { toContratoView } = await import('@/lib/juridico/types')
      const { MODELOS_FABRICA } = await import('@/lib/juridico/modelosFabrica')
      const ficha = await getFichaJuridica(operator.id)
      
      const temFicha = temFichaJuridica(ficha)
      const cov = fichaCoverage(ficha)
      const rows = await listContratos(operator.id, 'juridico')
      const views = rows.map((r) => toContratoView(r))
      const daCasa = views.filter((v) => v.kind === 'modelo' && v.status !== 'arquivado')
      const modelos = resumoModelos(MODELOS_FABRICA, daCasa)
      
      const focoRow = args.focoContratoId ? views.find((v) => v.id === args.focoContratoId) : undefined
      const foco = focoRow ? { id: focoRow.id, titulo: focoRow.titulo } : null
      needed = !cov.minDone
      directive = juridicoDirective({ faltando: cov.faltando, temFicha, mesa: resumoMesa(views.filter((v) => v.kind !== 'modelo')), modelos, foco })
    } catch (e) {
      console.warn('[handleChat] directive do juridico falhou (fail-open):', e)
    }
  } else if (agentId === 'gael') {
    
    
    
    try {
      const { lerCredenciais } = await import('@/server/google-ads/client')
      const { getFichaGoogle } = await import('@/server/google-ads/ficha-store')
      const { coberturaFicha, gaelEntrevistaDirective } = await import('@/lib/google-ads/entrevista')
      const creds = await lerCredenciais()
      const accountId = creds?.customerId ?? null
      if (accountId) {
        const ficha = (await getFichaGoogle(operator.id, accountId)) ?? {}
        needed = !coberturaFicha(ficha).minimoOk
        directive = gaelEntrevistaDirective(ficha)
      }
    } catch (e) {
      console.warn('[handleChat] directive do gael falhou (fail-open):', e)
    }
  }

  
  if (kickoff && !needed) return Response.json({ skipped: true }, { status: 200 })

  
  
  
  
  
  
  const conversationP: Promise<{ id: string; createdNew: boolean }> = conversaCedoP ?? resolverConversaId({
    conversationId: args.conversationId,
    fresh: args.fresh,
    operatorId: operator.id,
    agentId,
    userText: args.userText,
  })

  const rosterP: Promise<string | undefined> =
    agentRow?.is_primary || agentId === 'jarvis' || agentId === SEED_COO_AGENT.id
      ? listAgents()
          .then((a) => renderRoster(a) || undefined)
          .catch((e) => {
            console.warn('[handleChat] roster falhou (fail-open):', e)
            return undefined
          })
      : Promise.resolve(undefined)

  
  
  
  
  const tzP: Promise<string> = getSetting('operator_timezone')
    .catch(() => null)
    .then((tz) => tzSegura(tz))
  const clockP: Promise<string | undefined> = tzP
    .then((tz) => blocoRelogio(new Date().toISOString(), tz))
    .catch(() => undefined)

  
  
  
  
  
  const materiaisP: Promise<string | undefined> = conversationP
    .then((c) => listAnexosDaConversa(c.id))
    .then((lista) => renderMateriaisConversa(lista) || undefined)
    .catch((e) => {
      console.warn('[handleChat] materiais da conversa falharam (fail-open):', e)
      return undefined
    })

  const [conv, memoryBlock, recallBlock, rosterBlock, clockBlock, materiaisBlock, historicoPrecarregado, tz] = await Promise.all([conversationP, stableP, recallP, rosterP, clockP, materiaisP, historicoP, tzP])
  const conversationId = conv.id
  const createdNew = conv.createdNew

  
  
  
  
  
  
  if (kickoff && !createdNew) {
    const jaTemHistorico = await listRecentMessages(conversationId, 1).then((m) => m.length > 0).catch(() => false)
    if (jaTemHistorico) return Response.json({ skipped: true }, { status: 200 })
  }

  
  
  
  
  
  if (!kickoff && turnoFactualSemGrounding(args.userText ?? '', recallBlock)) {
    console.warn(`[chat] turno factual SEM grounding (precisaRecall=true, recall vazio) — agent=${agentId}`)
  }

  
  
  const suffixContext = [recallBlock, clockBlock].filter(Boolean).join('\n\n') || undefined

  
  
  
  
  
  let anexos: AnexoDoTurno[] = []
  if (!kickoff && args.anexoIds && args.anexoIds.length > 0) {
    const r = await resolverAnexosDoTurno({
      anexoIds: args.anexoIds,
      conversationId,
      operatorId: operator.id,
      agentId,
    })
    if (!r.ok) {
      console.warn(`[handleChat] anexo recusado (${r.motivo}) — turno abortado, agent=${agentId}`)
      return streamDeMensagemFixa({
        conversationId,
        texto: ANEXO_RECUSADO_MESSAGE[r.motivo],
        textId: 'jarvis-anexo',
        emitConversationId: createdNew,
      })
    }
    anexos = r.anexos
  }

  
  
  
  if (!kickoff && args.userText && createdNew) {
    void gerarTituloThread(conversationId, args.userText).catch(() => {})
  }

  const capturarPosTurno = montarGanchoPosTurno({
    agentId,
    kickoff: !!kickoff,
    slotAtivo,
    recemRoteado,
    userText: args.userText ?? '',
    operatorId: operator.id,
    conversationId,
  })

  
  
  const progressoFinal = onboardingProgress
    ? async (): Promise<OnboardingProgress | null> => {
        try {
          const s = await getOnboardingSession(operator.id)
          if (!s) return null
          const { cobertos, total } = progressoNucleo(s)
          if (!total) return null
          return { fase: s.fase, cobertos, total }
        } catch {
          return null
        }
      }
    : undefined

  return runChatTurn({
    conversationId,
    userText: args.userText,
    agent,
    aoFimDoTurno: capturarPosTurno,
    progressoFinal,
    emitConversationId: createdNew,
    interviewDirective: directive,
    onboardingProgress,
    kickoff,
    
    
    kickoffPrompt: kickoffPromptDoAgente(agentId),
    memoryBlock,
    materiaisBlock,
    anexos,
    rosterBlock,
    suffixContext,
    operatorId: operator.id,
    papel: membro.papel,
    costAgentId: agentId,
    costModel: agentRow?.model ?? undefined,
    maxSteps: passosDoAgente(agentRow?.tools, membro.papel, 'chat', agentRow?.budget),
    handoffBlock: args.handoff,
    porVoz: args.porVoz === true,
    
    
    historicoPrecarregado,
    
    
    tz,
  })
}
