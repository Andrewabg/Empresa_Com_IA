'use client'


import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { ExpandirCopiloto, useCopilotoExpandido } from '@/components/cards/ExpandirCopiloto'
import { useChatStream, type ChatMessage } from '../conversa/useChatStream'
import { useRealtimeVoice } from '../conversa/useRealtimeVoice'
import { useStreamLevel } from '@/components/orb/useStreamLevel'
import { canStartTalk } from '../conversa/voiceProtocol'
import { deveTentarConectar } from '@/lib/voz/tentarDeNovo'
import { SecondaryTranscript } from '../conversa/ConversaClient'
import { PainelCanvas, type PainelBlocoComDados, type SeriePonto } from '@/components/trafego/PainelCanvas'
import { VoiceOrb, type OrbState } from '@/components/orb/VoiceOrbLazy'
import { TrafegoTopbar, type ContaAd } from '@/components/trafego/TrafegoTopbar'
import { HistoryDrawer } from '../conversa/HistoryDrawer'
import type { ThreadItem } from '@/lib/conversas/thread'
import { TrafegoEmptyState } from '@/components/trafego/TrafegoEmptyState'
import { AccountMemoryCard } from '@/components/trafego/AccountMemoryCard'
import { applyPatch } from '@/lib/trafego/painel-reducer'
import type { PainelBloco, PainelBlocoPatch, MetricShape } from '@/lib/trafego/types'
import type { CrewMember } from '@/data/crew'
import type { MetaHealth } from '@/server/config/metaHealth'
import type { AccountMemory } from '@/lib/trafego/accountMemory'
import { MSG_COMPOSITOR_SEM_VOZ } from '@/lib/voicePalette'
import { rotuloDoTrabalho } from '@/lib/conversa/trabalhoEmCurso'
import { avisoDePausaNoPainel } from '@/lib/trafego/graph/mensagens'

interface TrafegoClientProps {
  agentId: string
  agentName: string
  
  agentInstalled: boolean
  
  vozDesligada: boolean
  initialMessages: ChatMessage[]
  initialConversationId: string | null
  initialBlocos: PainelBlocoComDados[]
  crew?: CrewMember[]
  
  accountMemory?: { accountId: string; mem: AccountMemory } | null
  
  metaHealth: MetaHealth
  
  initialThreads: ThreadItem[]
}


function applyPatchComDados(
  prev: PainelBlocoComDados[],
  patch: PainelBlocoPatch,
): PainelBlocoComDados[] {
  const base: PainelBloco[] = prev.map((b) => ({
    id: b.id,
    type: b.type,
    config: b.config,
    snapshot_id: b.snapshot_id,
    annotation: b.annotation,
    position: b.position,
    status: b.status,
    
    created_at: b.created_at,
  }))
  const next = applyPatch(base, patch)
  const dadosBySnapshot = new Map<string, { metrics?: MetricShape; series?: SeriePonto[] }>()
  for (const b of prev) {
    if (b.snapshot_id) dadosBySnapshot.set(b.snapshot_id, { metrics: b.metrics, series: b.series })
  }
  return next.map((b) => {
    const dados = b.snapshot_id ? dadosBySnapshot.get(b.snapshot_id) : undefined
    return dados ? { ...b, ...dados } : b
  })
}

export function TrafegoClient({
  agentId,
  agentName,
  agentInstalled,
  vozDesligada,
  initialMessages,
  initialConversationId,
  initialBlocos,
  accountMemory,
  metaHealth: initialMetaHealth,
  initialThreads,
}: TrafegoClientProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion() ?? false
  
  const { expandido: copilotoExpandido, largura: larguraCopiloto, alternar: alternarCopiloto } =
    useCopilotoExpandido('trafego')

  
  
  
  const [metaHealth, setMetaHealth] = useState<MetaHealth>(initialMetaHealth)
  useEffect(() => {
    setMetaHealth(initialMetaHealth)
  }, [initialMetaHealth])

  const [blocos, setBlocos] = useState<PainelBlocoComDados[]>(initialBlocos)
  const [periodo, setPeriodo] = useState('last_7d')
  const [atualizando, setAtualizando] = useState(false)
  const [draft, setDraft] = useState('')
  
  
  
  
  const [pausaMetaMin, setPausaMetaMin] = useState<number | null>(null)

  
  
  const [contas, setContas] = useState<ContaAd[]>([])
  const [contaSelecionada, setContaSelecionada] = useState<string | null>(null)

  
  
  
  
  const [conversationId, setConversationId] = useState(initialConversationId)
  
  const [historyOpen, setHistoryOpen] = useState(false)

  
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

  
  
  useEffect(() => {
    if (metaHealth !== 'ok') {
      setContas([])
      return
    }
    let vivo = true
    fetch('/api/trafego/accounts')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { accounts?: ContaAd[]; selectedId?: string | null } | null) => {
        if (!vivo || !j) return
        setContas(Array.isArray(j.accounts) ? j.accounts : [])
        setContaSelecionada(j.selectedId ?? null)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [metaHealth])

  
  
  
  
  const initialSig = useMemo(
    () => initialBlocos.map((b) => `${b.id}:${b.snapshot_id}:${b.status}:${b.position}`).join('|'),
    [initialBlocos],
  )
  useEffect(() => {
    setBlocos(initialBlocos)
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig])

  const onNeedsConfig = useCallback(() => router.push('/config'), [router])
  const onPainel = useCallback(
    (patch: PainelBlocoPatch) => setBlocos((prev) => applyPatchComDados(prev, patch)),
    [],
  )

  
  
  
  const vozRef = useRef<ReturnType<typeof useRealtimeVoice> | null>(null)

  
  
  
  const [trabalho, setTrabalho] = useState<string | null>(null)
  const [contadorDoTrabalho, setContadorDoTrabalho] = useState<string | null>(null)

  const { messages, status, streamingId, error, send, startFresh } = useChatStream({
    initialMessages,
    initialConversationId,
    onNeedsConfig,
    onConversationId: setConversationId,
    agentId,
    onPainel,
    
    onFerramenta: (f) => {
      vozRef.current?.aoUsarFerramenta(f)
      setTrabalho(f.detalhe ?? rotuloDoTrabalho(f.tool))
      setContadorDoTrabalho(f.contador ?? null)
    },
    
    onMensagemPersistida: (m) => { vozRef.current?.aoPersistirMensagem(m.id) },
  })

  
  
  useEffect(() => {
    if (status !== 'streaming') { setTrabalho(null); setContadorDoTrabalho(null) }
  }, [status])

  
  
  
  const onNovaConversa = useCallback(() => {
    startFresh()
    setConversationId(null)
    setHistoryOpen(false)
  }, [startFresh])

  
  const onSelectThread = useCallback((id: string) => {
    setHistoryOpen(false)
    router.push(`/trafego?c=${id}`)
  }, [router])

  
  
  
  
  
  
  const voiceEnabled = agentInstalled && !vozDesligada


  
  
  
  
  const voice = useRealtimeVoice({
    conversationId,
    agentId,
    enviarTexto: send,
    textoEmCurso: messages.find((m) => m.id === streamingId)?.content ?? '',
    turnoAtivo: status === 'streaming',
    onConversationId: setConversationId,
    onNeedsConfig,
  })

  vozRef.current = voice

  const voiceStatus = voice.state.status
  const voiceDown =
    !voiceEnabled ||
    offline ||
    voiceStatus === 'budgetExceeded' ||
    voiceStatus === 'needsConfig' ||
    voiceStatus === 'error'
  const voiceReady = voiceStatus === 'connected'
  
  
  
  const voiceConnecting =
    !voiceDown &&
    voiceStatus !== 'connected' &&
    voiceStatus !== 'micDenied' &&
    voiceStatus !== 'micSemResposta'
  const pttPhase = voice.state.ptt

  
  
  const connect = voice.connect
  useEffect(() => {
    if (!voiceEnabled || offline) return
    void connect()
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceEnabled, offline])

  
  const localLevel = useStreamLevel(voice.localStream)
  const remoteLevel = useStreamLevel(voice.remoteStream)
  const voiceLevel = Math.max(localLevel, remoteLevel)

  
  const [talking, setTalking] = useState(false)
  const talkingRef = useRef(false)
  const inputFocusedRef = useRef(false)

  const startTalk = useCallback(() => {
    if (voiceDown) return
    if (!voiceReady) {
      if (deveTentarConectar(voiceStatus)) void voice.connect()
      return
    }
    if (!canStartTalk(pttPhase)) return 
    if (talkingRef.current) return
    talkingRef.current = true
    setTalking(true)
    voice.press()
  }, [voiceDown, voiceReady, voiceStatus, pttPhase, voice])

  const stopTalk = useCallback(() => {
    if (!talkingRef.current) return
    talkingRef.current = false
    setTalking(false)
    voice.release()
  }, [voice])

  
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space' || e.repeat || inputFocusedRef.current) return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      e.preventDefault()
      startTalk()
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== 'Space' || inputFocusedRef.current || !talkingRef.current) return
      e.preventDefault()
      stopTalk()
    }
    function onBlurWin() {
      if (talkingRef.current) stopTalk()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlurWin)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlurWin)
    }
  }, [startTalk, stopTalk])

  
  const allMessages = useMemo<ChatMessage[]>(
    () => messages,
    [messages],
  )

  
  
  const [pedindoId, setPedindoId] = useState<string | null>(null)
  const onPedirCopy = useCallback((blocoId: string) => {
    setPedindoId(blocoId)
    fetch('/api/trafego/pedir-copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocoId }) })
      .then((r) => { if (!r.ok) throw new Error('falhou') })
      .catch(() => {})
      .finally(() => setPedindoId(null))
  }, [])

  
  
  const [pedindoCriativoId, setPedindoCriativoId] = useState<string | null>(null)
  const onPedirCriativo = useCallback((blocoId: string) => {
    setPedindoCriativoId(blocoId)
    fetch('/api/trafego/pedir-criativo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocoId }) })
      .then((r) => { if (!r.ok) throw new Error('falhou') })
      .catch(() => {})
      .finally(() => setPedindoCriativoId(null))
  }, [])

  
  const onMarcarFeito = useCallback((id: string, next: 'active' | 'done') => {
    setBlocos((prev) => prev.map((b) => (b.id === id ? { ...b, status: next } : b)))
    fetch(`/api/trafego/blocos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('patch falhou')
      })
      .catch(() => {
        const revert = next === 'done' ? 'active' : 'done'
        setBlocos((prev) => prev.map((b) => (b.id === id ? { ...b, status: revert } : b)))
      })
  }, [])

  
  
  
  const drillingRef = useRef<Set<string>>(new Set())
  const onDrillCampanha = useCallback(
    (campaignId: string) => {
      if (drillingRef.current.has(campaignId)) return
      drillingRef.current.add(campaignId)
      fetch('/api/trafego/drill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, preset: periodo }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((j: { ok?: boolean; patch?: PainelBlocoPatch } | null) => {
          if (j?.ok && j.patch) onPainel(j.patch)
        })
        .catch(() => {})
        .finally(() => drillingRef.current.delete(campaignId))
    },
    [periodo, onPainel],
  )

  
  
  
  const onAtualizar = useCallback(() => {
    if (atualizando) return
    setAtualizando(true)
    
    fetch('/api/trafego/meta-health?fresh=1')
      .then((res) => (res.ok ? res.json() : null))
      .then((j: { status?: MetaHealth } | null) => {
        if (j?.status) setMetaHealth(j.status)
      })
      .catch(() => {})
    fetch('/api/trafego/atualizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: periodo }),
    })
      .then((res) => res.json().catch(() => null))
      .then((j: { ok?: boolean; reason?: string; minutos?: number } | null) => {
        
        
        setPausaMetaMin(j?.reason === 'throttled' && typeof j.minutos === 'number' ? j.minutos : null)
        router.refresh()
      })
      
      
      
      .catch(() => setPausaMetaMin(null))
      .finally(() => setAtualizando(false))
  }, [atualizando, periodo, router])

  
  
  const onContaChange = useCallback(
    (accountId: string) => {
      if (accountId === contaSelecionada) return
      setContaSelecionada(accountId)
      fetch('/api/trafego/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
        .then(() => onAtualizar())
        .catch(() => {})
    },
    [contaSelecionada, onAtualizar],
  )

  
  const inputId = useId()
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const streaming = status === 'streaming'

  
  
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 120)}px`
    
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden'
  }, [draft])

  const onSend = useCallback(() => {
    const text = draft.trim()
    if (!text || streaming) return
    send(text)
    setDraft('')
  }, [draft, streaming, send])

  
  
  
  const voiceHint = vozDesligada
    ? MSG_COMPOSITOR_SEM_VOZ
    : !voiceEnabled
    ? 'Enter para enviar'
    : voiceStatus === 'micSemResposta'
      ? 'O navegador está esperando você liberar o microfone. Libere e segure Espaço de novo; o texto segue normal.'
      : voiceStatus === 'micDenied'
        ? 'Microfone indisponível. Libere o microfone no navegador e segure Espaço de novo; o texto segue normal.'
        : voiceDown
          ? 'Voz indisponível — o chat de texto segue normal. Enter para enviar.'
          : 'Segure o microfone (ou Espaço) para falar · Enter para enviar'

  
  
  const lastContent = allMessages.length ? allMessages[allMessages.length - 1].content : ''
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [allMessages.length, lastContent, reducedMotion])

  
  let painel: React.ReactNode
  if (!agentInstalled) {
    painel = <TrafegoEmptyState variant="no-agent" agentName={agentName} />
  } else if (blocos.length === 0) {
    painel =
      metaHealth !== 'ok' ? (
        <TrafegoEmptyState variant="no-connection" agentName={agentName} />
      ) : (
        <TrafegoEmptyState variant="welcome" agentName={agentName} />
      )
  } else {
    painel = <PainelCanvas blocos={blocos} onMarcarFeito={onMarcarFeito} onDrillCampanha={onDrillCampanha} onPedirCopy={onPedirCopy} pedindoId={pedindoId} onPedirCriativo={onPedirCriativo} pedindoCriativoId={pedindoCriativoId} />
  }

  
  
  const orbState: OrbState = streaming
    ? 'thinking'
    : talking || voiceLevel > 0.02
      ? 'listening'
      : 'idle'
  
  
  
  
  
  
  
  
  
  const orbLabel = voiceConnecting
    ? 'conectando voz…'
    : talking
      ? 'ouvindo você…'
      : trabalho
        ? trabalho
        : !voiceEnabled || voiceDown
          ? 'Copiloto de tráfego'
          : streaming
            ? 'pensando…'
            : 'pronto pra falar'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <TrafegoTopbar
        agentName={agentName}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        metaHealth={metaHealth}
        onConfig={onNeedsConfig}
        onAtualizar={onAtualizar}
        atualizando={atualizando}
        contas={contas}
        contaSelecionada={contaSelecionada}
        onContaChange={onContaChange}
        onHistorico={() => setHistoryOpen(true)}
        onNova={onNovaConversa}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>
        {}
        <div style={{ flex: '2.1 1 0%', minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
          {}
          {agentInstalled && (
            <div style={{ padding: 'clamp(16px,2.5vw,28px) clamp(16px,2.5vw,28px) 0' }}>
              {}
              {pausaMetaMin != null && (
                <div
                  role="status"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '5px 11px',
                    borderRadius: 999,
                    border: '1px solid rgb(214 158 46 / 0.3)',
                    background: 'rgb(214 158 46 / 0.07)',
                    color: 'rgb(214 158 46)',
                    fontSize: 11.5,
                    marginBottom: 12,
                  }}
                >
                  <span aria-hidden style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>
                    ⚠
                  </span>
                  {avisoDePausaNoPainel(pausaMetaMin)}
                </div>
              )}
              <AccountMemoryCard mem={accountMemory?.mem ?? null} />
            </div>
          )}
          {painel}
        </div>

        {}
        <div
          style={{
            width: larguraCopiloto,
            transition: reducedMotion ? undefined : 'width 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            flexShrink: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--border-hairline)',
            background: 'linear-gradient(to right, rgb(255 255 255 / 0.012), transparent)',
          }}
        >
          {}
          <audio ref={voice.audioRef} autoPlay playsInline aria-hidden style={{ display: 'none' }} />

          {}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ width: 60, height: 60, flexShrink: 0, position: 'relative' }}>
              <VoiceOrb state={orbState} amplitude={voiceLevel} />
            </div>
            <div style={{ minWidth: 0, lineHeight: 1.35 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{agentName}</div>
              {}
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                {orbLabel}
                {}
                {orbLabel === trabalho && contadorDoTrabalho && (
                  <span style={{ marginLeft: 8, opacity: 0.6 }}>{contadorDoTrabalho}</span>
                )}
              </div>
            </div>
            <ExpandirCopiloto expandido={copilotoExpandido} onAlternar={alternarCopiloto} />
          </div>

          <SecondaryTranscript
            ref={scrollRef}
            messages={allMessages}
            streamingId={streamingId}
            isEmpty={allMessages.length === 0}
            error={error}
            reducedMotion={reducedMotion}
            agentName={agentName}
          />

          <div
            style={{
              flexShrink: 0,
              padding: 'clamp(12px, 2vw, 18px) clamp(14px, 2.5vw, 20px) clamp(14px, 2.5vw, 20px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px 8px 8px 14px',
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
                onFocus={() => {
                  inputFocusedRef.current = true
                }}
                onBlur={() => {
                  inputFocusedRef.current = false
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSend()
                  }
                }}
                rows={1}
                placeholder={`Mensagem ao ${agentName}…`}
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
                  minHeight: 44,
                  maxHeight: 120,
                  padding: '10px 0',
                  boxSizing: 'border-box',
                  overflowY: 'hidden',
                }}
              />

              {}
              {voiceEnabled && (
                <VoiceControl
                  talking={talking}
                  connecting={voiceConnecting}
                  disabled={voiceDown || voiceStatus === 'micDenied'}
                  phase={pttPhase}
                  level={voiceLevel}
                  agentName={agentName}
                  reducedMotion={reducedMotion}
                  onStart={startTalk}
                  onStop={stopTalk}
                />
              )}

              <button
                type="button"
                onClick={onSend}
                disabled={!draft.trim() || streaming}
                aria-label="Enviar mensagem"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  background: draft.trim() && !streaming ? 'var(--text-primary)' : 'var(--surface-elevated)',
                  color: draft.trim() && !streaming ? 'var(--bg-base)' : 'var(--text-tertiary)',
                  cursor: draft.trim() && !streaming ? 'pointer' : 'default',
                  transition: 'background 120ms ease, color 120ms ease',
                }}
              >
                <SendGlyph />
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              {voiceHint}
            </p>
          </div>
        </div>
      </div>

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





function VoiceControl({
  talking,
  connecting,
  disabled,
  phase,
  level,
  agentName,
  reducedMotion,
  onStart,
  onStop,
}: {
  talking: boolean
  connecting: boolean
  disabled: boolean
  phase: 'idle' | 'listening' | 'committing' | 'speaking' | 'searching'
  level: number
  agentName: string
  reducedMotion: boolean
  onStart: () => void
  onStop: () => void
}) {
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      onStart()
    },
    [disabled, onStart],
  )
  const release = useCallback(() => onStop(), [onStop])

  const speaking = phase === 'speaking'
  const showMeter = (talking || speaking) && !disabled
  const ringActive = talking && !disabled

  const label = disabled
    ? 'Voz indisponível no momento'
    : connecting
      ? 'Conectando a voz'
      : talking
        ? 'Ouvindo — solte para encerrar'
        : `Segure para falar com o ${agentName}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <AnimatePresence initial={false}>
        {showMeter && (
          <motion.span
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            style={{ overflow: 'hidden', display: 'flex' }}
          >
            <LevelBars level={level} />
          </motion.span>
        )}
      </AnimatePresence>

      <button
        type="button"
        disabled={disabled}
        aria-label={label}
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
          background: ringActive ? 'var(--surface-elevated)' : 'transparent',
          color: disabled ? 'var(--text-tertiary)' : talking ? 'var(--text-primary)' : 'var(--text-secondary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          touchAction: 'none',
          transition: 'background 120ms ease, color 120ms ease, opacity 120ms ease',
        }}
      >
        {}
        {ringActive && (
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
        {}
        {connecting && !reducedMotion && (
          <motion.span
            aria-hidden
            style={{
              position: 'absolute',
              inset: -1,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
            }}
            animate={{ opacity: [0.3, 0.85, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
          <MicGlyph active={talking} />
        </span>
      </button>
    </div>
  )
}


function LevelBars({ level }: { level: number }) {
  const mult = [0.5, 1, 0.72, 0.4]
  return (
    <span
      aria-hidden
      style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20, paddingRight: 2 }}
    >
      {mult.map((m, i) => {
        const h = Math.max(3, Math.min(18, level * 22 * m))
        return (
          <span
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 2,
              background: 'linear-gradient(to top, var(--wave-from), var(--wave-to))',
              transition: 'height 70ms linear',
            }}
          />
        )
      })}
    </span>
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
