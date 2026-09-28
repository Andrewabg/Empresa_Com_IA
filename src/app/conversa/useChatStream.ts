'use client'



import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CITATIONS_DATA_TYPE, CONVERSATION_DATA_TYPE, ARTIFACT_DATA_TYPE, MEMORY_DRAFT_DATA_TYPE, TRANSFER_DATA_TYPE, PAINEL_DATA_TYPE, ESTUDIO_DATA_TYPE, JURIDICO_DATA_TYPE, ONBOARDING_DATA_TYPE, FERRAMENTA_DATA_TYPE, MENSAGEM_DATA_TYPE, INVESTIGACAO_DATA_TYPE, type MemoryDraft, type TransferData, type PainelBlocoPatch, type EstudioPatch, type JuridicoPatch, type OnboardingProgress, type FerramentaEmCurso, type InvestigacaoResumo } from '@/server/agent/wireTypes'
import { investigacaoDoPayload } from '@/lib/trafego/graph/comoCheguei'
import { associateArtifacts } from '@/lib/artifactThread'
import { marcadorDeAnexo } from '@/lib/conversa/materiais'
import type { AnexoNaMensagem } from '@/lib/conversa/anexo'
import type { NotaCitada } from '@/server/tools/buscarCerebro'



import type { ArtifactRow } from '@/data/artifacts'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  
  created_at?: string
  
  citations?: NotaCitada[]
  
  draft?: MemoryDraft
  
  investigacao?: InvestigacaoResumo
  
  anexos?: AnexoNaMensagem[]
}

export type ChatStatus = 'idle' | 'streaming' | 'error'

interface UseChatStreamArgs {
  
  initialMessages: ChatMessage[]
  
  initialConversationId: string | null
  
  nasceFresh?: boolean
  
  onNeedsConfig: () => void
  
  onConversationId?: (id: string) => void
  
  initialArtifacts?: ArtifactRow[]
  
  agentId: string
  
  handoff?: string | null
  
  onTransfer?: (t: { agentId: string; resumo?: string }) => void
  
  onPainel?: (patch: PainelBlocoPatch) => void
  
  onEstudio?: (patch: EstudioPatch) => void
  
  onJuridico?: (patch: JuridicoPatch) => void
  
  onOnboarding?: (progress: OnboardingProgress) => void
  
  onFerramenta?: (f: FerramentaEmCurso) => void
  
  onMensagemPersistida?: (m: { id: string }) => void
}


export interface ChatSendMeta {
  
  focoContratoId?: string
  
  porVoz?: boolean
  
  anexos?: AnexoNaMensagem[]
}

interface UseChatStreamResult {
  messages: ChatMessage[]
  status: ChatStatus
  
  artifactsChrono: ArtifactRow[]
  
  artifactsForMessage: (messageId: string) => ArtifactRow[]
  
  orphanArtifacts: ArtifactRow[]
  
  streamingId: string | null
  
  error: string | null
  
  onboardingProgress: OnboardingProgress | null
  
  send: (userText: string, meta?: ChatSendMeta) => boolean
  
  kickoff: (opts?: { porVoz?: boolean }) => boolean
  
  startFresh: () => void
}


function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const CALM_ERROR =
  'Não consegui responder agora — pode ter sido uma instabilidade do modelo. ' +
  'Seu texto continua aqui; tente enviar de novo em instantes.'

export function useChatStream({
  initialMessages,
  initialConversationId,
  nasceFresh = false,
  onNeedsConfig,
  onConversationId,
  initialArtifacts = [],
  agentId,
  handoff,
  onTransfer,
  onPainel,
  onEstudio,
  onJuridico,
  onOnboarding,
  onFerramenta,
  onMensagemPersistida,
}: UseChatStreamArgs): UseChatStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null)
  
  
  
  
  const [artifacts, setArtifacts] = useState<ArtifactRow[]>(initialArtifacts)
  
  
  
  const [artifactMsgId, setArtifactMsgId] = useState<Record<string, string | null>>(() =>
    associateArtifacts(initialMessages, initialArtifacts),
  )

  
  
  const conversationIdRef = useRef<string | null>(initialConversationId)
  
  
  
  
  
  
  const freshRef = useRef(nasceFresh === true)
  
  const inFlightRef = useRef(false)
  
  const abortRef = useRef<AbortController | null>(null)
  
  const finishedRef = useRef(false)
  
  
  const handoffRef = useRef<string | null | undefined>(handoff)

  
  useEffect(() => () => { abortRef.current?.abort() }, [])

  
  
  const run = useCallback(
    (opts: { userText?: string; kickoff?: boolean; meta?: ChatSendMeta; porVoz?: boolean }) => {
      const kickoff = opts.kickoff === true
      const text = (opts.userText ?? '').trim()
      const anexos = opts.meta?.anexos ?? []
      const anexoIds = anexos.map((a) => a.id)
      
      
      
      
      
      
      if ((!kickoff && !text && anexoIds.length === 0) || inFlightRef.current) return false
      inFlightRef.current = true
      
      finishedRef.current = false
      
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      
      
      const handoffOnce = handoffRef.current ?? undefined
      handoffRef.current = null

      
      
      
      
      const userMsg: ChatMessage | null = kickoff
        ? null
        : {
            id: makeId('u'),
            role: 'user',
            content: text || marcadorDeAnexo(anexos.map((a) => a.title)),
            ...(anexos.length ? { anexos } : {}),
          }
      const assistantId = makeId('a')
      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '' }

      
      setMessages((prev) => (userMsg ? [...prev, userMsg, assistantMsg] : [...prev, assistantMsg]))
      setStatus('streaming')
      setStreamingId(assistantId)
      setError(null)

      
      const appendDelta = (delta: string) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
        )
      }
      const setCitations = (notes: NotaCitada[]) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, citations: [...(m.citations ?? []), ...notes] }
              : m,
          ),
        )
      }
      const setMemoryDraft = (draft: MemoryDraft) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, draft } : m)),
        )
      }
      
      
      const setInvestigacao = (investigacao: InvestigacaoResumo) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, investigacao } : m)),
        )
      }

      const finish = (errored: boolean) => {
        
        if (finishedRef.current) return
        finishedRef.current = true
        inFlightRef.current = false
        setStreamingId(null)
        setStatus(errored ? 'error' : 'idle')
        if (errored) setError(CALM_ERROR)
      }
      ;(async () => {
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              kickoff
                ? {
                    kickoff: true,
                    conversationId: conversationIdRef.current ?? undefined,
                    agentId,
                    ...(handoffOnce ? { handoff: handoffOnce } : {}),
                    
                    
                    ...(opts.porVoz ? { porVoz: true } : {}),
                  }
                : {
                    userText: text,
                    conversationId: conversationIdRef.current ?? undefined,
                    agentId,
                    ...(handoffOnce ? { handoff: handoffOnce } : {}),
                    ...(freshRef.current ? { fresh: true } : {}),
                    ...(opts.meta?.focoContratoId ? { focoContratoId: opts.meta.focoContratoId } : {}),
                    ...(opts.meta?.porVoz ? { porVoz: true } : {}),
                    ...(anexoIds.length ? { anexoIds } : {}),
                  },
            ),
            signal: controller.signal,
          })

          
          const contentType = res.headers.get('content-type') ?? ''
          if (contentType.includes('application/json')) {
            const json = (await res.json().catch(() => null)) as
              | { needsConfig?: boolean; skipped?: boolean }
              | null
            if (json?.needsConfig) {
              
              
              setMessages((prev) =>
                prev.filter((m) => m.id !== assistantId && m.id !== userMsg?.id),
              )
              finishedRef.current = true
              inFlightRef.current = false
              setStreamingId(null)
              setStatus('idle')
              onNeedsConfig()
              return
            }
            if (json?.skipped) {
              
              
              setMessages((prev) => prev.filter((m) => m.id !== assistantId))
              finishedRef.current = true
              inFlightRef.current = false
              setStreamingId(null)
              setStatus('idle')
              return
            }
            
            finish(true)
            return
          }

          if (!res.ok || !res.body) {
            finish(true)
            return
          }

          await consumeSse(res.body, {
            onTextDelta: appendDelta,
            onCitations: setCitations,
            onMemoryDraft: setMemoryDraft,
            onInvestigacao: setInvestigacao,
            
            
            onArtifact: (artifact) => {
              setArtifacts((prev) => [artifact, ...prev])
              setArtifactMsgId((prev) => ({ ...prev, [artifact.id]: assistantId }))
            },
            onConversationId: (id) => {
              
              
              
              const wasEmpty = !conversationIdRef.current
              conversationIdRef.current = id
              freshRef.current = false 
              
              
              
              if (wasEmpty) onConversationId?.(id)
            },
            onTransfer,
            onPainel,
            onEstudio,
            onJuridico,
            onOnboarding: (progress) => {
              setOnboardingProgress(progress)
              onOnboarding?.(progress)
            },
            onFerramenta,
            onMensagemPersistida,
            onError: () => {
              
              
              finish(true)
            },
          })

          
          if (inFlightRef.current) finish(false)
        } catch (e) {
          
          
          if (e instanceof DOMException && e.name === 'AbortError') {
            finishedRef.current = true
            inFlightRef.current = false
            setStreamingId(null)
            setStatus('idle')
            return
          }
          
          finish(true)
        }
      })()
      return true
    },
    [onNeedsConfig, onConversationId, agentId, onTransfer, onPainel, onEstudio, onJuridico, onOnboarding, onFerramenta, onMensagemPersistida],
  )

  
  const send = useCallback((userText: string, meta?: ChatSendMeta) => run({ userText, meta }), [run])
  const kickoff = useCallback((o?: { porVoz?: boolean }) => run({ kickoff: true, porVoz: o?.porVoz === true }), [run])

  const startFresh = useCallback(() => {
    
    
    abortRef.current?.abort()
    inFlightRef.current = false
    finishedRef.current = false
    conversationIdRef.current = null
    freshRef.current = true
    setMessages([])
    setArtifacts([])
    setArtifactMsgId({})
    setStreamingId(null)
    setError(null)
    setStatus('idle')
  }, [])

  
  
  const artifactsChrono = useMemo(() => [...artifacts].reverse(), [artifacts])
  
  const byMessage = useMemo(() => {
    const map = new Map<string, ArtifactRow[]>()
    for (const a of artifactsChrono) {
      const mid = artifactMsgId[a.id] ?? null
      if (mid === null) continue
      const arr = map.get(mid) ?? []
      arr.push(a)
      map.set(mid, arr)
    }
    return map
  }, [artifactsChrono, artifactMsgId])
  const orphanArtifacts = useMemo(
    () => artifactsChrono.filter((a) => (artifactMsgId[a.id] ?? null) === null),
    [artifactsChrono, artifactMsgId],
  )
  const artifactsForMessage = useCallback(
    (messageId: string): ArtifactRow[] => byMessage.get(messageId) ?? [],
    [byMessage],
  )

  return {
    messages,
    status,
    artifactsChrono,
    artifactsForMessage,
    orphanArtifacts,
    streamingId,
    error,
    onboardingProgress,
    send,
    kickoff,
    startFresh,
  }
}



interface SseHandlers {
  onTextDelta: (delta: string) => void
  onCitations: (notes: NotaCitada[]) => void
  onMemoryDraft: (draft: MemoryDraft) => void
  onInvestigacao: (resumo: InvestigacaoResumo) => void
  onArtifact: (artifact: ArtifactRow) => void
  onConversationId: (id: string) => void
  onTransfer?: (t: { agentId: string; resumo?: string }) => void
  onPainel?: (patch: PainelBlocoPatch) => void
  onEstudio?: (patch: EstudioPatch) => void
  onJuridico?: (patch: JuridicoPatch) => void
  onOnboarding?: (progress: OnboardingProgress) => void
  onFerramenta?: (f: FerramentaEmCurso) => void
  onMensagemPersistida?: (m: { id: string }) => void
  onError: (errorText: string) => void
}


export async function readSseParts(
  body: ReadableStream<Uint8Array>,
  onPart: (part: Record<string, unknown>) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const dispatch = (payload: string) => {
    if (!payload || payload === '[DONE]') return
    let part: Record<string, unknown>
    try {
      part = JSON.parse(payload) as Record<string, unknown>
    } catch {
      return 
    }
    onPart(part)
  }

  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      
      let nlIdx: number
      while ((nlIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nlIdx).trim()
        buffer = buffer.slice(nlIdx + 1)
        if (!line.startsWith('data:')) continue
        dispatch(line.slice('data:'.length).trim())
      }
    }
    
    const last = buffer.trim()
    if (last.startsWith('data:')) {
      dispatch(last.slice('data:'.length).trim())
    }
  } finally {
    reader.releaseLock()
  }
}


async function consumeSse(body: ReadableStream<Uint8Array>, handlers: SseHandlers): Promise<void> {
  await readSseParts(body, (part) => dispatchPart(part, handlers))
}

function dispatchPart(part: Record<string, unknown>, handlers: SseHandlers): void {
  const type = part.type as string | undefined
  if (type === 'text-delta') {
    const delta = part.delta
    if (typeof delta === 'string' && delta) handlers.onTextDelta(delta)
  } else if (type === CITATIONS_DATA_TYPE) {
    const notes = (part.data as { notes?: NotaCitada[] } | undefined)?.notes
    if (Array.isArray(notes) && notes.length) handlers.onCitations(notes)
  } else if (type === CONVERSATION_DATA_TYPE) {
    const id = (part.data as { id?: string } | undefined)?.id
    if (typeof id === 'string' && id) handlers.onConversationId(id)
  } else if (type === ARTIFACT_DATA_TYPE) {
    const artifact = (part.data as { artifact?: unknown } | undefined)?.artifact
    if (artifact) handlers.onArtifact(artifact as ArtifactRow)
  } else if (type === INVESTIGACAO_DATA_TYPE) {
    
    
    const resumo = investigacaoDoPayload((part.data as { investigacao?: unknown } | undefined)?.investigacao)
    if (resumo) handlers.onInvestigacao(resumo)
  } else if (type === MEMORY_DRAFT_DATA_TYPE) {
    const draft = (part.data as { draft?: MemoryDraft } | undefined)?.draft
    if (draft) handlers.onMemoryDraft(draft)
  } else if (type === TRANSFER_DATA_TYPE) {
    const d = part.data as TransferData | undefined
    if (d?.agentId) handlers.onTransfer?.({ agentId: d.agentId, resumo: d.resumo })
  } else if (type === PAINEL_DATA_TYPE) {
    const patch = (part.data as { patch?: PainelBlocoPatch } | undefined)?.patch
    if (patch) handlers.onPainel?.(patch)
  } else if (type === ESTUDIO_DATA_TYPE) {
    const patch = (part.data as { patch?: EstudioPatch } | undefined)?.patch
    if (patch) handlers.onEstudio?.(patch)
  } else if (type === JURIDICO_DATA_TYPE) {
    const patch = (part.data as { patch?: JuridicoPatch } | undefined)?.patch
    if (patch) handlers.onJuridico?.(patch)
  } else if (type === ONBOARDING_DATA_TYPE) {
    const progress = part.data as OnboardingProgress | undefined
    if (progress && typeof progress.fase === 'string' && typeof progress.cobertos === 'number' && typeof progress.total === 'number') {
      handlers.onOnboarding?.(progress)
    }
  } else if (type === FERRAMENTA_DATA_TYPE) {
    
    
    const dado = part.data as { tool?: string; detalhe?: unknown; contador?: unknown } | undefined
    const texto = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
    if (typeof dado?.tool === 'string' && dado.tool) {
      handlers.onFerramenta?.({ tool: dado.tool, detalhe: texto(dado.detalhe), contador: texto(dado.contador) })
    }
  } else if (type === MENSAGEM_DATA_TYPE) {
    const id = (part.data as { id?: string } | undefined)?.id
    if (typeof id === 'string' && id) handlers.onMensagemPersistida?.({ id })
  } else if (type === 'error') {
    const errorText = typeof part.errorText === 'string' ? part.errorText : 'stream error'
    handlers.onError(errorText)
  }
}
