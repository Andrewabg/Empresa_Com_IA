'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/motion'
import { pseudoAmplitude } from './pseudoAmplitude'


export function useMicAmplitude(active: boolean, onAmp: (amp: number) => void): void {
  const reducedMotion = useReducedMotion()
  const onAmpRef = useRef(onAmp)
  onAmpRef.current = onAmp

  useEffect(() => {
    if (!active) return

    
    if (reducedMotion) {
      onAmpRef.current(0.6)
      return () => {
        onAmpRef.current(0)
      }
    }

    let raf = 0
    const t0 = performance.now()
    
    const seed = Math.random() * 10
    
    let smooth = 0

    const loop = () => {
      const t = (performance.now() - t0) / 1000
      
      const base = pseudoAmplitude(t, seed)
      const jitter = (Math.random() - 0.5) * 0.06
      const target = Math.max(0, Math.min(1, base + jitter))
      smooth += (target - smooth) * 0.25
      onAmpRef.current(smooth)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      onAmpRef.current(0)
    }
  }, [active, reducedMotion])
}
