'use client'


import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { ExpandirCopiloto, useCopilotoExpandido } from '@/components/cards/ExpandirCopiloto'
import { useChatStream, type ChatMessage } from '../conversa/useChatStream'
import { useRealtimeVoice } from '../conversa/useRealtimeVoice'
import { useStreamLevel } from '@/components/orb/useStreamLevel'
import { canStartTalk } from '../conversa/voiceProtocol'
import { deveTentarConectar } from '@/lib/voz/tentarDeNovo'
import { SecondaryTranscript } from '../conversa/ConversaClient'
import { VoiceOrb, type OrbState } from '@/components/orb/VoiceOrbLazy'
import { JuridicoTopbar } from '@/components/juridico/JuridicoTopbar'
import { HistoryDrawer } from '../conversa/HistoryDrawer'
import type { ThreadItem } from '@/lib/conversas/thread'
import { JuridicoEmptyState } from '@/components/juridico/JuridicoEmptyState'
import { FichaJuridicaCard } from '@/components/juridico/FichaJuridicaCard'
import { MesaContratos } from '@/components/juridico/MesaContratos'
import { ContratoStage } from '@/components/juridico/ContratoStage'
import { ModelosDrawer } from '@/components/juridico/ModelosDrawer'
import { PrazosRadar } from '@/components/juridico/PrazosRadar'
import { applyJuridicoPatch } from '@/lib/juridico/reducer'
import { agruparMesa } from '@/lib/juridico/parecer'
import { removerAprendizadoJuridico, type FichaJuridica } from '@/lib/juridico/ficha'
import type { ContratoView, JuridicoPatch } from '@/lib/juridico/types'
import type { PrazoView, PropostaPrazo } from '@/lib/juridico/prazosTipos'
import { MSG_COMPOSITOR_SEM_VOZ } from '@/lib/voicePalette'


function addDiasISO(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

interface JuridicoClientProps {
  agentId: string
  agentName: string
  
  agentInstalled: boolean
  
  vozDesligada: boolean
  initialMessages: ChatMessage[]
  initialConversationId: string | null
  initialContratos: ContratoView[]
  initialFicha: FichaJuridica
  
  initialPrazos?: PrazoView[]
  
  ritualPendente: boolean
  
  initialThreads: ThreadItem[]
}

export function JuridicoClient({
  agentId,
  agentName,
  agentInstalled,
  vozDesligada,
  initialMessages,
  initialConversationId,
  initialContratos,
  initialFicha,
  initialPrazos = [],
  ritualPendente,
  initialThreads,
}: JuridicoClientProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion() ?? false
  
  const { expandido: copilotoExpandido, largura: larguraCopiloto, alternar: alternarCopiloto } =
    useCopilotoExpandido('juridico')

  const [contratos, setContratos] = useState<ContratoView[]>(initialContratos)
  const [focoId, setFocoId] = useState<string | null>(null)
  
  const [proposta, setProposta] = useState<{ contratoId: string; prazos: PropostaPrazo[] } | null>(null)
  const [prazos, setPrazos] = useState<PrazoView[]>(initialPrazos)
  const [fichaAberta, setFichaAberta] = useState(false)
  const [modelosAberto, setModelosAberto] = useState(false)
  const [radarAberto, setRadarAberto] = useState(false)
  
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), [])
  
  const [enviandoPdf, setEnviandoPdf] = useState(false)
  const [uploadErro, setUploadErro] = useState<string | null>(null)
  
  
  
  const [ficha, setFicha] = useState<FichaJuridica>(initialFicha)
  const [draft, setDraft] = useState('')

  
  
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

  
  
  
  const initialSig = useMemo(
    () => initialContratos.map((c) => `${c.id}:${c.versaoAtual}:${c.status}`).join('|'),
    [initialContratos],
  )
  useEffect(() => {
    setContratos(initialContratos)
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig])

  
  useEffect(() => {
    setFicha(initialFicha)
  }, [initialFicha])

  const onNeedsConfig = useCallback(() => router.push('/config'), [router])
  const onJuridico = useCallback((patch: JuridicoPatch) => {
    
    if (patch.entidade === 'ficha') { setFicha(patch.ficha); return }
    
    
    
    
    if (patch.entidade === 'prazos-proposta') {
      setProposta({ contratoId: patch.contratoId, prazos: patch.prazos })
      setFocoId(patch.contratoId)
      return
    }
    setContratos((prev) => applyJuridicoPatch(prev, patch))
    
    if (patch.op === 'upsert' && patch.entidade === 'contrato') setFocoId(patch.contrato.id)
  }, [])

  
  
  
  const vozRef = useRef<ReturnType<typeof useRealtimeVoice> | null>(null)

  const { messages, status, streamingId, error, send, kickoff, startFresh } = useChatStream({
    initialMessages,
    initialConversationId,
    onNeedsConfig,
    onConversationId: setConversationId,
    agentId,
    onJuridico,
    
    onFerramenta: (f) => { vozRef.current?.aoUsarFerramenta(f) },
    
    onMensagemPersistida: (m) => { vozRef.current?.aoPersistirMensagem(m.id) },
  })

  
  
  
  const onNovaConversa = useCallback(() => {
    startFresh()
    setConversationId(null)
    setHistoryOpen(false)
  }, [startFresh])

  
  const onSelectThread = useCallback((id: string) => {
    setHistoryOpen(false)
    router.push(`/juridico?c=${id}`)
  }, [router])

  
  
  
  
  
  const ritualFiredRef = useRef(false)
  useEffect(() => {
    if (!ritualPendente || ritualFiredRef.current) return
    const t = setTimeout(() => {
      if (ritualFiredRef.current) return
      ritualFiredRef.current = true
      kickoff()
    }, 0)
    return () => clearTimeout(t)
  }, [ritualPendente, kickoff])

  
  
  
  
  
  
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

  
  const patchStatus = useCallback((id: string, novo: ContratoView['status']) => {
    let anterior: ContratoView['status'] | undefined
    setContratos((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        anterior = c.status
        return { ...c, status: novo }
      }),
    )
    fetch(`/api/juridico/contratos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novo }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('patch falhou')
      })
      .catch(() => {
        if (anterior) setContratos((prev) => prev.map((c) => (c.id === id ? { ...c, status: anterior! } : c)))
      })
  }, [])

  const onArquivar = useCallback((id: string) => patchStatus(id, 'arquivado'), [patchStatus])

  
  
  const onPreencher = useCallback(async (id: string, valores: Record<string, string>) => {
    try {
      const res = await fetch(`/api/juridico/contratos/${id}/preencher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valores }),
      })
      if (!res.ok) throw new Error('preencher falhou')
      const j = (await res.json()) as { ok?: boolean; contrato?: ContratoView }
      if (j?.ok && j.contrato) {
        setContratos((prev) => applyJuridicoPatch(prev, { op: 'upsert', entidade: 'contrato', contrato: j.contrato! }))
        setFocoId(j.contrato.id)
      }
    } catch {
      
    }
  }, [])

  
  
  const onConfirmarPrazos = useCallback(async (contratoId: string, prazosSel: PropostaPrazo[]) => {
    try {
      const res = await fetch(`/api/juridico/contratos/${contratoId}/prazos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prazos: prazosSel.map((p) => ({
            tipo: p.tipo,
            titulo: p.titulo,
            data_alvo: p.dataAlvo,
            janela_dias: p.janelaDias,
          })),
        }),
      })
      if (!res.ok) throw new Error('x')
      const j = (await res.json()) as { ok?: boolean; prazos?: PrazoView[] }
      if (j?.ok) {
        setPrazos((prev) => [...prev, ...(j.prazos ?? [])])
        setProposta(null)
      }
    } catch {}
  }, [])

  
  
  
  const refetchPrazos = useCallback(async () => {
    try {
      const r = await fetch('/api/juridico/prazos')
      if (!r.ok) return
      const j = (await r.json()) as { ok?: boolean; prazos?: PrazoView[] }
      if (j?.ok) setPrazos(j.prazos ?? [])
    } catch {}
  }, [])

  const patchPrazo = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/juridico/prazos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) return
        const j = (await res.json()) as { ok?: boolean }
        if (j?.ok) await refetchPrazos()
      } catch {}
    },
    [refetchPrazos],
  )

  const onAdiar = useCallback(
    (id: string) => {
      
      const p = prazos.find((x) => x.id === id)
      const ate = p ? addDiasISO(p.dataAlvo, 7) : addDiasISO(hoje, 7)
      void patchPrazo(id, { action: 'adiar', ate })
    },
    [prazos, hoje, patchPrazo],
  )
  const onResolver = useCallback((id: string) => void patchPrazo(id, { action: 'resolver' }), [patchPrazo])
  const onDispensar = useCallback((id: string) => void patchPrazo(id, { action: 'dispensar' }), [patchPrazo])

  const onAbrirContrato = useCallback((contratoId: string | null) => {
    if (contratoId) setFocoId(contratoId)
    setRadarAberto(false)
  }, [])

  
  const pedirParecer = useCallback((id: string) => {
    const c = contratos.find((x) => x.id === id)
    send(`Analisa o contrato "${c?.titulo ?? id}" da Mesa (id ${id}).`)
  }, [contratos, send])

  const onFinalizar = useCallback((id: string) => {
    const c = contratos.find((x) => x.id === id)
    send(`Finaliza o contrato "${c?.titulo ?? id}" (id ${id}).`)
  }, [contratos, send])

  const onSalvarModelo = useCallback((id: string) => {
    const c = contratos.find((x) => x.id === id)
    send(`Salva o contrato "${c?.titulo ?? id}" (id ${id}) como modelo da casa.`)
  }, [contratos, send])

  
  
  const onRemoverAprendizado = useCallback((texto: string) => {
    let anterior: FichaJuridica | null = null
    setFicha((prev) => {
      anterior = prev
      return removerAprendizadoJuridico(prev, texto)
    })
    fetch('/api/juridico/ficha', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remover_aprendizado', texto }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('patch falhou'))))
      .then((j: { ok?: boolean; ficha?: FichaJuridica }) => {
        if (j?.ok && j.ficha) setFicha(j.ficha)
      })
      .catch(() => { if (anterior) setFicha(anterior) })
  }, [])

  
  const fileRef = useRef<HTMLInputElement | null>(null)
  const onUpload = useCallback(() => fileRef.current?.click(), [])
  const onPdf = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setEnviandoPdf(true)
    setUploadErro(null)
    const form = new FormData()
    form.append('file', f)
    fetch('/api/juridico/upload', { method: 'POST', body: form })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? 'upload falhou')
        return r.json()
      })
      .then((j: { ok?: boolean; contrato?: ContratoView }) => {
        if (j?.ok && j.contrato) {
          setContratos((prev) => applyJuridicoPatch(prev, { op: 'upsert', entidade: 'contrato', contrato: j.contrato! }))
          setFocoId(j.contrato.id)
          send(`Subi um contrato pra você analisar: "${j.contrato.titulo}" (id ${j.contrato.id}).`)
        }
      })
      .catch((err: Error) => setUploadErro(err.message))
      .finally(() => setEnviandoPdf(false))
  }, [send])

  
  const abrirFicha = useCallback(() => {
    setFichaAberta(true)
    fetch('/api/juridico/ficha')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; ficha?: FichaJuridica } | null) => {
        if (j?.ficha) setFicha(j.ficha)
      })
      .catch(() => {})
  }, [])

  
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
    
    send(text, focoId ? { focoContratoId: focoId } : undefined)
    setDraft('')
  }, [draft, streaming, send, focoId])

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

  
  const modelosDaCasa = useMemo(() => agruparMesa(contratos).modelos, [contratos])
  const foco = focoId ? contratos.find((c) => c.id === focoId) ?? null : null

  let palco: React.ReactNode
  if (!agentInstalled) {
    palco = <JuridicoEmptyState variant="no-agent" />
  } else if (contratos.length === 0) {
    palco = (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {streaming && (
          <div style={{ padding: 'clamp(16px, 2.5vw, 28px)', paddingBottom: 0 }}>
            <TrabalhandoPlaceholder agentName={agentName} reducedMotion={reducedMotion} />
          </div>
        )}
        <JuridicoEmptyState variant="welcome" />
      </div>
    )
  } else {
    palco = (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {streaming && (
          <div style={{ padding: 'clamp(16px, 2.5vw, 28px)', paddingBottom: 0 }}>
            <TrabalhandoPlaceholder agentName={agentName} reducedMotion={reducedMotion} />
          </div>
        )}
        {foco && (
          <div style={{ padding: 'clamp(16px, 2.5vw, 28px)', paddingBottom: 0 }}>
            <ContratoStage
              contrato={foco}
              onAnalisar={pedirParecer}
              onFinalizar={onFinalizar}
              onSalvarModelo={onSalvarModelo}
              onArquivar={onArquivar}
              onPreencher={onPreencher}
              proposta={proposta}
              onConfirmarPrazos={onConfirmarPrazos}
            />
          </div>
        )}
        <MesaContratos contratos={contratos} onFocar={setFocoId} />
      </div>
    )
  }

  
  const orbState: OrbState = streaming
    ? 'thinking'
    : talking || voiceLevel > 0.02
      ? 'listening'
      : 'idle'
  const orbLabel =
    !voiceEnabled || voiceDown
      ? 'Copiloto do escritório'
      : voiceConnecting
        ? 'conectando voz…'
        : talking
          ? 'ouvindo você…'
          : streaming
            ? 'pensando…'
            : 'pronto pra falar'

  const fichaTitulo = ficha.razaoSocial ? `Ficha Jurídica · ${ficha.razaoSocial}` : 'Ficha Jurídica'

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
      <JuridicoTopbar
        agentName={agentName}
        ficha={ficha}
        prazos={prazos}
        hoje={hoje}
        onFicha={abrirFicha}
        onPrazos={() => setRadarAberto(true)}
        onModelos={() => setModelosAberto(true)}
        onUpload={onUpload}
        onHistorico={() => setHistoryOpen(true)}
        onNova={onNovaConversa}
      />

      {}
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={onPdf} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>
        {}
        <div style={{ flex: '2.1 1 0%', minWidth: 0, minHeight: 0, overflowY: 'auto' }}>{palco}</div>

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
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{orbLabel}</div>
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
            {}
            {(enviandoPdf || uploadErro) && (
              <p
                style={{
                  margin: '0 0 10px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface)',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: uploadErro ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                }}
              >
                {enviandoPdf ? `Enviando o contrato pro ${agentName} ler…` : uploadErro}
              </p>
            )}
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
      <SideDrawer open={fichaAberta} onClose={() => setFichaAberta(false)} title={fichaTitulo} reducedMotion={reducedMotion}>
        <FichaJuridicaCard ficha={ficha} onRemoverAprendizado={onRemoverAprendizado} />
      </SideDrawer>

      {}
      <SideDrawer open={modelosAberto} onClose={() => setModelosAberto(false)} title="Modelos" reducedMotion={reducedMotion}>
        <ModelosDrawer
          modelos={modelosDaCasa}
          onFocar={(id) => {
            setFocoId(id)
            setModelosAberto(false)
          }}
        />
      </SideDrawer>

      {}
      <SideDrawer open={radarAberto} onClose={() => setRadarAberto(false)} title="Prazos" reducedMotion={reducedMotion}>
        <PrazosRadar
          prazos={prazos}
          hoje={hoje}
          onAdiar={onAdiar}
          onResolver={onResolver}
          onDispensar={onDispensar}
          onAbrirContrato={onAbrirContrato}
        />
      </SideDrawer>

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


function TrabalhandoPlaceholder({ agentName, reducedMotion }: { agentName: string; reducedMotion: boolean }) {
  return (
    <motion.div
      animate={reducedMotion ? false : { opacity: [0.55, 1, 0.55] }}
      transition={reducedMotion ? undefined : { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid transparent',
        background:
          'linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-secondary)', textAlign: 'center' }}>
        O {agentName} está trabalhando…
      </p>
    </motion.div>
  )
}


function SideDrawer({
  open,
  onClose,
  title,
  reducedMotion,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  reducedMotion: boolean
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
            onClick={onClose}
            aria-hidden
            style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.45)', zIndex: 50 }}
          />
          <motion.aside
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reducedMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { x: '100%' }}
            transition={reducedMotion ? { duration: 0 } : springPreset}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100dvh',
              width: 'min(480px, 90vw)',
              zIndex: 51,
              background: 'var(--bg-base)',
              borderLeft: '1px solid var(--border-hairline)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <header
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-hairline)',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Fechar ${title}`}
                title="Fechar (Esc)"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 30,
                  height: 30,
                  flexShrink: 0,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  fontSize: 15,
                  lineHeight: 1,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </header>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'clamp(14px, 2vw, 20px)' }}>
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
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
