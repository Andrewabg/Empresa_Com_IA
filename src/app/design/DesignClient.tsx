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
import { seedArtifactUrls } from '@/components/design/useArtifactUrl'
import { ArtifactLightbox } from '../conversa/ArtifactLightbox'
import { artesAbriveis } from '@/lib/design/artifactUrls'
import { DesignTopbar } from '@/components/design/DesignTopbar'
import { HistoryDrawer } from '../conversa/HistoryDrawer'
import type { ThreadItem } from '@/lib/conversas/thread'
import { DesignEmptyState } from '@/components/design/DesignEmptyState'
import { DesignCanvas } from '@/components/design/DesignCanvas'
import { DirecaoArteCard, type DirecaoArteEdicao } from '@/components/design/DirecaoArteCard'
import type { EdicaoDaArte } from '@/components/design/EditorDeArte'
import { COPY_AJUSTE } from '@/lib/design/copyDoAjuste'
import { idEmFoco } from '@/lib/design/criativoEmFoco'
import type { PapelDaCor } from '@/lib/design/direcaoArte'
import { ReferenciaTray } from '@/components/design/ReferenciaTray'
import { ConjuntoPicker } from '@/components/design/ConjuntoPicker'
import { applyCriativoPatch } from '@/lib/design/reducer'
import { removerAprendizadoVisual, type DirecaoArte } from '@/lib/design/direcaoArte'
import type { CriativoView } from '@/lib/design/types'
import type { EstudioPatch } from '@/lib/estudio/types'
import { MSG_COMPOSITOR_SEM_VOZ } from '@/lib/voicePalette'
import { AVISO_SO_O_DONO_MUDA_A_DIRECAO, mensagemDeAcaoDoDono } from '@/lib/agentes/somenteDono'
import { COPY_FICHA } from '@/lib/design/copyDaFicha'

interface DesignClientProps {
  agentId: string
  agentName: string
  
  agentInstalled: boolean
  
  vozDesligada: boolean
  initialMessages: ChatMessage[]
  initialConversationId: string | null
  initialCriativos: CriativoView[]
  initialReferencias: { id: string; titulo: string }[]
  
  initialUrls?: Record<string, string>
  direcaoArte: DirecaoArte | null
  brandName: string | null
  
  ritualPendente: boolean
  
  initialThreads: ThreadItem[]
  
  isDono: boolean
}

export function DesignClient({
  agentId,
  agentName,
  agentInstalled,
  vozDesligada,
  initialMessages,
  initialConversationId,
  initialCriativos,
  initialReferencias,
  initialUrls = {},
  direcaoArte: initialDirecao,
  brandName,
  ritualPendente,
  initialThreads,
  isDono,
}: DesignClientProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion() ?? false
  
  const { expandido: copilotoExpandido, largura: larguraCopiloto, alternar: alternarCopiloto } =
    useCopilotoExpandido('design')

  
  
  
  useState(() => { seedArtifactUrls(initialUrls); return null })

  const [criativos, setCriativos] = useState<CriativoView[]>(initialCriativos)
  const [focoId, setFocoId] = useState<string | null>(null)
  const [direcaoOpen, setDirecaoOpen] = useState(false)
  
  const [historyOpen, setHistoryOpen] = useState(false)
  
  const [referencias, setReferencias] = useState<{ id: string; titulo: string }[]>(initialReferencias)
  
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null)
  
  const [gerandoId, setGerandoId] = useState<string | null>(null)
  
  
  const [erroPalco, setErroPalco] = useState<string | null>(null)
  
  
  const [arteAberta, setArteAberta] = useState<string | null>(null)
  
  
  const [lancarPara, setLancarPara] = useState<string | null>(null)
  const [conjuntos, setConjuntos] = useState<{ id: string; nome: string }[]>([])
  const [conjuntosLoading, setConjuntosLoading] = useState(false)
  const conjuntosLoadedRef = useRef(false)
  const [lancandoArtifactId, setLancandoArtifactId] = useState<string | null>(null)
  
  
  const [lancamentoAviso, setLancamentoAviso] = useState<{ tom: 'info' | 'erro'; texto: string } | null>(null)
  
  
  
  const [direcao, setDirecao] = useState<DirecaoArte | null>(initialDirecao)
  
  
  
  const [sugestaoPaleta, setSugestaoPaleta] = useState<{ hex: string; peso: number }[]>([])
  
  
  const [fichaOcupada, setFichaOcupada] = useState(false)
  const [draft, setDraft] = useState('')

  
  
  const [conversationId, setConversationId] = useState(initialConversationId)

  
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
    () => initialCriativos.map((c) => `${c.id}:${c.versaoAtual}:${c.status}:${c.position}`).join('|'),
    [initialCriativos],
  )
  useEffect(() => {
    setCriativos(initialCriativos)
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig])

  
  useEffect(() => { setDirecao(initialDirecao) }, [initialDirecao])

  
  useEffect(() => { setReferencias(initialReferencias) }, [initialReferencias])

  const onNeedsConfig = useCallback(() => router.push('/config'), [router])
  const onEstudio = useCallback((patch: EstudioPatch) => {
    
    
    if (patch.entidade === 'direcao') { setDirecao(patch.direcao); return }
    
    if (patch.entidade !== 'criativo') return
    setCriativos((prev) => applyCriativoPatch(prev, patch))
    
    if (patch.op === 'upsert') setFocoId(patch.criativo.id)
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

  
  
  const patchStatus = useCallback((id: string, novo: CriativoView['status']) => {
    let anterior: CriativoView['status'] | undefined
    setCriativos((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        anterior = c.status
        return { ...c, status: novo }
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
        if (anterior) setCriativos((prev) => prev.map((c) => (c.id === id ? { ...c, status: anterior! } : c)))
      })
  }, [])

  
  
  const onArquivar = useCallback((id: string) => {
    patchStatus(id, 'arquivada')
    setFocoId((atual) => (atual === id ? null : atual))
  }, [patchStatus])

  
  
  
  
  
  const onNovaConversa = useCallback(() => {
    startFresh()
    setConversationId(null)
    setReferencias([])
    setFocoId(null)
    setHistoryOpen(false)
  }, [startFresh])

  
  const onSelectThread = useCallback((id: string) => {
    setHistoryOpen(false)
    router.push(`/design?c=${id}`)
  }, [router])

  
  const onLancar = useCallback((artifactId: string) => {
    setLancamentoAviso(null)
    setLancarPara(artifactId)
    if (conjuntosLoadedRef.current) return
    conjuntosLoadedRef.current = true
    setConjuntosLoading(true)
    fetch('/api/design/conjuntos')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('conjuntos'))))
      .then((j: { conjuntos?: { id: string; nome: string }[] }) => setConjuntos(j.conjuntos ?? []))
      .catch(() => { conjuntosLoadedRef.current = false }) 
      .finally(() => setConjuntosLoading(false))
  }, [])

  
  const onEscolherConjunto = useCallback(async (adsetId: string) => {
    const artifactId = lancarPara
    if (!artifactId) return
    setLancandoArtifactId(artifactId)
    setLancarPara(null)
    try {
      const res = await fetch('/api/design/lancar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId, adsetId }),
      })
      const j: { output?: string; error?: string } = await res.json().catch(() => ({}))
      
      
      setLancamentoAviso(
        res.ok && j.output
          ? { tom: 'info', texto: j.output }
          : { tom: 'erro', texto: j.error ?? 'Não consegui preparar o lançamento.' },
      )
    } catch {
      setLancamentoAviso({ tom: 'erro', texto: 'Não consegui falar com o servidor.' })
    } finally {
      setLancandoArtifactId(null)
    }
  }, [lancarPara])

  
  
  const onFinalizar = useCallback((id: string, variacao: number) => {
    setFinalizandoId(id)
    fetch(`/api/design/criativos/${id}/finalizar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variacao }),
    })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as { ok?: boolean; criativo?: CriativoView; error?: string } | null
        if (r.ok && j?.ok && j.criativo) {
          setCriativos((prev) => applyCriativoPatch(prev, { op: 'upsert', entidade: 'criativo', criativo: j.criativo! }))
        } else {
          setErroPalco(j?.error || 'Não consegui confirmar a arte final. Ela pode ter ficado pronta mesmo assim: atualize a página antes de pedir outra, pra não gerar duas.')
        }
      })
      .catch(() => setErroPalco('Perdi a conexão antes de confirmar a arte final. Ela pode ter ficado pronta mesmo assim: atualize a página antes de pedir outra.'))
      .finally(() => setFinalizandoId(null))
  }, [])

  
  
  
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const atoDeEdicao = useCallback((id: string, url: string, body: Record<string, unknown>, fallback: string) => {
    setEditandoId(id)
    setErroPalco(null)
    fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as { ok?: boolean; criativo?: CriativoView; error?: string } | null
        if (r.ok && j?.ok && j.criativo) {
          setCriativos((prev) => applyCriativoPatch(prev, { op: 'upsert', entidade: 'criativo', criativo: j.criativo! }))
        } else {
          setErroPalco(j?.error || fallback)
        }
      })
      .catch(() => setErroPalco(fallback))
      .finally(() => setEditandoId(null))
  }, [])

  
  
  
  
  const alvoDaEdicao = idEmFoco(criativos, focoId)
  const edicaoDaArte = useMemo<EdicaoDaArte>(() => ({
    ocupado: editandoId !== null,
    onRecompor: (variacao, patch, slide) => {
      if (!alvoDaEdicao) return
      atoDeEdicao(alvoDaEdicao, `/api/design/criativos/${alvoDaEdicao}/recompor`,
        { variacao, ...(slide !== undefined ? { slide } : {}), ...patch },
        'Não consegui remontar a arte agora. Tenta de novo? Nada foi gerado, então repetir é seguro.')
    },
    onRestaurar: (n) => {
      if (!alvoDaEdicao) return
      atoDeEdicao(alvoDaEdicao, `/api/design/criativos/${alvoDaEdicao}/restaurar`, { n },
        'Não consegui voltar para essa versão agora. Tenta de novo? Nada foi apagado.')
    },
    
    
    
    onRemixar: (variacao, pedido) => {
      if (!alvoDaEdicao) return
      atoDeEdicao(alvoDaEdicao, `/api/design/criativos/${alvoDaEdicao}/remix`, { variacao, pedido },
        COPY_AJUSTE.falhou)
    },
  }), [alvoDaEdicao, editandoId, atoDeEdicao])

  
  
  
  const onPreencherBrief = useCallback((id: string, patch: Record<string, unknown>) => {
    return fetch(`/api/design/criativos/${id}/brief`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as { ok?: boolean; criativo?: CriativoView; error?: string } | null
        if (r.ok && j?.ok && j.criativo) {
          setCriativos((prev) => applyCriativoPatch(prev, { op: 'upsert', entidade: 'criativo', criativo: j.criativo! }))
        } else {
          setErroPalco(j?.error || 'Não consegui salvar essa parte do briefing. O que você escreveu ainda está aí: tenta de novo?')
        }
      })
      .catch(() => setErroPalco('Falha de conexão ao salvar o briefing. O que você escreveu ainda está aí: tenta de novo?'))
  }, [])

  
  
  const onGerar = useCallback((id: string) => {
    setErroPalco(null)
    setGerandoId(id)
    return fetch(`/api/design/criativos/${id}/gerar`, { method: 'POST' })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as { ok?: boolean; criativo?: CriativoView; error?: string } | null
        if (r.ok && j?.ok && j.criativo) {
          setCriativos((prev) => applyCriativoPatch(prev, { op: 'upsert', entidade: 'criativo', criativo: j.criativo! }))
        } else {
          
          setErroPalco(j?.error || 'Não consegui gerar as provas agora — tenta de novo em instantes?')
        }
      })
      .catch(() => setErroPalco('Falha de conexão ao gerar — tenta de novo?'))
      .finally(() => setGerandoId(null))
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
    let anterior: DirecaoArte | null = null
    setDirecao((prev) => {
      anterior = prev
      return prev ? removerAprendizadoVisual(prev, texto) : prev
    })
    fetch('/api/design/direcao', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remover_aprendizado', texto }),
    })
      .then((res) => {
        if (res.ok) return res.json()
        setErroPalco(mensagemDeAcaoDoDono(res.status, null, AVISO_SO_O_DONO_MUDA_A_DIRECAO, COPY_FICHA.removerAprendizado))
        return Promise.reject(new Error('patch falhou'))
      })
      .then((j: { ok?: boolean; direcao?: DirecaoArte }) => {
        if (j?.ok && j.direcao) setDirecao(j.direcao)
      })
      .catch(() => setDirecao(anterior))
  }, [])

  
  const atoDaFicha = useCallback(async (
    exec: () => Promise<Response>,
    fallback: string,
  ): Promise<boolean> => {
    setFichaOcupada(true)
    setErroPalco(null)
    try {
      const res = await exec()
      const j = (await res.json().catch(() => null)) as
        { ok?: boolean; direcao?: DirecaoArte; sugestao?: { hex: string; peso: number }[]; error?: string } | null
      if (!res.ok) { setErroPalco(mensagemDeAcaoDoDono(res.status, j?.error, AVISO_SO_O_DONO_MUDA_A_DIRECAO, fallback)); return false }
      if (!j?.ok) { setErroPalco(j?.error || fallback); return false }
      if (j.direcao) setDirecao(j.direcao)
      
      
      if (j.sugestao) setSugestaoPaleta(j.sugestao)
      return true
    } catch {
      setErroPalco(fallback)
      return false
    } finally {
      setFichaOcupada(false)
    }
  }, [])

  const patchDirecao = useCallback((body: Record<string, unknown>, fallback: string) =>
    atoDaFicha(() => fetch('/api/design/direcao', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }), fallback), [atoDaFicha])

  const edicaoDaFicha = useMemo<DirecaoArteEdicao>(() => ({
    sugestao: sugestaoPaleta,
    ocupado: fichaOcupada,
    onSubirLogo: (file: File, mono: boolean) => {
      const form = new FormData()
      form.append('file', file)
      if (mono) form.append('mono', '1')
      void atoDaFicha(
        () => fetch('/api/design/marca/logo', { method: 'POST', body: form }),
        COPY_FICHA.logo,
      )
    },
    onAceitarCor: (hex: string, papel: PapelDaCor | '') => {
      
      
      
      const aceita = sugestaoPaleta.find((c) => c.hex === hex)
      setSugestaoPaleta((prev) => prev.filter((c) => c.hex !== hex))
      void patchDirecao(
        { action: 'adicionar_cor', hex, ...(papel ? { papel } : {}) },
        COPY_FICHA.adicionarCor,
      ).then((ok) => {
        if (!ok && aceita) setSugestaoPaleta((prev) => (prev.some((c) => c.hex === hex) ? prev : [...prev, aceita]))
      })
    },
    onRemoverCor: (hex: string) => void patchDirecao(
      { action: 'remover_cor', hex },
      COPY_FICHA.tirarCor,
    ),
    onDefinirTipografia: (display: string, corpo: string) => void patchDirecao(
      { action: 'definir_tipografia', display, corpo },
      COPY_FICHA.tipografia,
    ),
  }), [sugestaoPaleta, fichaOcupada, atoDaFicha, patchDirecao])

  
  
  
  const fileRef = useRef<HTMLInputElement | null>(null)
  const onPickReferencia = useCallback(() => fileRef.current?.click(), [])
  const onReferencia = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const form = new FormData()
    form.append('file', f)
    
    
    if (conversationId) form.append('conversationId', conversationId)
    fetch('/api/design/referencias', { method: 'POST', body: form })
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as { ok?: boolean; referencia?: { id: string; titulo: string }; error?: string } | null
        if (r.ok && j?.ok && j.referencia) {
          setReferencias((prev) => [j.referencia!, ...prev].slice(0, 5))
          send(`Enviei uma foto de referência: ${j.referencia.titulo}`)
        } else {
          setErroPalco(j?.error || 'Não consegui subir essa foto de referência. Tenta de novo, ou com um arquivo menor?')
        }
      })
      .catch(() => setErroPalco('Falha de conexão ao subir a foto de referência. Tenta de novo?'))
  }, [send, conversationId])

  
  const abrirDirecao = useCallback(() => {
    setDirecaoOpen(true)
    fetch('/api/design/direcao')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; direcao?: DirecaoArte } | null) => {
        if (j?.direcao) setDirecao(j.direcao)
      })
      .catch(() => {})
  }, [])

  
  useEffect(() => {
    if (!direcaoOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDirecaoOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [direcaoOpen])

  
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
    estudio = <DesignEmptyState variant="no-agent" agentName={agentName} />
  } else if (criativos.length === 0 && !streaming) {
    estudio = <DesignEmptyState variant="welcome" agentName={agentName} />
  } else {
    estudio = (
      <DesignCanvas
        criativos={criativos}
        focoId={focoId}
        revelando={streaming || gerandoId !== null}
        onFocar={setFocoId}
        onFinalizar={onFinalizar}
        finalizandoId={finalizandoId}
        onRevisar={onRevisar}
        onArquivar={onArquivar}
        onLancar={onLancar}
        lancandoArtifactId={lancandoArtifactId}
        onAbrir={setArteAberta}
        referencias={referencias}
        onPreencherBrief={onPreencherBrief}
        onGerar={onGerar}
        onPickReferencia={onPickReferencia}
        edicao={edicaoDaArte}
      />
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
      <DesignTopbar
        agentName={agentName}
        brandName={brandName}
        onDirecao={abrirDirecao}
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
          {}
          {lancamentoAviso && (
            <div
              role="status"
              onClick={() => setLancamentoAviso(null)}
              style={{
                margin: '12px 12px 0', padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: 12.5, lineHeight: 1.5,
                color: lancamentoAviso.tom === 'erro' ? 'var(--reject)' : 'var(--text-secondary)',
                border: `1px solid ${lancamentoAviso.tom === 'erro' ? 'color-mix(in srgb, var(--reject) 35%, transparent)' : 'var(--border-hairline)'}`,
                background: lancamentoAviso.tom === 'erro' ? 'color-mix(in srgb, var(--reject) 10%, transparent)' : 'var(--surface-elevated)',
              }}
            >
              {lancamentoAviso.texto}
            </div>
          )}
          {estudio}
        </div>

        {lancarPara && (
          <ConjuntoPicker
            conjuntos={conjuntos}
            loading={conjuntosLoading}
            onEscolher={onEscolherConjunto}
            onFechar={() => setLancarPara(null)}
          />
        )}

        {}
        <ArtifactLightbox
          artifacts={artesAbriveis(criativos)}
          openId={arteAberta}
          onOpenChange={setArteAberta}
        />

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
            {referencias.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <ReferenciaTray referencias={referencias} />
              </div>
            )}

            {}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={onReferencia}
            />

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
              <button
                type="button"
                onClick={onPickReferencia}
                aria-label="Enviar foto de referência"
                title="Enviar foto de referência (PNG, JPG ou WebP)"
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
      <AnimatePresence>
        {direcaoOpen && (
          <>
            <motion.div
              key="direcao-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              onClick={() => setDirecaoOpen(false)}
              aria-hidden
              style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.45)', zIndex: 50 }}
            />
            <motion.aside
              key="direcao-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Direção de arte"
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
                  Direção de arte{brandName ? ` · ${brandName}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setDirecaoOpen(false)}
                  aria-label="Fechar a Direção de arte"
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
                <DirecaoArteCard
                  direcao={direcao}
                  onRemoverAprendizado={isDono ? onRemoverAprendizado : undefined}
                  edicao={isDono ? edicaoDaFicha : undefined}
                />
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
