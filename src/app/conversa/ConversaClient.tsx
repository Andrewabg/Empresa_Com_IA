'use client'



import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { useWave } from '@/components/wave/useWave'
import { VoiceOrb, type OrbState } from '@/components/orb/VoiceOrbLazy'
import { useStreamLevel } from '@/components/orb/useStreamLevel'
import { CitationsDisclosure } from '@/components/cards/CitationsDisclosure'
import { ComoChegueiCard } from '@/components/cards/ComoChegueiCard'
import { MemoryDraftCard } from '@/components/cards/MemoryDraftCard'
import { Markdown } from '@/components/markdown/Markdown'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { useChatStream, type ChatMessage } from './useChatStream'
import { AnexoBandeja, formatarBytes, type AnexoStaged } from './AnexoBandeja'
import { validarAnexo, type AnexoNaMensagem } from '@/lib/conversa/anexo'
import { proximaOrdem } from '@/lib/conversa/ordem'
import { arrasteTemArquivo, aoEntrar, aoSair, estaAceso } from '@/lib/conversa/arrasto'
import { ONBOARDING_CHIPS } from '@/lib/onboarding/chips'
import { useSignedUrl } from './useSignedUrl'
import { ArtifactCard } from './ArtifactCard'
import { ArtifactLightbox } from './ArtifactLightbox'
import { useRealtimeVoice } from './useRealtimeVoice'
import type { NotaCitada } from '@/server/tools/buscarCerebro'
import type { MemoryDraft, OnboardingProgress } from '@/server/agent/wireTypes'
import type { ArtifactRow } from '@/data/artifacts'
import { canStartTalk } from './voiceProtocol'
import { deveTentarConectar } from '@/lib/voz/tentarDeNovo'
import { MSG_SEM_VOZ_NA_SALA, MSG_COMPOSITOR_SEM_VOZ } from '@/lib/voicePalette'
import { StyleDrawer } from '@/components/style/StyleDrawer'
import { RoomSwitcher } from './RoomSwitcher'
import { HistoryDrawer } from './HistoryDrawer'
import { ControlesDaSala } from '@/components/conversa/ControlesDaSala'
import { rotuloDoTrabalho } from '@/lib/conversa/trabalhoEmCurso'
import { CHAVE_STORAGE, LARGURA_MAX_FRACAO, larguraAoArrastar, larguraInicial } from '@/lib/conversa/larguraDoChat'
import { salaMarkKey, SALA_MARK_NOVA } from '@/lib/conversas/salaHref'
import type { CrewMember } from '@/data/crew'
import type { Conversation } from '@/data/messages'


const TETO_AQUECIMENTO_MS = 8_000

interface ConversaClientProps {
  initialMessages: ChatMessage[]
  initialConversationId: string | null
  
  nasceFresh?: boolean
  
  initialArtifacts?: ArtifactRow[]
  
  interview: { autoOpen: boolean; minDone: boolean; fase?: string | null }
  
  converterDisponivel?: boolean
  
  agentId: string
  agentName: string
  
  vozDesligada?: boolean
  
  handoff?: string | null
  
  crew?: CrewMember[]
  
  initialThreads?: Conversation[]
  
  agenteDeFerias?: string | null
}


function makeLocalId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function ConversaClient({ initialMessages, initialConversationId, nasceFresh = false, initialArtifacts, interview, converterDisponivel = false, agentId, agentName, vozDesligada = false, handoff, crew = [], initialThreads = [], agenteDeFerias = null }: ConversaClientProps) {
  const reducedMotion = useReducedMotion() ?? false
  const router = useRouter()

  const wave = useWave()
  const { setListening, setThinking } = wave

  
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine)
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const onNeedsConfig = useCallback(() => {
    router.push('/config')
  }, [router])

  
  
  
  
  const [conversationId, setConversationId] = useState(initialConversationId)

  
  const [historyOpen, setHistoryOpen] = useState(false)

  
  
  
  const [larguraChat, setLarguraChat] = useState<number | null>(null)
  const painelChatRef = useRef<HTMLDivElement | null>(null)
  
  
  
  const larguraChatRef = useRef<number | null>(null)
  const arrastoLarguraRef = useRef<{ x0: number; w0: number } | null>(null)
  
  
  const espacoDoSplit = useCallback(
    () => painelChatRef.current?.parentElement?.getBoundingClientRect().width ?? window.innerWidth,
    [],
  )
  const aplicarLargura = useCallback((w: number | null) => {
    larguraChatRef.current = w
    setLarguraChat(w)
  }, [])
  
  
  
  
  useLayoutEffect(() => {
    let salva: string | null = null
    try { salva = localStorage.getItem(CHAVE_STORAGE) } catch {  }
    if (salva != null) aplicarLargura(larguraInicial(salva, espacoDoSplit()))
  }, [aplicarLargura, espacoDoSplit])
  const onAlcaPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const w0 = painelChatRef.current?.getBoundingClientRect().width ?? 0
    arrastoLarguraRef.current = { x0: e.clientX, w0 }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [])
  const onAlcaPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastoLarguraRef.current
    if (!a) return
    aplicarLargura(larguraAoArrastar(a.w0, e.clientX - a.x0, espacoDoSplit()))
  }, [aplicarLargura, espacoDoSplit])
  const onAlcaPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastoLarguraRef.current) return
    arrastoLarguraRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {  }
    const w = larguraChatRef.current
    try { if (w != null) localStorage.setItem(CHAVE_STORAGE, String(w)) } catch {  }
  }, [])
  
  const onAlcaDoubleClick = useCallback(() => {
    aplicarLargura(null)
    try { localStorage.removeItem(CHAVE_STORAGE) } catch {  }
  }, [aplicarLargura])

  
  
  
  const onConversationIdLifted = useCallback((id: string) => {
    setConversationId(id)
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `/conversa?agent=${agentId}&c=${id}`)
  }, [agentId])

  
  
  
  
  useEffect(() => {
    if (typeof window === 'undefined' || !conversationId) return
    try { sessionStorage.setItem(salaMarkKey(agentId), conversationId) } catch {  }
  }, [conversationId, agentId])

  const onTransfer = useCallback(
    (t: { agentId: string; resumo?: string }) => {
      const q = new URLSearchParams({ agent: t.agentId })
      if (t.resumo) q.set('handoff', t.resumo)
      router.push(`/conversa?${q.toString()}`)
    },
    [router],
  )

  
  
  const initialOnboardingPhase = interview.fase ?? (interview.autoOpen ? 'abertura' : null)
  const [onboardingFase, setOnboardingFase] = useState<string | null>(initialOnboardingPhase)

  
  
  
  
  const vozRef = useRef<ReturnType<typeof useRealtimeVoice> | null>(null)

  
  
  
  const [trabalho, setTrabalho] = useState<string | null>(null)
  
  
  const [contadorDoTrabalho, setContadorDoTrabalho] = useState<string | null>(null)

  const { messages, status, artifactsChrono, artifactsForMessage, orphanArtifacts, streamingId, error, onboardingProgress, send, kickoff, startFresh } = useChatStream({
    initialMessages,
    initialConversationId,
    nasceFresh,
    onNeedsConfig,
    onConversationId: onConversationIdLifted,
    initialArtifacts,
    agentId,
    handoff,
    onTransfer,
    onOnboarding: (progress: OnboardingProgress) => {
      setOnboardingFase(progress.fase)
    },
    
    
    
    
    onFerramenta: (f) => {
      vozRef.current?.aoUsarFerramenta(f)
      setTrabalho(f.detalhe ?? rotuloDoTrabalho(f.tool))
      setContadorDoTrabalho(f.contador ?? null)
    },
    
    onMensagemPersistida: (m) => { vozRef.current?.aoPersistirMensagem(m.id) },
  })

  
  
  const [lightboxId, setLightboxId] = useState<string | null>(null)
  
  
  
  const [anexoAbertoId, setAnexoAbertoId] = useState<string | null>(null)
  
  const [styleOpen, setStyleOpen] = useState(false)

  const [talking, setTalking] = useState(false)
  const [draft, setDraft] = useState('')
  

  
  const [blockedHint, setBlockedHint] = useState<string | null>(null)
  const blockedHintTimerRef = useRef<number | null>(null)
  const showBlockedHint = useCallback((msg: string) => {
    setBlockedHint(msg)
    if (blockedHintTimerRef.current) window.clearTimeout(blockedHintTimerRef.current)
    blockedHintTimerRef.current = window.setTimeout(() => {
      setBlockedHint(null)
      blockedHintTimerRef.current = null
    }, 2000)
  }, [])
  useEffect(() => () => {
    if (blockedHintTimerRef.current) window.clearTimeout(blockedHintTimerRef.current)
  }, [])

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const inputFocusedRef = useRef(false)
  const talkingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputId = useId()

  
  
  
  
  const openerFiredRef = useRef(false)

  
  
  
  
  const voice = useRealtimeVoice({
    conversationId,
    agentId,
    enviarTexto: send,
    textoEmCurso: messages.find((m) => m.id === streamingId)?.content ?? '',
    turnoAtivo: status === 'streaming',
    onConversationId: onConversationIdLifted,
    onNeedsConfig,
  })


  
  

  
  
  
  const onNovaConversa = useCallback(() => {
    startFresh()
    setConversationId(null)
    setHistoryOpen(false)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/conversa?agent=${agentId}`)
      
      
      try { sessionStorage.setItem(salaMarkKey(agentId), SALA_MARK_NOVA) } catch {  }
    }
  }, [startFresh, agentId])

  
  
  const onSelectThread = useCallback((id: string) => {
    setHistoryOpen(false)
    router.push(`/conversa?agent=${agentId}&c=${id}`)
  }, [router, agentId])

  
  
  vozRef.current = voice

  const voiceStatus = voice.state.status
  const voiceDown =
    vozDesligada ||
    offline ||
    voiceStatus === 'budgetExceeded' ||
    voiceStatus === 'needsConfig' ||
    voiceStatus === 'error'
  
  
  
  const voiceReady = voiceStatus === 'connected'
  
  
  
  
  const voiceConnecting = voiceStatus === 'connecting'

  
  
  
  
  
  
  
  
  
  
  const connect = voice.connect
  useEffect(() => {
    if (offline) return
    if (vozDesligada) return 
    
    
    
    if (!interview.autoOpen) return
    void connect()
    
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, interview.autoOpen])

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const [aquecimentoExpirou, setAquecimentoExpirou] = useState(false)
  useEffect(() => {
    if (!interview.autoOpen || openerFiredRef.current) return
    const t = window.setTimeout(() => setAquecimentoExpirou(true), TETO_AQUECIMENTO_MS)
    return () => window.clearTimeout(t)
  }, [interview.autoOpen])

  const falarProximaResposta = voice.falarProximaResposta
  
  
  
  const voiceCantOpen =
    voiceDown || voiceStatus === 'micDenied' || voiceStatus === 'micSemResposta' || aquecimentoExpirou
  useEffect(() => {
    if (!interview.autoOpen || openerFiredRef.current) return
    if (voiceReady) {
      
      
      
      
      openerFiredRef.current = true
      falarProximaResposta()
      
      
      kickoff({ porVoz: true })
    } else if (voiceCantOpen) {
      
      
      openerFiredRef.current = true
      kickoff()
    }
    
  }, [interview.autoOpen, voiceReady, voiceCantOpen, kickoff, falarProximaResposta])

  
  useEffect(() => {
    setThinking(status === 'streaming')
    
    if (status !== 'streaming') { setTrabalho(null); setContadorDoTrabalho(null) }
  }, [status, setThinking])

  
  
  
  
  const localLevel = useStreamLevel(voice.localStream, { onLevel: setListening })
  const remoteLevel = useStreamLevel(voice.remoteStream)

  
  
  
  const pttPhase = voice.state.ptt
  useEffect(() => {
    if (pttPhase === 'committing') setThinking(true)
    else if (pttPhase === 'idle') setThinking(false)
  }, [pttPhase, setThinking])

  
  
  
  
  
  
  const vozAtiva = useMemo(
    () => ({ press: voice.press, release: voice.release, falando: pttPhase === 'speaking', estado: voiceStatus, transcrevendo: false }),
    [voice.press, voice.release, pttPhase, voiceStatus],
  )

  const startTalk = useCallback(() => {
    if (vozDesligada) return 
    if (voiceDown) return 
    
    
    if (!voiceReady) {
      if (deveTentarConectar(voiceStatus)) void voice.connect()
      return
    }
    
    
    if (!canStartTalk(pttPhase)) {
      showBlockedHint(
        pttPhase === 'searching'
          ? 'Estou consultando o cérebro — pode aguardar'
          : 'Estou pensando — pode aguardar',
      )
      return
    }
    if (talkingRef.current) return
    talkingRef.current = true
    setTalking(true)
    setThinking(false)
    vozAtiva.press()
  }, [setThinking, vozDesligada, vozAtiva, voiceDown, voiceReady, voiceStatus, voice, pttPhase, showBlockedHint])

  const stopTalk = useCallback(() => {
    if (!talkingRef.current) return
    talkingRef.current = false
    setTalking(false)
    vozAtiva.release()
    setListening(0)
  }, [setListening, vozAtiva])

  
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      if (inputFocusedRef.current) return
      if (e.repeat) return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return
      }
      
      
      
      
      if (typeof target?.closest === 'function' && target.closest('[data-no-pushtotalk]')) {
        return
      }
      e.preventDefault()
      startTalk()
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      if (inputFocusedRef.current) return
      if (!talkingRef.current) return
      e.preventDefault()
      stopTalk()
    }
    function onBlur() {
      
      if (talkingRef.current) stopTalk()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [startTalk, stopTalk])

  
  
  
  
  
  
  
  
  useEffect(() => {
    const bloquear = (e: DragEvent) => {
      if (!Array.from(e.dataTransfer?.types ?? []).includes('Files')) return
      e.preventDefault()
    }
    window.addEventListener('dragover', bloquear)
    window.addEventListener('drop', bloquear)
    return () => {
      window.removeEventListener('dragover', bloquear)
      window.removeEventListener('drop', bloquear)
    }
  }, [])

  
  
  
  
  const allMessages = useMemo<ChatMessage[]>(() => messages, [messages])

  
  
  
  const anexosDoThread = useMemo<ArtifactRow[]>(
    () =>
      allMessages.flatMap((m) =>
        (m.anexos ?? [])
          .filter((a) => a.kind === 'imagem')
          .map((a) => linhaDeAnexoParaLightbox(a, m.created_at)),
      ),
    [allMessages],
  )

  
  
  const lastContent = allMessages.length ? allMessages[allMessages.length - 1].content : ''
  const didInitialScrollRef = useRef(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    
    
    const instant = !didInitialScrollRef.current || reducedMotion
    
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'auto' : 'smooth' })
    })
    if (allMessages.length > 0) didInitialScrollRef.current = true
    return () => cancelAnimationFrame(raf)
  }, [allMessages.length, lastContent, reducedMotion])

  
  
  
  
  const [anexos, setAnexos] = useState<AnexoStaged[]>([])
  const [anexoAviso, setAnexoAviso] = useState<string | null>(null)
  const [armado, setArmado] = useState(false)

  const streaming = status === 'streaming'
  const anexosProntos = useMemo(
    () => anexos.filter((a) => a.estado === 'pronto' && a.artifactId),
    [anexos],
  )
  const anexoSubindo = anexos.some((a) => a.estado === 'subindo')

  
  
  
  const subirAnexo = useCallback(
    (key: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      form.append('agentId', agentId)
      if (conversationId) form.append('conversationId', conversationId)
      fetch('/api/conversa/anexos', { method: 'POST', body: form })
        .then(async (res) => {
          const corpo = (await res.json().catch(() => null)) as
            | { id?: string; title?: string; bytes?: number; error?: string }
            | null
          if (!res.ok || !corpo?.id) {
            throw new Error(corpo?.error ?? 'Não consegui subir esse arquivo agora.')
          }
          return corpo
        })
        .then((corpo) => {
          setAnexos((prev) =>
            prev.map((a) =>
              a.key === key
                ? {
                    ...a,
                    estado: 'pronto',
                    artifactId: corpo.id,
                    nome: corpo.title ?? a.nome,
                    bytes: corpo.bytes ?? a.bytes,
                  }
                : a,
            ),
          )
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Não consegui subir esse arquivo agora.'
          setAnexos((prev) =>
            prev.map((a) => (a.key === key ? { ...a, estado: 'erro', erro: msg } : a)),
          )
          
          
          
          setAnexoAviso(msg)
          setArmado(false)
        })
    },
    [agentId, conversationId],
  )

  
  
  const onArquivos = useCallback(
    (lista: File[]) => {
      if (lista.length === 0) return
      let jaAnexados = anexos.length
      const novos: AnexoStaged[] = []
      let recusa: string | null = null
      for (const file of lista) {
        const r = validarAnexo({ name: file.name, mime: file.type, size: file.size }, { jaAnexados })
        if (!r.ok) {
          
          
          recusa = recusa ?? r.copy
          continue
        }
        jaAnexados += 1
        novos.push({
          key: makeLocalId('anexo'),
          file,
          nome: r.nome,
          kind: r.kind,
          bytes: file.size,
          estado: 'subindo',
        })
      }
      setAnexoAviso(recusa)
      if (novos.length === 0) return
      setAnexos((prev) => [...prev, ...novos])
      for (const n of novos) subirAnexo(n.key, n.file)
    },
    [anexos.length, subirAnexo],
  )

  
  const { arrastando, zona } = useZonaDeArrasto(onArquivos)

  
  
  
  
  const onRemoverAnexo = useCallback((key: string) => {
    setAnexos((prev) => prev.filter((a) => a.key !== key))
    setAnexoAviso(null)
    setArmado(false)
  }, [])

  const onTentarDeNovoAnexo = useCallback(
    (key: string) => {
      const alvo = anexos.find((a) => a.key === key)
      if (!alvo) return
      setAnexos((prev) =>
        prev.map((a) => (a.key === key ? { ...a, estado: 'subindo', erro: undefined } : a)),
      )
      subirAnexo(key, alvo.file)
    },
    [anexos, subirAnexo],
  )

  
  
  const enviarAgora = useCallback(() => {
    const text = draft.trim()
    
    
    
    const anexosDaMensagem: AnexoNaMensagem[] = anexosProntos.map((a) => ({
      id: a.artifactId as string,
      kind: a.kind,
      title: a.nome,
      bytes: a.bytes,
    }))
    if (!text && anexosDaMensagem.length === 0) return
    const saiu = send(text, anexosDaMensagem.length ? { anexos: anexosDaMensagem } : undefined)
    
    
    
    if (!saiu) {
      setAnexoAviso('Ainda estou terminando a resposta anterior — sua mensagem continua aqui, é só enviar de novo.')
      return
    }
    setDraft('')
    setAnexos([])
    setAnexoAviso(null)
  }, [draft, anexosProntos, send])

  
  
  
  const onSend = useCallback(() => {
    if (streaming) return
    if (anexoSubindo) {
      setArmado((v) => !v)
      return
    }
    enviarAgora()
  }, [streaming, anexoSubindo, enviarAgora])

  useEffect(() => {
    if (!armado || anexoSubindo) return
    setArmado(false)
    enviarAgora()
  }, [armado, anexoSubindo, enviarAgora])

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSend()
      }
    },
    [onSend],
  )

  
  
  const orbState: OrbState = voiceDown
    ? 'idle'
    : voiceConnecting
      ? 'thinking'
      : pttPhase === 'searching'
        ? 'searching'
        : (wave.state as OrbState)
  
  
  
  
  
  const orbAmplitude = Math.max(localLevel, remoteLevel, 0)

  
  
  
  
  
  const micHint =
    
    
    
    voice.state.audioBloqueado
      ? 'Sua resposta saiu escrita, mas o navegador não deixou tocar o áudio. Clique uma vez na página e segure Espaço para eu falar de novo.'
      : vozAtiva.estado === 'micSemResposta'
      ? 'O navegador está esperando você liberar o microfone. Libere e segure Espaço de novo; o texto continua disponível.'
      : vozAtiva.estado === 'micDenied'
      ? 'Não consegui acessar o microfone. Libere o microfone no navegador e segure Espaço de novo; o texto continua disponível.'
      : vozAtiva.estado === 'budgetExceeded'
        ? 'Voz pausada — orçamento do mês atingido. O chat de texto segue normal.'
        : vozAtiva.estado === 'error'
          ? 'A voz teve um problema. Segure de novo pra tentar; o texto continua disponível.'
          : null 

  
  const isEmpty = allMessages.length === 0

  
  
  
  
  
  
  
  const semTurnoDoUsuario = useMemo(
    () => !allMessages.some((m) => m.role === 'user'),
    [allMessages],
  )

  
  
  
  
  
  const mostrarConverter =
    converterDisponivel && agentId === 'jarvis' && onboardingProgress?.fase !== 'entrevista'

  return (
    <div
      style={{
        
        
        
        
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {offline && <OfflineBanner label="Sem conexão — o chat reconecta sozinho; tente enviar de novo quando voltar." />}

      {}
      <audio ref={voice.audioRef} autoPlay playsInline aria-hidden style={{ display: 'none' }} />

      <div
        className="conversa-split"
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          position: 'relative', 
        }}
      >
        {}
        {crew.length > 0 && (
          <RoomSwitcher crew={crew} activeId={agentId} onAdjustStyle={() => setStyleOpen(true)} />
        )}

        {}
        <div
          style={{
            position: 'absolute',
            top: 16,
            
            
            
            right: larguraChat == null ? 'calc(min(440px, 40%) + 14px)' : `${larguraChat + 14}px`,
            zIndex: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ControlesDaSala
            onHistorico={() => setHistoryOpen(true)}
            onNova={onNovaConversa}
            flutuante
          />
        </div>

        {}
        <div
          style={{
            flex: '1.7 1 0%',
            minWidth: 0,
            minHeight: 'min(56vh, 420px)',
            display: 'flex',
          }}
        >
          <OrbStage
            state={orbState}
            amplitude={orbAmplitude}
            talking={talking}
            voiceDown={voiceDown}
            vozDesligada={vozDesligada}
            connecting={voiceConnecting}
            transcrevendo={vozAtiva.transcrevendo}
            trabalho={trabalho}
            contadorDoTrabalho={contadorDoTrabalho}
            micHint={blockedHint ?? micHint}
            reducedMotion={reducedMotion}
            agentName={agentName}
          />
        </div>

        {}
        <div
          className="conversa-chat"
          ref={painelChatRef}
          {...zona}
          style={{
            position: 'relative',
            zIndex: 2,
            
            
            width: larguraChat == null ? 'min(440px, 40%)' : `${larguraChat}px`,
            maxWidth: `${Math.round(LARGURA_MAX_FRACAO * 100)}%`,
            flexShrink: 0,
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--border-hairline)',
            background:
              'linear-gradient(to right, rgb(255 255 255 / 0.012), transparent)',
          }}
        >
          {}
          <div
            className="conversa-alca-largura"
            role="separator"
            aria-orientation="vertical"
            aria-label="Largura do chat"
            title="Arraste para ajustar a largura. Duplo clique volta ao padrão."
            onPointerDown={onAlcaPointerDown}
            onPointerMove={onAlcaPointerMove}
            onPointerUp={onAlcaPointerUp}
            onPointerCancel={onAlcaPointerUp}
            onDoubleClick={onAlcaDoubleClick}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: -5,
              width: 10,
              cursor: 'col-resize',
              zIndex: 3,
              touchAction: 'none',
            }}
          />
          {}
          {agentId === 'jarvis' && onboardingProgress && (onboardingProgress.fase === 'entrevista') && onboardingProgress.total > 0 && (
            <OnboardingProgressBar
              cobertos={onboardingProgress.cobertos}
              total={onboardingProgress.total}
              reducedMotion={reducedMotion}
            />
          )}

          {}
          {agenteDeFerias && (
            <p
              role="status"
              style={{
                flexShrink: 0,
                margin: '0 0 8px',
                fontSize: 12.5,
                lineHeight: 1.5,
                color: 'var(--text-tertiary)',
              }}
            >
              {agenteDeFerias} está de férias e não atende agora — quem abriu foi o {agentName}.
              {' '}Para trazer {agenteDeFerias} de volta, ligue-o em Agentes.
            </p>
          )}

          <SecondaryTranscript
            ref={scrollRef}
            messages={allMessages}
            streamingId={streamingId}
            isEmpty={isEmpty}
            error={error}
            reducedMotion={reducedMotion}
            agentName={agentName}
            artifactsForMessage={artifactsForMessage}
            orphanArtifacts={orphanArtifacts}
            onOpenArtifact={setLightboxId}
            onAbrirAnexo={setAnexoAbertoId}
            onboardingChips={
              agentId === 'jarvis' &&
              semTurnoDoUsuario &&
              !streaming &&
              (onboardingFase === 'abertura' || onboardingFase === 'roteamento')
                ? send
                : undefined
            }
          />

          {}
          {mostrarConverter && (
            <ConvertAffordance send={send} reducedMotion={reducedMotion} />
          )}

          <div
            style={{
              flexShrink: 0,
              padding: 'clamp(12px, 2vw, 18px) clamp(14px, 2.5vw, 20px) clamp(14px, 2.5vw, 20px)',
            }}
          >
            <Composer
              inputId={inputId}
              inputRef={inputRef}
              draft={draft}
              setDraft={setDraft}
              onInputKeyDown={onInputKeyDown}
              onFocus={() => {
                inputFocusedRef.current = true
              }}
              onBlur={() => {
                inputFocusedRef.current = false
              }}
              send={onSend}
              talking={talking}
              onStartTalk={startTalk}
              onStopTalk={stopTalk}
              voiceDown={voiceDown}
              vozDesligada={vozDesligada}
              waveState={wave.state}
              streaming={streaming}
              agentName={agentName}
              anexos={anexos}
              armado={armado}
              anexoAviso={anexoAviso}
              arrastando={arrastando}
              onArquivos={onArquivos}
              onRemoverAnexo={onRemoverAnexo}
              onTentarDeNovoAnexo={onTentarDeNovoAnexo}
              onDispensarAviso={() => setAnexoAviso(null)}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
      </div>

      {}
      <span aria-live="polite" aria-atomic="true" style={SR_ONLY}>
        {voiceConnecting
          ? 'Conectando a voz. Aguarde um instante para falar.'
          : talking
            ? 'Escutando você pelo microfone. Solte espaço para encerrar.'
            : pttPhase === 'searching'
              ? 'Consultando o cérebro. Só um instante.'
              : pttPhase === 'committing'
                ? 'Pensando. Só um instante.'
                : vozAtiva.estado === 'micDenied' || vozAtiva.estado === 'micSemResposta'
                  ? 'Microfone indisponível. O chat de texto continua funcionando.'
                  : vozAtiva.falando
                    ? `${agentName} está respondendo.`
                    : ''}
      </span>

      {}
      <ArtifactLightbox artifacts={artifactsChrono} openId={lightboxId} onOpenChange={setLightboxId} />

      {}
      <ArtifactLightbox artifacts={anexosDoThread} openId={anexoAbertoId} onOpenChange={setAnexoAbertoId} />

      {}
      <StyleDrawer open={styleOpen} onOpenChange={setStyleOpen} />

      {}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        agentId={agentId}
        activeConversationId={conversationId}
        initialThreads={initialThreads}
        onNova={onNovaConversa}
        onSelect={onSelectThread}
      />
    </div>
  )
}



function OrbStage({
  state,
  amplitude,
  talking,
  voiceDown,
  vozDesligada,
  connecting,
  transcrevendo,
  trabalho,
  contadorDoTrabalho,
  micHint,
  reducedMotion,
  agentName,
}: {
  state: OrbState
  amplitude: number
  talking: boolean
  voiceDown: boolean
  
  vozDesligada: boolean
  
  connecting: boolean
  
  transcrevendo: boolean
  
  trabalho: string | null
  
  contadorDoTrabalho: string | null
  micHint: string | null
  reducedMotion: boolean
  agentName: string
}) {
  
  
  
  
  
  
  
  
  
  const topLabel = connecting
    ? 'CONECTANDO A VOZ…'
    : talking
      ? 'OUVINDO…'
      : trabalho
      ? trabalho
      : vozDesligada
      ? 'SÓ POR TEXTO'
      : voiceDown
        ? 'VOZ INDISPONÍVEL'
        : state === 'searching'
          ? 'CONSULTANDO O CÉREBRO…'
          : state === 'thinking'
            ? 'PENSANDO…'
            : state === 'acting'
              ? 'AGINDO…'
              : agentName

  
  
  const contador = topLabel === trabalho ? contadorDoTrabalho : null

  const hint = vozDesligada
    ? MSG_SEM_VOZ_NA_SALA
    : voiceDown
    ? 'Fale por texto — a voz volta quando a conexão voltar'
    : transcrevendo
      ? 'Entendendo o que você falou'
      : connecting
      ? 'Preparando a voz — aguarde um instante para falar'
      : talking
        ? 'Solte para encerrar'
        : trabalho || state === 'searching' || state === 'thinking'
          ? 'Só um instante — já te respondo'
          : 'Segure Espaço para falar'

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(14px, 3vh, 28px)',
        padding: 'clamp(24px, 5vh, 56px) 16px clamp(8px, 2vh, 20px)',
        background:
          'radial-gradient(circle at 50% 44%, rgb(124 92 255 / 0.05), transparent 58%)',
      }}
    >
      <motion.span
        key={topLabel}
        initial={reducedMotion ? false : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : springPreset}
        style={{
          flexShrink: 0,
          fontSize: 11.5,
          fontWeight: 500,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: talking || connecting ? 'var(--text-secondary)' : 'var(--text-tertiary)',
        }}
      >
        {topLabel}
        {contador && <span style={{ marginLeft: 12, opacity: 0.6 }}>{contador}</span>}
      </motion.span>

      <div
        style={{
          position: 'relative',
          width: 'min(56vh, 80vw, 540px)',
          height: 'min(56vh, 80vw, 540px)',
          flexShrink: 1,
          
          
          filter: connecting || voiceDown ? 'grayscale(1) brightness(0.72)' : 'none',
          transition: 'filter 450ms ease',
        }}
      >
        <VoiceOrb state={state} amplitude={amplitude} />
      </div>

      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          minHeight: 20,
        }}
      >
        <motion.p
          key={hint}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : springPreset}
          style={{
            margin: 0,
            fontSize: 13,
            letterSpacing: '0.04em',
            color: talking || connecting ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            textAlign: 'center',
          }}
        >
          {hint}
        </motion.p>

        <AnimatePresence>
          {micHint && (
            <motion.p
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              role="status"
              style={{
                margin: 0,
                maxWidth: 320,
                fontSize: 11.5,
                lineHeight: 1.5,
                color: 'var(--text-tertiary)',
                textAlign: 'center',
              }}
            >
              {micHint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}




export const SecondaryTranscript = forwardRef<
  HTMLDivElement,
  {
    messages: ChatMessage[]
    streamingId: string | null
    isEmpty: boolean
    error: string | null
    
    reducedMotion: boolean
    agentName: string
    
    emptyTitle?: string
    emptyHint?: string
    
    artifactsForMessage?: (messageId: string) => ArtifactRow[]
    
    orphanArtifacts?: ArtifactRow[]
    
    onOpenArtifact?: (id: string) => void
    
    onAbrirAnexo?: (id: string) => void
    
    onboardingChips?: (userText: string) => void
  }
>(function SecondaryTranscript(
  { messages, streamingId, isEmpty, error, reducedMotion, agentName, emptyTitle, emptyHint, artifactsForMessage = () => [], orphanArtifacts = [], onOpenArtifact = () => {}, onAbrirAnexo, onboardingChips },
  ref,
) {
  const fadeMask = 'linear-gradient(to bottom, transparent, #000 7%)'
  return (
    <div
      ref={ref}
      className="awave-scroll-fantasma"
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: 'clamp(16px, 3vw, 24px) clamp(14px, 2.5vw, 20px) 4px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: 0.92,
        maskImage: fadeMask,
        WebkitMaskImage: fadeMask,
      }}
    >
      {}
      <JarvisGradientDef />
      {isEmpty ? (
        <EmptyThread reducedMotion={reducedMotion} title={emptyTitle} hint={emptyHint} />
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isStreaming = message.id === streamingId
            
            const showTyping = isStreaming && message.content.length === 0
            
            
            
            const temAnexo = (message.anexos?.length ?? 0) > 0
            
            
            
            if (
              message.role === 'assistant' &&
              !isStreaming &&
              message.content.length === 0 &&
              !(message.citations && message.citations.length) &&
              !message.draft &&
              !message.investigacao &&
              artifactsForMessage(message.id).length === 0
            ) {
              return null
            }
            return (
              <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(message.content.length > 0 || temAnexo || showTyping) && (
                  showTyping ? (
                    <TypingBubble reducedMotion={reducedMotion} agentName={agentName} />
                  ) : (
                    <MessageBubble
                      message={message}
                      reducedMotion={reducedMotion}
                      agentName={agentName}
                      onAbrirAnexo={onAbrirAnexo}
                    />
                  )
                )}
                {}
                {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                  <div style={{ maxWidth: '88%', alignSelf: 'flex-start', width: '100%' }}>
                    <CitationsDisclosure notes={message.citations} />
                  </div>
                )}
                {}
                {message.role === 'assistant' && message.investigacao && (
                  <div style={{ maxWidth: '88%', alignSelf: 'flex-start', width: '100%' }}>
                    <ComoChegueiCard resumo={message.investigacao} />
                  </div>
                )}
                {}
                {message.role === 'assistant' && message.draft && (
                  <div style={{ maxWidth: '88%', alignSelf: 'flex-start', width: '100%' }}>
                    <MemoryDraftCard draft={message.draft} />
                  </div>
                )}
                {}
                {message.role === 'assistant' &&
                  artifactsForMessage(message.id).map((a) => (
                    <div key={a.id} style={{ maxWidth: '88%', alignSelf: 'flex-start', width: '100%' }}>
                      <ArtifactCard artifact={a} onOpen={onOpenArtifact} />
                    </div>
                  ))}
              </div>
            )
          })}
          {}
          {orphanArtifacts.map((a) => (
            <div key={a.id} style={{ maxWidth: '88%', alignSelf: 'flex-start', width: '100%' }}>
              <ArtifactCard artifact={a} onOpen={onOpenArtifact} />
            </div>
          ))}
        </AnimatePresence>
      )}

      {}
      {onboardingChips && (
        <OnboardingChips send={onboardingChips} reducedMotion={reducedMotion} />
      )}

      {}
      {error && (
        <motion.p
          role="alert"
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            margin: '4px 0 0',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            alignSelf: 'flex-start',
            maxWidth: '88%',
          }}
        >
          {error}
        </motion.p>
      )}
    </div>
  )
})



function EmptyThread({
  reducedMotion,
  title = 'Comece a conversa',
  hint = 'Pergunte qualquer coisa sobre a empresa. Eu fundamento as respostas nas memórias do cérebro e cito as fontes aqui mesmo.',
}: {
  reducedMotion: boolean
  
  title?: string
  
  hint?: string
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : springPreset}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '8px 2px',
        color: 'var(--text-tertiary)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </span>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
        {hint}
      </p>
    </motion.div>
  )
}



function TypingBubble({ reducedMotion, agentName }: { reducedMotion: boolean; agentName: string }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPreset}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '100%' }}
      aria-label={`${agentName} está pensando`}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        <JarvisMark />
        {agentName}
      </span>
      {}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 15px',
          borderRadius: 'var(--radius-lg)',
          borderTopLeftRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <TypingDots reducedMotion={reducedMotion} />
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>pensando…</span>
      </div>
    </motion.div>
  )
}


function TypingDots({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <span
      aria-hidden
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 6 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            display: 'block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--text-tertiary)',
          }}
          animate={reducedMotion ? { opacity: 0.55 } : { opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.16 }
          }
        />
      ))}
    </span>
  )
}




const MAX_COMPOSER_HEIGHT = 200


function useZonaDeArrasto(onArquivos: (files: File[]) => void) {
  const [arrastando, setArrastando] = useState(false)
  const profundidade = useRef(0)

  const temArquivo = (e: React.DragEvent) => arrasteTemArquivo(e.dataTransfer?.types)

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!temArquivo(e)) return
    e.preventDefault()
    profundidade.current = aoEntrar(profundidade.current)
    setArrastando(estaAceso(profundidade.current))
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!temArquivo(e)) return
    
    e.preventDefault()
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!temArquivo(e)) return
    profundidade.current = aoSair(profundidade.current)
    setArrastando(estaAceso(profundidade.current))
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!temArquivo(e)) return
      e.preventDefault()
      profundidade.current = 0
      setArrastando(false)
      const lista = Array.from(e.dataTransfer?.files ?? [])
      if (lista.length) onArquivos(lista)
    },
    [onArquivos],
  )

  return { arrastando, zona: { onDragEnter, onDragOver, onDragLeave, onDrop } }
}

function Composer({
  inputId,
  inputRef,
  draft,
  setDraft,
  onInputKeyDown,
  onFocus,
  onBlur,
  send,
  talking,
  onStartTalk,
  onStopTalk,
  voiceDown,
  vozDesligada,
  waveState,
  streaming,
  agentName,
  anexos,
  armado,
  anexoAviso,
  arrastando,
  onArquivos,
  onRemoverAnexo,
  onTentarDeNovoAnexo,
  onDispensarAviso,
  reducedMotion,
}: {
  inputId: string
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  draft: string
  setDraft: (v: string) => void
  onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onFocus: () => void
  onBlur: () => void
  send: () => void
  talking: boolean
  onStartTalk: () => void
  onStopTalk: () => void
  voiceDown: boolean
  
  vozDesligada: boolean
  waveState: string
  
  streaming: boolean
  agentName: string
  
  anexos: AnexoStaged[]
  
  armado: boolean
  
  anexoAviso: string | null
  
  arrastando: boolean
  
  onArquivos: (files: File[]) => void
  onRemoverAnexo: (key: string) => void
  onTentarDeNovoAnexo: (key: string) => void
  onDispensarAviso: () => void
  reducedMotion: boolean
}) {
  
  
  
  
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > MAX_COMPOSER_HEIGHT ? 'auto' : 'hidden'
  }, [draft, inputRef])

  
  
  const fileRef = useRef<HTMLInputElement | null>(null)

  const escolherArquivos = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const lista = Array.from(e.target.files ?? [])
      e.target.value = '' 
      if (lista.length) onArquivos(lista)
    },
    [onArquivos],
  )

  
  
  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const lista = Array.from(e.clipboardData?.files ?? [])
      if (lista.length === 0) return
      e.preventDefault()
      onArquivos(lista)
    },
    [onArquivos],
  )

  
  
  
  const prontos = anexos.filter((a) => a.estado === 'pronto').length
  const subindo = anexos.some((a) => a.estado === 'subindo')
  const podeEnviar = (draft.trim().length > 0 || prontos > 0) && !streaming
  
  const botaoAtivo = podeEnviar || (subindo && !streaming)
  const rotuloEnviar = armado
    ? 'Cancelar o envio automático'
    : subindo
      ? 'Enviar assim que o anexo terminar de subir'
      : 'Enviar mensagem'

  return (
    <div>
      {anexoAviso && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 8,
            padding: '8px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid color-mix(in srgb, var(--reject) 45%, transparent)',
            background: 'color-mix(in srgb, var(--reject) 8%, var(--surface))',
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ flex: 1 }}>{anexoAviso}</span>
          <button
            type="button"
            data-no-pushtotalk
            onClick={onDispensarAviso}
            aria-label="Dispensar aviso"
            style={{
              flexShrink: 0,
              padding: 0,
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              fontSize: 12,
              lineHeight: 1.45,
              cursor: 'pointer',
            }}
          >
            ok
          </button>
        </div>
      )}

      <AnexoBandeja
        anexos={anexos}
        onRemover={onRemoverAnexo}
        onTentarDeNovo={onTentarDeNovoAnexo}
        reducedMotion={reducedMotion}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          background: arrastando
            ? 'linear-gradient(120deg, color-mix(in srgb, var(--wave-from) 9%, var(--surface)), color-mix(in srgb, var(--wave-to) 10%, var(--surface)))'
            : 'var(--surface)',
          border: arrastando
            ? '1px dashed color-mix(in srgb, var(--wave-to) 70%, transparent)'
            : '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 8px 8px 14px',
          transition: 'background 140ms ease, border-color 140ms ease',
        }}
      >
        <label htmlFor={inputId} style={SR_ONLY}>
          Mensagem para {agentName}
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onInputKeyDown}
          onPaste={onPaste}
          onFocus={onFocus}
          onBlur={onBlur}
          rows={1}
          placeholder={voiceDown ? 'Escreva sua mensagem…' : 'Escreva ou segure Espaço para falar…'}
          style={{
            flex: 1,
            resize: 'none',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-ui)',
            fontSize: 14.5,
            lineHeight: 1.5,
            maxHeight: MAX_COMPOSER_HEIGHT,
            padding: '6px 0',
          }}
        />

        {}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={escolherArquivos}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          data-no-pushtotalk
          onClick={() => fileRef.current?.click()}
          aria-label="Anexar arquivo"
          title="Anexar imagem ou PDF (até 3 arquivos, 10MB cada)"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'background 120ms ease, color 120ms ease',
          }}
        >
          <ClipGlyph />
        </button>

        {}
        {!vozDesligada && (
          <MicButton
            talking={talking}
            onStart={onStartTalk}
            onStop={onStopTalk}
            waveState={waveState}
            disabled={voiceDown}
            agentName={agentName}
          />
        )}

        <button
          type="button"
          onClick={send}
          disabled={!botaoAtivo}
          aria-label={rotuloEnviar}
          title={rotuloEnviar}
          style={{
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: podeEnviar ? 'var(--text-primary)' : 'var(--surface-elevated)',
            color: podeEnviar ? 'var(--bg-base)' : 'var(--text-tertiary)',
            cursor: botaoAtivo ? 'pointer' : 'default',
            transition: 'background 120ms ease, color 120ms ease',
          }}
        >
          {}
          {armado && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: -1,
                borderRadius: 'var(--radius-md)',
                border: '1px solid transparent',
                background:
                  'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
              }}
            />
          )}
          <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
            <SendGlyph />
          </span>
        </button>
      </div>
      <p
        style={{
          margin: 0,
          marginTop: 8,
          fontSize: 11.5,
          color: 'var(--text-tertiary)',
          textAlign: 'center',
        }}
      >
        {armado ? (
          <>Vai enviar assim que o anexo subir · clique no enviar para cancelar</>
        ) : subindo ? (
          <>Subindo o anexo… pode escrever enquanto isso</>
        ) : vozDesligada ? (
          <>{MSG_COMPOSITOR_SEM_VOZ}</>
        ) : voiceDown ? (
          <>Voz indisponível no momento — o chat de texto segue normal. Enter para enviar.</>
        ) : (
          <>
            Segure <Kbd>Espaço</Kbd> para falar · Enter para enviar
          </>
        )}
      </p>
    </div>
  )
}



function MessageBubble({
  message,
  reducedMotion,
  agentName,
  onAbrirAnexo,
}: {
  message: ChatMessage
  reducedMotion: boolean
  agentName: string
  
  onAbrirAnexo?: (id: string) => void
}) {
  const isUser = message.role === 'user'
  const anexos = isUser ? (message.anexos ?? []) : []

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPreset}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '100%',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {!isUser && <JarvisMark />}
        {isUser ? 'Você' : agentName}
      </span>

      <div
        style={{
          maxWidth: '88%',
          padding: isUser ? '10px 14px' : '11px 15px',
          borderRadius: 'var(--radius-lg)',
          background: isUser ? 'var(--surface-elevated)' : 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          borderTopRightRadius: isUser ? 'var(--radius-sm)' : 'var(--radius-lg)',
          borderTopLeftRadius: isUser ? 'var(--radius-lg)' : 'var(--radius-sm)',
          fontSize: 14,
          lineHeight: 1.55,
          color: isUser ? 'var(--text-primary)' : 'var(--text-secondary)',
          
          
          whiteSpace: isUser ? 'pre-wrap' : undefined,
          overflowWrap: 'anywhere',
        }}
      >
        {}
        {anexos.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: message.content.length > 0 ? 8 : 0,
            }}
          >
            {anexos.map((a) =>
              a.kind === 'imagem' ? (
                <AnexoMiniaturaBolha key={a.id} anexo={a} onAbrir={onAbrirAnexo} />
              ) : (
                <AnexoChipBolha key={a.id} anexo={a} />
              ),
            )}
          </div>
        )}
        {isUser ? message.content : <Markdown chat>{message.content}</Markdown>}
      </div>
    </motion.div>
  )
}


function linhaDeAnexoParaLightbox(anexo: AnexoNaMensagem, createdAt?: string): ArtifactRow {
  return {
    id: anexo.id,
    conversation_id: null,
    task_id: null,
    agent_id: 'operador',
    kind: 'imagem',
    title: anexo.title,
    content: null,
    storage_ref: null,
    summary: null,
    status: 'draft',
    version: 1,
    parent_id: null,
    created_at: createdAt ?? '',
  }
}

const ANEXO_THUMB = 96


function AnexoMiniaturaBolha({
  anexo,
  onAbrir,
}: {
  anexo: AnexoNaMensagem
  onAbrir?: (id: string) => void
}) {
  const { url, error, indisponivel, reload } = useSignedUrl(anexo.id)
  const base: React.CSSProperties = {
    width: ANEXO_THUMB,
    height: ANEXO_THUMB,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-hairline)',
    background: 'var(--surface)',
    overflow: 'hidden',
    display: 'grid',
    placeItems: 'center',
    padding: 0,
  }

  if (error) {
    return (
      <span
        style={{ ...base, fontSize: 10.5, lineHeight: 1.3, textAlign: 'center', color: 'var(--text-tertiary)', padding: 6 }}
        title={anexo.title}
      >
        {indisponivel ? 'arquivo indisponível' : 'não carregou agora'}
      </span>
    )
  }

  if (!url) {
    return <span aria-hidden style={base} />
  }

  return (
    <button
      type="button"
      onClick={() => onAbrir?.(anexo.id)}
      title={anexo.title}
      aria-label={`Abrir ${anexo.title}`}
      style={{ ...base, cursor: onAbrir ? 'zoom-in' : 'default' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={anexo.title}
        onError={reload}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </button>
  )
}


function AnexoChipBolha({ anexo }: { anexo: AnexoNaMensagem }) {
  const [erro, setErro] = useState<string | null>(null)
  const [abrindo, setAbrindo] = useState(false)

  const abrir = useCallback(async () => {
    setErro(null)
    setAbrindo(true)
    
    
    const janela = window.open('', '_blank')
    if (janela) janela.opener = null
    try {
      const res = await fetch(`/api/artifacts/${anexo.id}/url`)
      if (!res.ok) throw new Error(res.status === 404 ? 'indisponivel' : 'falhou')
      const { url } = (await res.json()) as { url?: string }
      if (!url) throw new Error('falhou')
      if (janela) janela.location.href = url
      else window.open(url, '_blank', 'noopener')
    } catch (e) {
      janela?.close()
      setErro(
        e instanceof Error && e.message === 'indisponivel'
          ? 'arquivo indisponível'
          : 'não consegui abrir agora',
      )
    } finally {
      setAbrindo(false)
    }
  }, [anexo.id])

  return (
    <button
      type="button"
      onClick={abrir}
      title={anexo.title}
      aria-label={`Abrir ${anexo.title} em outra aba`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 230,
        padding: '7px 10px',
        borderRadius: 'var(--radius-md)',
        border: erro
          ? '1px solid color-mix(in srgb, var(--reject) 55%, transparent)'
          : '1px solid var(--border-hairline)',
        background: 'var(--surface)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-ui)',
        textAlign: 'left',
        cursor: abrindo ? 'progress' : 'pointer',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, color: 'var(--text-tertiary)' }}>
        <path d="M9.2 1.8H4.6a1.2 1.2 0 0 0-1.2 1.2v10a1.2 1.2 0 0 0 1.2 1.2h6.8a1.2 1.2 0 0 0 1.2-1.2V5.2L9.2 1.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M9.1 2v3.3h3.3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {anexo.title}
        </span>
        <span style={{ fontSize: 10.5, lineHeight: 1.3, color: erro ? 'var(--reject)' : 'var(--text-tertiary)' }}>
          {erro ?? (abrindo ? 'abrindo…' : formatarBytes(anexo.bytes))}
        </span>
      </span>
    </button>
  )
}


function JarvisGradientDef() {
  return (
    <svg
      width={0}
      height={0}
      style={{ position: 'absolute', overflow: 'hidden' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="jmark-shared" x1="0" y1="0" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--wave-from)" />
          <stop offset="1" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
    </svg>
  )
}


function JarvisMark() {
  return (
    <svg width="14" height="10" viewBox="0 0 16 12" fill="none" aria-hidden>
      <path
        d="M1 6c1.8 0 1.8-3.5 3.6-3.5S6.4 9.5 8 9.5s1.8-7 3.6-7S13.2 6 15 6"
        stroke="url(#jmark-shared)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}



function MicButton({
  talking,
  onStart,
  onStop,
  waveState,
  disabled = false,
  agentName,
}: {
  talking: boolean
  onStart: () => void
  onStop: () => void
  waveState: string
  disabled?: boolean
  agentName: string
}) {
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      onStart()
    },
    [onStart, disabled],
  )
  const release = useCallback(() => {
    onStop()
  }, [onStop])

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={disabled ? 'Voz indisponível no momento' : `Segure para falar com o ${agentName}`}
      aria-pressed={disabled ? undefined : talking}
      title={disabled ? 'Voz indisponível — use o chat de texto' : 'Segure para falar'}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        width: 38,
        height: 38,
        flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)',
        background: talking && !disabled ? 'var(--surface-elevated)' : 'transparent',
        color: disabled
          ? 'var(--text-tertiary)'
          : talking
            ? 'var(--text-primary)'
            : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        touchAction: 'none',
        transition: 'background 120ms ease, color 120ms ease, opacity 120ms ease',
      }}
    >
      {talking && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 'var(--radius-md)',
            border: '1px solid transparent',
            background:
              'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
            opacity: 0.9,
          }}
        />
      )}
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        <MicGlyph active={talking} />
      </span>
      <span style={SR_ONLY}>{waveState === 'listening' ? 'Escutando' : ''}</span>
    </button>
  )
}



function MicGlyph({ active }: { active: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect
        x="6.25"
        y="2"
        width="5.5"
        height="9"
        rx="2.75"
        stroke="currentColor"
        strokeWidth="1.3"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.14 : 0}
      />
      <path
        d="M4 8.2a5 5 0 0 0 10 0M9 13.2V16M6.4 16h5.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SendGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 8h9M7.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}


function ClipGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M12.5 7.2l-4.7 4.7a2.6 2.6 0 0 1-3.7-3.7l4.9-4.9a1.7 1.7 0 0 1 2.4 2.4l-4.9 4.9a0.8 0.8 0 0 1-1.2-1.2l4.4-4.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 4,
        padding: '1px 6px',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </kbd>
  )
}




function OnboardingProgressBar({
  cobertos,
  total,
  reducedMotion,
}: {
  cobertos: number
  total: number
  reducedMotion: boolean
}) {
  const pct = total > 0 ? Math.round((cobertos / total) * 100) : 0
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
      style={{
        flexShrink: 0,
        padding: '6px clamp(14px, 2.5vw, 20px) 0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      aria-label={`Entrevista: ${cobertos} de ${total} tópicos cobertos`}
    >
      <div
        style={{
          flex: 1,
          height: 2,
          borderRadius: 1,
          background: 'var(--border-hairline)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 18 }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--wave-from), var(--wave-to))',
            borderRadius: 1,
          }}
        />
      </div>
      <span
        style={{
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: 'var(--text-tertiary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {cobertos} de {total}
      </span>
    </motion.div>
  )
}


function OnboardingChips({
  send,
  reducedMotion,
}: {
  send: (userText: string) => void
  reducedMotion: boolean
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { delay: 0.12, duration: 0.2, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        Escolha uma opção
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ONBOARDING_CHIPS.map(({ perfil, label }) => (
          <button
            key={perfil}
            type="button"
            onClick={() => send(label)}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13.5,
              lineHeight: 1.4,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 120ms ease, color 120ms ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-elevated)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}


const FRASE_CONVERTER = 'Tenho uma empresa agora' 


function ConvertAffordance({
  send,
  reducedMotion,
}: {
  send: (userText: string) => void
  reducedMotion: boolean
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
      style={{
        flexShrink: 0,
        padding: '0 clamp(14px, 2.5vw, 20px)',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <button
        type="button"
        onClick={() => send(FRASE_CONVERTER)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          lineHeight: 1.4,
          cursor: 'pointer',
          transition: 'background 120ms ease, color 120ms ease',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-elevated)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
        }}
      >
        <JarvisMark />
        <span>{FRASE_CONVERTER}</span>
        <span aria-hidden style={{ opacity: 0.7 }}>→</span>
      </button>
    </motion.div>
  )
}

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
}
