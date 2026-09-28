'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/motion'
import { pseudoAmplitude } from '@/components/wave/pseudoAmplitude'
import { getAudioContextCtor, smoothLevel } from './micLevel'
import { useStreamLevel } from './useStreamLevel'


export type MicStatus = 'idle' | 'requesting' | 'live' | 'denied' | 'unsupported'

export interface UseMicLevelResult {
  
  level: number
  status: MicStatus
  start: () => void
  stop: () => void
}

interface MicLevelOptions {
  
  onLevel?: (level: number) => void
}

function micSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    !!getAudioContextCtor()
  )
}


export function useMicLevel(options: MicLevelOptions = {}): UseMicLevelResult {
  const reducedMotion = useReducedMotion() ?? false
  const onLevelRef = useRef(options.onLevel)
  onLevelRef.current = options.onLevel

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<MicStatus>('idle')
  const [simLevel, setSimLevel] = useState(0)

  
  
  
  const realLevel = useStreamLevel(stream, {
    onLevel: status === 'live' ? options.onLevel : undefined,
  })

  
  const rafRef = useRef<number | null>(null)
  const smoothRef = useRef(0)
  
  const genRef = useRef(0)

  const emitSim = useCallback((v: number) => {
    setSimLevel(v)
    onLevelRef.current?.(v)
  }, [])

  
  const cancelSim = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    smoothRef.current = 0
  }, [])

  
  const runSimLoop = useCallback(
    (gen: number) => {
      const t0 = performance.now()
      const seed = Math.random() * 10
      const loop = () => {
        if (gen !== genRef.current) return
        const t = (performance.now() - t0) / 1000
        const base = pseudoAmplitude(t, seed)
        const jitter = (Math.random() - 0.5) * 0.06
        const target = Math.max(0, Math.min(1, base + jitter))
        smoothRef.current = smoothLevel(smoothRef.current, target, 0.25)
        emitSim(smoothRef.current)
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    },
    [emitSim],
  )

  
  const fallbackToSim = useCallback(
    (why: 'denied' | 'unsupported', gen: number) => {
      if (gen !== genRef.current) return
      setStatus(why)
      if (reducedMotion) {
        emitSim(0.55)
        return
      }
      runSimLoop(gen)
    },
    [emitSim, reducedMotion, runSimLoop],
  )

  const start = useCallback(() => {
    
    genRef.current += 1
    const gen = genRef.current
    cancelSim()

    if (!micSupported()) {
      fallbackToSim('unsupported', gen)
      return
    }

    setStatus('requesting')
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        
        if (gen !== genRef.current) {
          for (const track of s.getTracks()) track.stop()
          return
        }
        
        
        setStream(s)
        setStatus('live')
      })
      .catch(() => {
        
        fallbackToSim('denied', gen)
      })
  }, [cancelSim, fallbackToSim])

  const stop = useCallback(() => {
    genRef.current += 1 
    cancelSim()
    
    setStream((s) => {
      if (s) for (const track of s.getTracks()) track.stop()
      return null
    })
    setStatus('idle')
    setSimLevel(0)
    onLevelRef.current?.(0)
  }, [cancelSim])

  
  useEffect(() => {
    return () => {
      genRef.current += 1
      cancelSim()
      setStream((s) => {
        if (s) for (const track of s.getTracks()) track.stop()
        return null
      })
    }
  }, [cancelSim])

  const level = status === 'live' ? realLevel : simLevel
  return { level, status, start, stop }
}
