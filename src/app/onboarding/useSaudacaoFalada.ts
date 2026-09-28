'use client'


import { useCallback, useEffect, useRef, useState } from 'react'
import { composeGreetingText } from '@/server/onboarding/greeting'
import { instrucaoParaDizer } from '@/lib/voz/instrucaoDeFala'
import { parseRealtimeEvent, usageToCostPayload } from '@/app/conversa/voiceProtocol'

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls'

const FOLGA_PARA_FECHAR_MS = 8_000

export type GreetingStatus = 'idle' | 'connecting' | 'speaking' | 'spoke' | 'fallback'

export interface GreetingState {
  status: GreetingStatus
  
  reason?: 'budget' | 'needsConfig' | 'error'
}

export interface GreetingProfile {
  companyName: string
  operatorName: string
  mission: string
  voiceTone: string
  
  semEmpresa?: boolean
  
  assistantName?: string
}

export interface UseSaudacaoFaladaResult {
  state: GreetingState
  remoteStream: MediaStream | null
  audioRef: React.RefObject<HTMLAudioElement | null>
  greet: (profile: GreetingProfile) => Promise<void>
  disconnect: () => void
}


type EventoDeCliente = {
  type: 'response.create'
  response: { input: []; instructions: string }
}


interface RespostaDoMint {
  ephemeralKey?: string
  model?: string
  budgetExceeded?: boolean
  needsConfig?: boolean
}

export function useSaudacaoFalada(): UseSaudacaoFaladaResult {
  const [state, setState] = useState<GreetingState>({ status: 'idle' })
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const modelRef = useRef<string>('gpt-realtime')
  
  const geracaoRef = useRef(0)
  
  const custoReportadoRef = useRef(false)
  
  const geracaoTerminouRef = useRef(false)
  
  const teardownRef = useRef<() => void>(() => {})
  const folgaRef = useRef<number | null>(null)

  const setStatus = useCallback((status: GreetingStatus, reason?: GreetingState['reason']) => {
    setState(reason ? { status, reason } : { status })
  }, [])

  
  const safeSend = useCallback((evento: EventoDeCliente): boolean => {
    const dc = dcRef.current
    if (!dc || dc.readyState !== 'open') return false
    dc.send(JSON.stringify(evento))
    return true
  }, [])

  const reportarCusto = useCallback(
    (usage: import('@/server/cost/pricing').RealtimeUsage, model: string) => {
      void fetch('/api/voice/cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usageToCostPayload(usage, model)),
      }).catch(() => {  })
    },
    [],
  )

  const teardown = useCallback(() => {
    geracaoRef.current += 1
    if (folgaRef.current !== null) { window.clearTimeout(folgaRef.current); folgaRef.current = null }
    const dc = dcRef.current
    if (dc) { try { dc.close() } catch {  } dcRef.current = null }
    const pc = pcRef.current
    if (pc) {
      try { pc.getReceivers().forEach((r) => r.track?.stop()) } catch {  }
      try { pc.close() } catch {  }
      pcRef.current = null
    }
    if (audioRef.current) audioRef.current.srcObject = null
    setRemoteStream(null)
    custoReportadoRef.current = false
    geracaoTerminouRef.current = false
  }, [])
  teardownRef.current = teardown

  const handleMessage = useCallback(
    (raw: string, geracao: number) => {
      if (geracao !== geracaoRef.current) return
      const acao = parseRealtimeEvent(raw)
      switch (acao.kind) {
        case 'responseDone': {
          
          
          
          geracaoTerminouRef.current = true
          if (acao.usage && !custoReportadoRef.current) {
            custoReportadoRef.current = true
            reportarCusto(acao.usage, modelRef.current)
          }
          if (folgaRef.current !== null) window.clearTimeout(folgaRef.current)
          folgaRef.current = window.setTimeout(() => {
            folgaRef.current = null
            setStatus('spoke')
            teardownRef.current()
          }, FOLGA_PARA_FECHAR_MS)
          break
        }
        case 'audioStopped': {
          if (!geracaoTerminouRef.current) break
          setStatus('spoke')
          teardownRef.current()
          break
        }
        case 'error':
          setStatus('fallback', 'error')
          break
        default:
          break
      }
    },
    [reportarCusto, setStatus],
  )

  const greet = useCallback(
    async (profile: GreetingProfile) => {
      teardown()
      const geracao = geracaoRef.current
      setStatus('connecting')

      
      const instructions = instrucaoParaDizer(
        composeGreetingText(
          {
            companyName: profile.companyName,
            operatorName: profile.operatorName,
            mission: profile.mission,
            voiceTone: profile.voiceTone,
          },
          profile.assistantName,
          { semEmpresa: profile.semEmpresa },
        ),
      )
      if (!instructions) { setStatus('fallback', 'error'); return }

      
      let sessao: RespostaDoMint
      try {
        const res = await fetch('/api/voice/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: 'jarvis' }),
        })
        if (!res.ok) {
          
          
          setStatus('fallback', res.status === 409 ? 'needsConfig' : 'error')
          return
        }
        sessao = (await res.json()) as RespostaDoMint
      } catch {
        setStatus('fallback', 'error')
        return
      }
      if (geracao !== geracaoRef.current) return
      if (sessao.budgetExceeded) { setStatus('fallback', 'budget'); return }
      if (sessao.needsConfig || !sessao.ephemeralKey) { setStatus('fallback', 'needsConfig'); return }
      modelRef.current = sessao.model ?? 'gpt-realtime'
      const ephemeralKey = sessao.ephemeralKey

      
      let pc: RTCPeerConnection
      try { pc = new RTCPeerConnection() } catch { setStatus('fallback', 'error'); return }
      pcRef.current = pc

      pc.ontrack = (e) => {
        if (geracao !== geracaoRef.current) return
        const stream = e.streams[0] ?? new MediaStream([e.track])
        setRemoteStream(stream)
        if (audioRef.current) {
          audioRef.current.srcObject = stream
          
          
          void audioRef.current.play().catch(() => {})
        }
      }
      pc.onconnectionstatechange = () => {
        if (geracao !== geracaoRef.current) return
        const st = pcRef.current?.connectionState
        if (st === 'failed' || st === 'disconnected') setStatus('fallback', 'error')
      }

      try {
        pc.addTransceiver('audio', { direction: 'recvonly' })
      } catch { setStatus('fallback', 'error'); return }

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onopen = () => {
        if (geracao !== geracaoRef.current) return
        setStatus('speaking')
        
        if (!safeSend({ type: 'response.create', response: { input: [], instructions } })) {
          setStatus('fallback', 'error')
        }
      }
      dc.onmessage = (e) => handleMessage(typeof e.data === 'string' ? e.data : '', geracao)

      
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        if (geracao !== geracaoRef.current) return
        const sdpRes = await fetch(CALLS_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${ephemeralKey}`, 'Content-Type': 'application/sdp' },
          body: offer.sdp ?? '',
        })
        if (!sdpRes.ok) { setStatus('fallback', 'error'); return }
        const answerSdp = await sdpRes.text()
        if (geracao !== geracaoRef.current) return
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      } catch {
        if (geracao !== geracaoRef.current) return
        setStatus('fallback', 'error')
      }
    },
    [handleMessage, safeSend, setStatus, teardown],
  )

  const disconnect = useCallback(() => {
    teardown()
    setStatus('idle')
  }, [setStatus, teardown])

  useEffect(() => () => { teardown() }, [teardown])

  return { state, remoteStream, audioRef, greet, disconnect }
}
