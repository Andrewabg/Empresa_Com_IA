'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import {
  bargeInEvents,
  parseRealtimeEvent,
  pttReducer,
  usageToCostPayload,
  type PttState,
} from './voiceProtocol'
import { cadenciaDaInvestigacao, CADENCIA_VAZIA, type EstadoDaCadencia } from '@/lib/voz/cadenciaDaInvestigacao'
import type { FerramentaEmCurso } from '@/server/agent/wireTypes'
import { avancarFio, FIO_VAZIO, type FioDaVoz, type LadoDaFala } from '@/lib/voz/fioDaVoz'
import { pedirMicrofoneComPrazo } from '@/lib/voz/prazoDoMicrofone'
import { instrucaoParaDizer } from '@/lib/voz/instrucaoDeFala'
import { decidirCorte, aprenderRitmo, ritmoEmCps, RITMO_VAZIO, type RitmoDaFala } from '@/lib/voz/trechoOuvido'
import type { EstadoDaVoz } from '@/lib/voz/tentarDeNovo'
import { podeDerrubarSessao } from '@/lib/voz/quedaDaSessao'
import { proximaOrdem } from '@/lib/conversa/ordem'

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls'


export type VoiceStatus = EstadoDaVoz

export interface VoiceState {
  status: VoiceStatus
  
  audioBloqueado?: boolean
  
  ptt: PttState['phase']
  
  errorMessage?: string
}

export interface UseRealtimeVoiceArgs {
  
  enviarTexto?: (texto: string, meta?: { porVoz?: boolean }) => boolean
  
  textoEmCurso?: string
  
  turnoAtivo?: boolean
  
  conversationId: string | null
  
  agentId: string
  
  onConversationId?: (conversationId: string) => void
  
  onNeedsConfig?: () => void
}

export interface UseRealtimeVoiceResult {
  state: VoiceState
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  
  audioRef: React.RefObject<HTMLAudioElement | null>
  press: () => void
  release: () => void
  
  falar: (texto: string) => boolean
  
  aoUsarFerramenta: (f: FerramentaEmCurso) => void
  
  aoPersistirMensagem: (id: string) => void
  
  falarProximaResposta: () => void
  
  connect: () => Promise<void>
  disconnect: () => void
}


type ClientEvent =
  | { type: 'response.cancel' }
  | { type: 'output_audio_buffer.clear' }
  | { type: 'input_audio_buffer.clear' }
  | { type: 'input_audio_buffer.commit' }
  
  
  
  | { type: 'response.create'; response: { input: never[]; instructions: string } }


export function useRealtimeVoice(args: UseRealtimeVoiceArgs): UseRealtimeVoiceResult {
  const [state, setState] = useState<VoiceState>({ status: 'idle', ptt: 'idle' })
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const micTrackRef = useRef<MediaStreamTrack | null>(null)
  const modelRef = useRef<string>('gpt-realtime')
  
  const pttRef = useRef<PttState>({ phase: 'idle' })
  
  
  
  
  
  const responseActiveRef = useRef(false)
  const audioPlayingRef = useRef(false)
  
  
  
  
  
  
  const fioRef = useRef<FioDaVoz>(FIO_VAZIO)
  
  
  
  
  
  
  const genRef = useRef(0)
  
  
  
  
  
  const pendingToolRef = useRef(false)
  
  const reportedRef = useRef<Set<string>>(new Set())
  
  
  
  
  
  
  const idleTimerRef = useRef<number | null>(null)
  
  const falaPendenteRef = useRef<string | null>(null)
  
  const argsRef = useRef(args)
  argsRef.current = args

  const setStatus = useCallback((status: VoiceStatus, errorMessage?: string) => {
    setState((s) => ({ ...s, status, ...(errorMessage ? { errorMessage } : { errorMessage: undefined }) }))
  }, [])

  const setPttPhase = useCallback((phase: PttState['phase']) => {
    setState((s) => (s.ptt === phase ? s : { ...s, ptt: phase }))
  }, [])

  
  const dispatchPtt = useCallback(
    (ev: Parameters<typeof pttReducer>[1]): PttState => {
      const next = pttReducer(pttRef.current, ev)
      pttRef.current = next
      setPttPhase(next.phase)
      return next
    },
    [setPttPhase],
  )

  
  const tentarTocar = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    const p = el.play()
    if (!p || typeof p.catch !== 'function') return
    void p
      .then(() => setState((st) => (st.audioBloqueado ? { ...st, audioBloqueado: false } : st)))
      .catch(() => setState((st) => (st.audioBloqueado ? st : { ...st, audioBloqueado: true })))
  }, [])

  
  const safeSend = useCallback((event: ClientEvent): boolean => {
    const dc = dcRef.current
    if (!dc || dc.readyState !== 'open') return false
    dc.send(JSON.stringify(event))
    return true
  }, [])

  
  
  
  const disconnectRef = useRef<() => void>(() => {})
  const connectRef = useRef<() => void | Promise<void>>(() => {})
  
  const haFalaDevida = useCallback(
    () => turnoDaVozRef.current || falaPendenteRef.current !== null,
    [],
  )
  const clearIdle = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])
  
  const bumpIdle = useCallback(() => {
    clearIdle()
    if (!pcRef.current) return
    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = null
      
      
      
      
      
      if (podeDerrubarSessao({ fase: pttRef.current.phase, haFalaDevida: haFalaDevida() })) {
        disconnectRef.current()
      }
    }, 90_000)
  }, [clearIdle])

  
  
  
  
  
  const ensuringRef = useRef<Promise<string | null> | null>(null)
  const ensureConversationId = useCallback((): Promise<string | null> => {
    const existing = argsRef.current.conversationId
    if (existing) return Promise.resolve(existing)
    if (ensuringRef.current) return ensuringRef.current
    const p = (async (): Promise<string | null> => {
      try {
        const res = await fetch('/api/voice/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: argsRef.current.agentId }),
        })
        if (!res.ok) {
          ensuringRef.current = null 
          return null
        }
        const data = (await res.json()) as { conversationId?: string }
        const id = typeof data.conversationId === 'string' ? data.conversationId : null
        if (id) argsRef.current.onConversationId?.(id)
        else ensuringRef.current = null
        return id
      } catch {
        ensuringRef.current = null
        return null
      }
    })()
    ensuringRef.current = p
    return p
  }, [])

  const emitirFala = useCallback(
    (fala: { lado: LadoDaFala; texto: string; ordem: number }) => {
      if (fala.lado === 'assistente') return
      const texto = fala.texto.trim()
      if (!texto) return
      
      
      turnoDaVozRef.current = true
      
      geracaoDoTurnoRef.current += 1
      argsRef.current.enviarTexto?.(texto, { porVoz: true })
    },
    [],
  )

  
  const falar = useCallback((texto: string) => {
    const instructions = instrucaoParaDizer(texto)
    if (!instructions) return false
    return safeSend({ type: 'response.create', response: { input: [], instructions } })
  }, [safeSend])

  
  const cadenciaRef = useRef<EstadoDaCadencia>(CADENCIA_VAZIA)
  const geracaoDoTurnoRef = useRef(0)
  const aoUsarFerramenta = useCallback((f: FerramentaEmCurso) => {
    if (!turnoDaVozRef.current) return
    const turno = `${argsRef.current.agentId}|${geracaoDoTurnoRef.current}`
    const passo = cadenciaDaInvestigacao(cadenciaRef.current, f, turno, Date.now())
    cadenciaRef.current = passo.estado
    if (passo.frase) {
      
      
      falaEmCursoRef.current = ''
      falar(passo.frase)
    }
  }, [falar])

  
  const falaEmCursoRef = useRef('')
  const audioComecouEmRef = useRef<number | null>(null)
  
  const ritmoRef = useRef<RitmoDaFala>(RITMO_VAZIO)
  
  const mensagemIdRef = useRef<string | null>(null)
  const aoPersistirMensagem = useCallback((id: string) => { mensagemIdRef.current = id }, [])

  
  const cortarNoOuvido = useCallback(() => {
    const comecou = audioComecouEmRef.current
    if (comecou === null) return
    const corte = decidirCorte({
      texto: falaEmCursoRef.current,
      messageId: mensagemIdRef.current,
      msOuvidos: performance.now() - comecou,
      cps: ritmoEmCps(ritmoRef.current),
    })
    if (!corte) return
    void fetch('/api/voz/interrompido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corte),
    }).catch(() => {  })
  }, [])

  
  const turnoDaVozRef = useRef(false)
  const ultimaRespostaRef = useRef('')
  const textoEmCurso = args.textoEmCurso ?? ''
  const turnoAtivo = args.turnoAtivo ?? false
  useEffect(() => {
    if (textoEmCurso) ultimaRespostaRef.current = textoEmCurso
    if (turnoAtivo) return
    
    
    
    const texto = ultimaRespostaRef.current.trim()
    if (!texto || !turnoDaVozRef.current) { ultimaRespostaRef.current = ''; return }
    
    ultimaRespostaRef.current = ''
    turnoDaVozRef.current = false
    
    falaEmCursoRef.current = texto
    if (!falar(texto)) {
      
      
      falaPendenteRef.current = texto
      void connectRef.current()
    }
  }, [textoEmCurso, turnoAtivo, falar])

  
  const avancar = useCallback(
    (ev: Parameters<typeof avancarFio>[1]) => {
      const passo = avancarFio(fioRef.current, ev)
      fioRef.current = passo.estado
      for (const fala of passo.emitir) emitirFala(fala)
    },
    [emitirFala],
  )

  
  const reportCost = useCallback((usage: import('@/server/cost/pricing').RealtimeUsage, model: string) => {
    void fetch('/api/voice/cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      
      body: JSON.stringify({ ...usageToCostPayload(usage, model), conversationId: argsRef.current.conversationId ?? undefined }),
    }).catch(() => {
      
    })
  }, [])

  
  const handleMessage = useCallback(
    (raw: string, gen: number) => {
      if (gen !== genRef.current) return
      const action = parseRealtimeEvent(raw)
      switch (action.kind) {
        case 'toolCall':
          
          
          
          console.warn('[useRealtimeVoice] a sessão pediu ferramenta, e ela não deveria ter nenhuma:', action.name)
          break
        case 'userCommitted':
          
          
          avancar({ tipo: 'abriu', lado: 'usuario', id: action.itemId, ordem: proximaOrdem() })
          break
        case 'userTranscript':
          avancar({
            tipo: 'transcreveu',
            lado: 'usuario',
            id: action.itemId,
            texto: action.text,
            ordemReserva: proximaOrdem(),
          })
          break
        case 'userTranscriptFailed':
          
          
          avancar({ tipo: 'abandonou', lado: 'usuario', id: action.itemId })
          break
        case 'assistantDelta':
          
          break
        case 'assistantTranscript':
          avancar({
            tipo: 'transcreveu',
            lado: 'assistente',
            id: action.responseId,
            texto: action.text,
            ordemReserva: proximaOrdem(),
          })
          break
        case 'assistantStarted':
          
          
          
          responseActiveRef.current = true 
          pendingToolRef.current = false
          
          
          avancar({ tipo: 'abriu', lado: 'assistente', id: action.responseId, ordem: proximaOrdem() })
          dispatchPtt({ type: 'assistantStarted' })
          break
        case 'audioStarted':
          
          
          audioPlayingRef.current = true
          
          
          
          
          
          
          
          
          if (audioComecouEmRef.current === null) audioComecouEmRef.current = performance.now()
          
          
          if (audioRef.current?.paused) tentarTocar()
          break
        case 'audioStopped':
          
          
          audioPlayingRef.current = false
          
          
          
          
          
          if (!responseActiveRef.current) {
            
            
            
            if (falaEmCursoRef.current && audioComecouEmRef.current !== null) {
              ritmoRef.current = aprenderRitmo(
                ritmoRef.current,
                falaEmCursoRef.current.length,
                performance.now() - audioComecouEmRef.current,
              )
              falaEmCursoRef.current = ''
            }
            audioComecouEmRef.current = null
          }
          break
        case 'responseDone': {
          
          
          
          
          responseActiveRef.current = false 
          
          
          
          
          if (action.responseId) {
            avancar({ tipo: 'abandonou', lado: 'assistente', id: action.responseId })
          }
          if (!pendingToolRef.current) {
            dispatchPtt({ type: 'assistantDone' })
          }
          if (action.usage && (!action.responseId || !reportedRef.current.has(action.responseId))) {
            if (action.responseId) reportedRef.current.add(action.responseId)
            reportCost(action.usage, modelRef.current)
          }
          
          
          
          if (!pendingToolRef.current) bumpIdle()
          break
        }
        case 'error':
          
          
          responseActiveRef.current = false
          audioPlayingRef.current = false
          pendingToolRef.current = false
          dispatchPtt({ type: 'assistantDone' })
          setStatus('error', action.message)
          break
        case 'ignore':
        default:
          break
      }
    },
    [dispatchPtt, avancar, reportCost, setStatus, bumpIdle, tentarTocar],
  )

  
  const teardown = useCallback(() => {
    genRef.current += 1
    clearIdle()
    const dc = dcRef.current
    if (dc) {
      try {
        dc.close()
      } catch {
        
      }
      dcRef.current = null
    }
    const pc = pcRef.current
    if (pc) {
      try {
        pc.getSenders().forEach((s) => s.track?.stop())
      } catch {
        
      }
      try {
        pc.close()
      } catch {
        
      }
      pcRef.current = null
    }
    const ls = localStreamRef.current
    if (ls) {
      for (const t of ls.getTracks()) t.stop()
      localStreamRef.current = null
    }
    micTrackRef.current = null
    if (audioRef.current) audioRef.current.srcObject = null
    setLocalStream(null)
    setRemoteStream(null)
    pttRef.current = { phase: 'idle' }
    fioRef.current = FIO_VAZIO
    pendingToolRef.current = false
    responseActiveRef.current = false
    audioPlayingRef.current = false
    reportedRef.current = new Set()
  }, [clearIdle])

  
  const connect = useCallback(async () => {
    
    teardown()
    const gen = genRef.current
    setState({ status: 'connecting', ptt: 'idle' })

    
    let session: {
      ephemeralKey?: string
      model?: string
      budgetExceeded?: boolean
      needsConfig?: boolean
    }
    try {
      const res = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: argsRef.current.agentId }),
      })
      if (!res.ok) {
        setStatus('error', 'Não consegui iniciar a voz agora. Tente de novo.')
        return
      }
      session = await res.json()
    } catch {
      setStatus('error', 'Não consegui iniciar a voz agora. Tente de novo.')
      return
    }
    if (gen !== genRef.current) return
    if (session.budgetExceeded) {
      setStatus('budgetExceeded')
      return
    }
    if (session.needsConfig || !session.ephemeralKey) {
      setStatus('needsConfig')
      argsRef.current.onNeedsConfig?.()
      return
    }
    modelRef.current = session.model ?? 'gpt-realtime'
    const ephemeralKey = session.ephemeralKey

    
    
    
    
    
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('micDenied')
      return
    }
    const pedido = await pedirMicrofoneComPrazo<MediaStream>({
      pedir: () => navigator.mediaDevices.getUserMedia({ audio: true }),
      esperar: (ms) => new Promise((r) => window.setTimeout(r, ms)),
    })
    if (pedido.tipo === 'recusado') {
      setStatus('micDenied')
      return
    }
    if (pedido.tipo === 'semResposta') {
      
      
      
      genRef.current += 1
      setStatus('micSemResposta')
      return
    }
    const mic = pedido.stream
    if (gen !== genRef.current) {
      for (const t of mic.getTracks()) t.stop()
      return
    }
    localStreamRef.current = mic
    setLocalStream(mic)
    const micTrack = mic.getAudioTracks()[0] ?? null
    micTrackRef.current = micTrack
    
    if (micTrack) micTrack.enabled = false

    
    let pc: RTCPeerConnection
    try {
      pc = new RTCPeerConnection()
    } catch {
      setStatus('error', 'Seu navegador não suporta a chamada de voz.')
      return
    }
    pcRef.current = pc

    pc.ontrack = (e) => {
      if (gen !== genRef.current) return
      const stream = e.streams[0] ?? new MediaStream([e.track])
      setRemoteStream(stream)
      if (audioRef.current) {
        audioRef.current.srcObject = stream
        
        
        tentarTocar()
      }
    }
    pc.onconnectionstatechange = () => {
      if (gen !== genRef.current) return
      const st = pcRef.current?.connectionState
      if (st === 'failed' || st === 'disconnected') {
        setStatus('error', 'A conexão de voz caiu. Toque para tentar de novo.')
      }
    }

    if (micTrack) pc.addTrack(micTrack, mic)

    const dc = pc.createDataChannel('oai-events')
    dcRef.current = dc
    dc.onopen = () => {
      if (gen !== genRef.current) return
      setStatus('connected')
      
      
      
      bumpIdle()
      
      
      
      
      
      const devida = falaPendenteRef.current
      if (devida) {
        falaPendenteRef.current = null
        falaEmCursoRef.current = devida
        falar(devida)
      }
    }
    dc.onmessage = (e) => handleMessage(typeof e.data === 'string' ? e.data : '', gen)

    
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      if (gen !== genRef.current) return
      const sdpRes = await fetch(CALLS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp ?? '',
      })
      if (!sdpRes.ok) {
        setStatus('error', 'Não consegui completar a conexão de voz. Tente de novo.')
        return
      }
      const answerSdp = await sdpRes.text()
      if (gen !== genRef.current) return
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    } catch {
      if (gen !== genRef.current) return
      setStatus('error', 'Não consegui completar a conexão de voz. Tente de novo.')
    }
  }, [handleMessage, safeSend, setStatus, teardown, bumpIdle, falar, tentarTocar])

  const disconnect = useCallback(() => {
    teardown()
    setStatus('idle')
  }, [teardown, setStatus])

  
  const falarProximaResposta = useCallback(() => {
    turnoDaVozRef.current = true
    geracaoDoTurnoRef.current += 1
  }, [])
  
  disconnectRef.current = disconnect
  connectRef.current = connect

  
  const press = useCallback(() => {
    
    
    
    
    if (!pcRef.current && state.status !== 'connecting') {
      void connect()
    }
    
    
    bumpIdle()
    dispatchPtt({ type: 'press' })
    
    
    
    
    
    
    
    
    if (audioPlayingRef.current) cortarNoOuvido()
    for (const ev of bargeInEvents({
      responseActive: responseActiveRef.current,
      audioPlaying: audioPlayingRef.current,
    })) {
      safeSend(ev)
    }
    
    audioPlayingRef.current = false
    falaEmCursoRef.current = ''
    audioComecouEmRef.current = null
    
    
    tentarTocar()
    
    if (micTrackRef.current) micTrackRef.current.enabled = true
    safeSend({ type: 'input_audio_buffer.clear' })
  }, [connect, dispatchPtt, safeSend, state.status, bumpIdle, cortarNoOuvido, tentarTocar])


  
  const release = useCallback(() => {
    if (pttRef.current.phase !== 'listening') return
    dispatchPtt({ type: 'release' })
    
    if (micTrackRef.current) micTrackRef.current.enabled = false
    
    
    
    
    const committed = safeSend({ type: 'input_audio_buffer.commit' })
    
    
    
    if (!committed) {
      dispatchPtt({ type: 'assistantDone' }) 
    }
  }, [dispatchPtt, safeSend])

  
  
  
  
  useEffect(() => {
    if (state.ptt !== 'committing' && state.ptt !== 'searching') return
    const t = window.setTimeout(() => {
      pendingToolRef.current = false
      dispatchPtt({ type: 'assistantDone' }) 
    }, 12000)
    return () => window.clearTimeout(t)
  }, [state.ptt, dispatchPtt])

  
  
  
  
  
  useEffect(() => {
    function onVisibility() {
      if (
        document.visibilityState === 'hidden' &&
        pcRef.current &&
        
        
        podeDerrubarSessao({ fase: pttRef.current.phase, haFalaDevida: haFalaDevida() })
      ) {
        disconnect()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [disconnect])

  
  useEffect(() => {
    return () => {
      teardown()
    }
  }, [teardown])

  return {
    state,
    localStream,
    remoteStream,
    audioRef,
    press,
    release,
    falar,
    aoUsarFerramenta,
    aoPersistirMensagem,
    falarProximaResposta,
    connect,
    disconnect,
  }
}
