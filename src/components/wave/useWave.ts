'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/motion'
import {
  createWaveMachine,
  type ActiveRipple,
  type PulseEvent,
  type WaveState,
} from './waveMachine'

export interface WaveSnapshot {
  state: WaveState
  amplitude: number
  ripples: ActiveRipple[]
}

export interface UseWaveResult extends WaveSnapshot {
  setListening: (amp: number) => void
  setThinking: (on?: boolean) => void
  pulse: (e: PulseEvent) => void
}


export function useWave(): UseWaveResult {
  const reducedMotion = useReducedMotion()
  const machineRef = useRef<ReturnType<typeof createWaveMachine> | null>(null)
  if (machineRef.current === null) machineRef.current = createWaveMachine()
  const machine = machineRef.current

  const [snapshot, setSnapshot] = useState<WaveSnapshot>(() => ({
    state: machine.state,
    amplitude: machine.amplitude,
    ripples: machine.activeRipples(),
  }))

  
  const prevRef = useRef<WaveSnapshot>(snapshot)

  
  const sync = useCallback(() => {
    const next: WaveSnapshot = {
      state: machine.state,
      amplitude: machine.amplitude,
      ripples: machine.activeRipples(),
    }
    const prev = prevRef.current
    const changed =
      prev.state !== next.state ||
      Math.abs(prev.amplitude - next.amplitude) > 0.01 ||
      prev.ripples.length !== next.ripples.length ||
      
      
      
      next.ripples.length > 0
    if (changed) {
      prevRef.current = next
      setSnapshot(next)
    }
  }, [machine])

  
  
  
  useEffect(() => {
    if (reducedMotion) {
      
      sync()
      return
    }
    let raf = 0
    const loop = () => {
      machine.tick(performance.now())
      sync()
      raf = requestAnimationFrame(loop)
    }
    const start = () => { if (raf === 0) raf = requestAnimationFrame(loop) }
    const stop = () => { if (raf !== 0) { cancelAnimationFrame(raf); raf = 0 } }
    const onVis = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVis)
    if (document.visibilityState === 'visible') start()
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      stop()
    }
  }, [reducedMotion, machine, sync])

  
  
  const setListening = useCallback(
    (amp: number) => {
      machine.setListening(amp)
      sync()
    },
    [machine, sync],
  )

  const setThinking = useCallback(
    (on?: boolean) => {
      machine.setThinking(on)
      sync()
    },
    [machine, sync],
  )

  const pulse = useCallback(
    (e: PulseEvent) => {
      machine.pulse(e)
      sync()
    },
    [machine, sync],
  )

  return {
    state: snapshot.state,
    amplitude: snapshot.amplitude,
    ripples: snapshot.ripples,
    setListening,
    setThinking,
    pulse,
  }
}
