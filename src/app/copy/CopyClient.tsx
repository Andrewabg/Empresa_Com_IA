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
import { EstudioTopbar } from '@/components/copy/EstudioTopbar'
import { HistoryDrawer } from '../conversa/HistoryDrawer'
import type { ThreadItem } from '@/lib/conversas/thread'
import { EstudioEmptyState } from '@/components/copy/EstudioEmptyState'
import { EstudioCanvas } from '@/components/copy/EstudioCanvas'
import { NoArPicker, type AdItem } from '@/components/copy/NoArPicker'
import { BrandVoiceCard } from '@/components/copy/BrandVoiceCard'
import { SwipeDrawer } from '@/components/copy/SwipeDrawer'
import { CampanhaDrawer } from '@/components/copy/CampanhaDrawer'
import { applyEstudioPatch, applySwipePatch, applyCampanhaPatch } from '@/lib/estudio/reducer'
import type { EdicaoDaCopy } from '@/components/copy/PecaCard'
import { removerAprendizado, type BrandVoice } from '@/lib/estudio/brandVoice'
import { algumTrabalhoEmVoo } from '@/lib/estudio/campanha'
import type { PecaView, EstudioPatch, SwipeView, CampanhaView } from '@/lib/estudio/types'
import type { CrewMember } from '@/data/crew'
import { MSG_COMPOSITOR_SEM_VOZ } from '@/lib/voicePalette'

interface CopyClientProps {
  agentId: string
  agentName: string
  
  agentInstalled: boolean
  
  vozDesligada: boolean
  initialMessages: ChatMessage[]
  initialConversationId: string | null
  initialPecas: PecaView[]
  initialSwipes: SwipeView[]
  initialCampanhas: CampanhaView[]
  brandVoice: BrandVoice | null
  brandName: string | null
  crew?: CrewMember[]
  
  ritualPendente: boolean
  
  initialThreads: ThreadItem[]
}

export function CopyClient({
  agentId,
  agentName,
  agentInstalled,
  vozDesligada,
  initialMessages,
  initialConversationId,
  initialPecas,
  initialSwipes,
  initialCampanhas,
  brandVoice: initialBrandVoice,
  brandName,
  ritualPendente,
  initialThreads,
}: CopyClientProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion() ?? false
  
  const { expandido: copilotoExpandido, largura: larguraCopiloto, alternar: alternarCopiloto } =
    useCopilotoExpandido('copy')

  const [pecas, setPecas] = useState<PecaView[]>(initialPecas)
  const [focoId, setFocoId] = useState<string | null>(null)
  const [fichaOpen, setFichaOpen] = useState(false)
  const [swipes, setSwipes] = useState<SwipeView[]>(initialSwipes)
  const [swipesOpen, setSwipesOpen] = useState(false)
  
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  
  
  const [ads, setAds] = useState<AdItem[]>([])
  const [adsLoading, setAdsLoading] = useState(false)
  const adsLoadedRef = useRef(false)

  
  
  const [pedindoArte, setPedindoArte] = useState<string | null>(null)

  
  
  
  const [editandoBloco, setEditandoBloco] = useState(false)

  const atoDaCopy = useCallback((url: string, body: Record<string, unknown>, fallback: string) => {
    setEditandoBloco(true)
    setErroPalco(null)
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as { ok?: boolean; peca?: PecaView; error?: string; aviso?: string } | null
        if (r.ok && j?.ok && j.peca) {
          setPecas((prev) => applyEstudioPatch(prev, { op: 'upsert', entidade: 'peca', peca: j.peca! }))
          if (j.aviso) setErroPalco(j.aviso)
        } else {
          setErroPalco(j?.error || fallback)
        }
      })
      .catch(() => setErroPalco(fallback))
      .finally(() => setEditandoBloco(false))
  }, [])

  const edicaoDaCopy = useMemo<EdicaoDaCopy>(() => ({
    ocupado: editandoBloco,
    onEditarBloco: (variacao, blocoId, texto) => {
      if (!focoId) return
      atoDaCopy(`/api/estudio/pecas/${focoId}/blocos`, { variacao, blocoId, texto },
        'Não consegui salvar esse campo agora. Tenta de novo? Nada foi gerado, então repetir é seguro.')
    },
    onRestaurar: (n) => {
      if (!focoId) return
      atoDaCopy(`/api/estudio/pecas/${focoId}/restaurar`, { n },
        'Não consegui voltar para essa versão agora. Tenta de novo? Nada foi apagado.')
    },
  }), [focoId, editandoBloco, atoDaCopy])
  const [arteAviso, setArteAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)

  
  const [campanhas, setCampanhas] = useState<CampanhaView[]>(initialCampanhas)
  const [campanhasOpen, setCampanhasOpen] = useState(false)
  const [producingId, setProducingId] = useState<string | null>(null)
  const [erroPalco, setErroPalco] = useState<string | null>(null)
  
  const [produzindoArtesId, setProduzindoArtesId] = useState<string | null>(null)
  
  
  
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(initialBrandVoice)
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
    () => initialPecas.map((p) => `${p.id}:${p.versaoAtual}:${p.status}:${p.position}`).join('|'),
    [initialPecas],
  )
  useEffect(() => {
    setPecas(initialPecas)
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig])

  
  useEffect(() => { setSwipes(initialSwipes) }, [initialSwipes])

  
  useEffect(() => { setCampanhas(initialCampanhas) }, [initialCampanhas])

  
  useEffect(() => {
    setBrandVoice(initialBrandVoice)
  }, [initialBrandVoice])

  const onNeedsConfig = useCallback(() => router.push('/config'), [router])
  const onEstudio = useCallback((patch: EstudioPatch) => {
    
    if (patch.entidade === 'dna') { setBrandVoice(patch.voice); return }
    
    if (patch.entidade === 'swipe') { setSwipes((prev) => applySwipePatch(prev, patch)); return }
    
    
    if (patch.entidade === 'campanha') { setCampanhas((prev) => applyCampanhaPatch(prev, patch)); setCampanhasOpen(true); return }
    
    if (patch.entidade !== 'peca') return
    setPecas((prev) => applyEstudioPatch(prev, patch))
    
    if (patch.op === 'upsert') setFocoId(patch.peca.id)
  }, [])

  
  
  
  const vozRef = useRef<ReturnType<typeof useRealtimeVoice> | null>(null)

  const { messages, status, streamingId, error, send, kickoff, startFresh } = useChatStream({
    initialMessages,
    initialConversationId,
    onNeedsConfig,
    onConversationId: setConversationId,
    agentId,
    onEstudio,
    
    onFerramenta: (f) => { vozRef.current?.aoUsarFerramenta(f) },
    
    onMensagemPersistida: (m) => { vozRef.current?.aoPersistirMensagem(m.id) },
  })

  
  
  
  
  
  
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

  
  const patchStatus = useCallback((id: string, novo: PecaView['status']) => {
    let anterior: PecaView['status'] | undefined
    setPecas((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        anterior = p.status
        return { ...p, status: novo }
      }),
    )
    fetch(`/api/estudio/pecas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novo }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('patch falhou')
      })
      .catch(() => {
        if (anterior) setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, status: anterior! } : p)))
      })
  }, [])

  const onAprovar = useCallback((id: string) => patchStatus(id, 'aprovada'), [patchStatus])
  const onArquivar = useCallback((id: string) => patchStatus(id, 'arquivada'), [patchStatus])

  
  
  const aplicarPeca = useCallback((peca: PecaView) => {
    setPecas((prev) => applyEstudioPatch(prev, { op: 'upsert', entidade: 'peca', peca }))
  }, [])

  
  const carregarAds = useCallback(async () => {
    if (adsLoadedRef.current) return
    setAdsLoading(true)
    try {
      const res = await fetch('/api/estudio/ads')
      const j: { ads?: AdItem[] } = res.ok ? await res.json() : { ads: [] }
      setAds(j.ads ?? [])
      adsLoadedRef.current = true
    } catch { setAds([]) } finally { setAdsLoading(false) }
  }, [])

  const onMarcarNoAr = useCallback((pecaId: string) => { setPickerFor(pecaId); void carregarAds() }, [carregarAds])

  const onEscolherAd = useCallback(async (pecaId: string, adId: string, metricas?: { roas?: number; ctr?: number; spend?: number; nome?: string | null }) => {
    setPickerFor(null)
    try {
      const res = await fetch(`/api/estudio/pecas/${pecaId}/no-ar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        
        
        body: JSON.stringify(metricas ? { adId, metricas } : { adId }),
      })
      if (res.ok) {
        const j: { peca?: PecaView } = await res.json()
        if (j.peca) aplicarPeca(j.peca)
      }
    } catch {  }
  }, [aplicarPeca])

  const onAtualizarPerf = useCallback(async (pecaId: string) => {
    
    const peca = pecas.find((p) => p.id === pecaId)
    if (!peca?.adId) return
    await onEscolherAd(pecaId, peca.adId)
  }, [pecas, onEscolherAd])

  const onDesvincular = useCallback(async (pecaId: string) => {
    try {
      const res = await fetch(`/api/estudio/pecas/${pecaId}/no-ar`, { method: 'DELETE' })
      if (res.ok) {
        const j: { peca?: PecaView } = await res.json()
        if (j.peca) aplicarPeca(j.peca)
      }
    } catch {  }
  }, [aplicarPeca])

  
  
  const onPedirArte = useCallback(async (pecaId: string) => {
    setPedindoArte(pecaId)
    setArteAviso(null)
    try {
      const res = await fetch('/api/estudio/pedir-arte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pecaId }),
      })
      const j: { error?: string } = await res.json().catch(() => ({}))
      setArteAviso(res.ok
        ? { tom: 'ok', texto: 'Pedido enviado ao Téo — a arte nasce no /design.' }
        : { tom: 'erro', texto: j.error ?? 'Não consegui pedir a arte.' })
    } catch {
      setArteAviso({ tom: 'erro', texto: 'Não consegui falar com o servidor.' })
    } finally {
      setPedindoArte(null)
    }
  }, [])

  
  const inputId = useId()
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const streaming = status === 'streaming'

  
  
  const onRevisar = useCallback((id: string) => {
    setFocoId(id)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  
  
  const onRemoverAprendizado = useCallback((texto: string) => {
    let anterior: BrandVoice | null = null
    setBrandVoice((prev) => {
      anterior = prev
      return prev ? removerAprendizado(prev, texto) : prev
    })
    fetch('/api/estudio/marca', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remover_aprendizado', texto }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('patch falhou'))))
      .then((j: { ok?: boolean; voice?: BrandVoice }) => {
        if (j?.ok && j.voice) setBrandVoice(j.voice)
      })
      .catch(() => setBrandVoice(anterior))
  }, [])

  
  const onRemoverSwipe = useCallback((id: string) => {
    let anterior: SwipeView[] = []
    setSwipes((prev) => { anterior = prev; return prev.filter((s) => s.id !== id) })
    fetch(`/api/estudio/swipes/${id}`, { method: 'DELETE' })
      .then((res) => { if (!res.ok) throw new Error('delete falhou') })
      .catch(() => setSwipes(anterior))
  }, [])

  
  
  
  
  
  const refetchCampanhas = useCallback(() => {
    fetch('/api/estudio/campanhas').then((r) => (r.ok ? r.json() : null))
      .then((j: { campanhas?: CampanhaView[] } | null) => { if (j?.campanhas) setCampanhas(j.campanhas) }).catch(() => {})
  }, [])

  
  
  const emProducao = algumTrabalhoEmVoo(campanhas)
  useEffect(() => {
    if (!emProducao) return
    const t = setInterval(() => {
      fetch('/api/estudio/campanhas')
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { campanhas?: CampanhaView[] } | null) => { if (j?.campanhas) setCampanhas(j.campanhas) })
        .catch(() => {})
      router.refresh()
    }, 4000)
    return () => clearInterval(t)
  }, [emProducao, router])

  const onProduzir = useCallback((id: string) => {
    setProducingId(id)
    setErroPalco(null)
    fetch(`/api/estudio/campanhas/${id}/produzir`, { method: 'POST' })
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => null)) as { error?: string } | null
          throw new Error(j?.error || 'Não consegui produzir as peças dessa campanha agora. Tenta de novo em instantes?')
        }
        refetchCampanhas(); router.refresh()
      })
      .catch((e: unknown) => setErroPalco(e instanceof Error ? e.message : 'Falha de conexão ao produzir a campanha. Tenta de novo?'))
      .finally(() => setProducingId(null))
  }, [refetchCampanhas, router])
  
  const onReproduzir = useCallback((id: string, _index: number) => onProduzir(id), [onProduzir])

  
  
  const onProduzirArtes = useCallback((id: string) => {
    setProduzindoArtesId(id)
    setErroPalco(null)
    fetch(`/api/estudio/campanhas/${id}/produzir-artes`, { method: 'POST' })
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => null)) as { error?: string } | null
          throw new Error(j?.error || 'Não consegui mandar essas peças pro estúdio de design agora. Tenta de novo em instantes?')
        }
        refetchCampanhas(); router.refresh()
      })
      .catch((e: unknown) => setErroPalco(e instanceof Error ? e.message : 'Falha de conexão ao pedir as artes. Tenta de novo?'))
      .finally(() => setProduzindoArtesId(null))
  }, [refetchCampanhas, router])
  const onAbrirCampanhas = useCallback(() => { setCampanhasOpen(true); refetchCampanhas() }, [refetchCampanhas])

  
  
  
  const onNovaConversa = useCallback(() => {
    startFresh()
    setConversationId(null)
    setHistoryOpen(false)
  }, [startFresh])

  
  const onSelectThread = useCallback((id: string) => {
    setHistoryOpen(false)
    router.push(`/copy?c=${id}`)
  }, [router])

  
  const abrirFicha = useCallback(() => {
    setFichaOpen(true)
    fetch('/api/estudio/marca')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; voice?: BrandVoice } | null) => {
        if (j?.voice) setBrandVoice(j.voice)
      })
      .catch(() => {})
  }, [])

  
  useEffect(() => {
    if (!fichaOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFichaOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fichaOpen])

  
  useEffect(() => {
    if (!swipesOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSwipesOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [swipesOpen])

  
  useEffect(() => {
    if (!campanhasOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setCampanhasOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [campanhasOpen])

  
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

  
  let estudio: React.ReactNode
  if (!agentInstalled) {
    estudio = <EstudioEmptyState variant="no-agent" agentName={agentName} />
  } else if (pecas.length === 0) {
    estudio = <EstudioEmptyState variant="welcome" agentName={agentName} />
  } else {
    estudio = (
      <>
        {arteAviso && (
          <div
            role="status"
            onClick={() => setArteAviso(null)}
            style={{
              margin: 'clamp(16px, 2.5vw, 28px) clamp(16px, 2.5vw, 28px) 0',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              cursor: 'pointer',
              color: arteAviso.tom === 'erro' ? 'var(--reject)' : 'var(--text-secondary)',
              border: `1px solid ${arteAviso.tom === 'erro' ? 'color-mix(in srgb, var(--reject) 40%, transparent)' : 'var(--border-hairline)'}`,
              background: arteAviso.tom === 'erro' ? 'color-mix(in srgb, var(--reject) 8%, transparent)' : 'transparent',
            }}
          >
            {arteAviso.texto}
          </div>
        )}
        <EstudioCanvas
          pecas={pecas}
          pecaFocadaId={focoId}
          onFocar={setFocoId}
          onAprovar={onAprovar}
          onArquivar={onArquivar}
          onRevisar={onRevisar}
          onMarcarNoAr={onMarcarNoAr}
          onAtualizarPerf={onAtualizarPerf}
          onDesvincular={onDesvincular}
          onPedirArte={onPedirArte}
          pedindoArte={pedindoArte}
          edicao={edicaoDaCopy}
        />
      </>
    )
  }

  
  const orbState: OrbState = streaming
    ? 'thinking'
    : talking || voiceLevel > 0.02
      ? 'listening'
      : 'idle'
  const orbLabel =
    !voiceEnabled || voiceDown
      ? 'Copiloto do estúdio'
      : voiceConnecting
        ? 'conectando voz…'
        : talking
          ? 'ouvindo você…'
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
      <EstudioTopbar
        agentName={agentName}
        brandName={brandName}
        onFicha={abrirFicha}
        onSwipes={() => setSwipesOpen(true)}
        onCampanhas={onAbrirCampanhas}
        onHistorico={() => setHistoryOpen(true)}
        onNova={onNovaConversa}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>
        {}
        <div style={{ flex: '2.1 1 0%', minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
          {erroPalco && (
            <div
              role="alert"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                margin: '12px 12px 0', padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid color-mix(in srgb, var(--reject) 35%, transparent)',
                background: 'color-mix(in srgb, var(--reject) 10%, transparent)',
                color: 'var(--reject)', fontSize: 12.5, lineHeight: 1.5,
              }}
            >
              <span>{erroPalco}</span>
              <button
                type="button"
                onClick={() => setErroPalco(null)}
                aria-label="Dispensar aviso"
                style={{ flexShrink: 0, border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          )}
          {estudio}
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
                placeholder={`Mensagem à ${agentName}…`}
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
      <SwipeDrawer
        open={swipesOpen}
        swipes={swipes}
        onClose={() => setSwipesOpen(false)}
        onRemover={onRemoverSwipe}
        reducedMotion={reducedMotion}
      />

      {}
      <CampanhaDrawer
        open={campanhasOpen}
        campanhas={campanhas}
        onClose={() => setCampanhasOpen(false)}
        onProduzir={onProduzir}
        onReproduzir={onReproduzir}
        producingId={producingId}
        reducedMotion={reducedMotion}
        onProduzirArtes={onProduzirArtes}
        produzindoArtesId={produzindoArtesId}
      />

      {}
      {pickerFor && (
        <NoArPicker
          pecaId={pickerFor}
          ads={ads}
          loading={adsLoading}
          onEscolher={onEscolherAd}
          onFechar={() => setPickerFor(null)}
        />
      )}

      {}
      <AnimatePresence>
        {fichaOpen && (
          <>
            <motion.div
              key="ficha-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              onClick={() => setFichaOpen(false)}
              aria-hidden
              style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.45)', zIndex: 50 }}
            />
            <motion.aside
              key="ficha-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Ficha da marca"
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
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Ficha da marca{brandName ? ` · ${brandName}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setFichaOpen(false)}
                  aria-label="Fechar a Ficha da marca"
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
                <BrandVoiceCard voice={brandVoice} onRemoverAprendizado={onRemoverAprendizado} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
        : `Segure para falar com a ${agentName}`

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
