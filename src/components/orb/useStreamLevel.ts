'use client'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/motion'
import { getAudioContextCtor, normalizeLevel, rmsFromBytes, smoothLevel } from './micLevel'


export function useStreamLevel(
  stream: MediaStream | null,
  opts: { onLevel?: (level: number) => void } = {},
): number {
  const reducedMotion = useReducedMotion() ?? false
  const [level, setLevel] = useState(0)
  const onLevelRef = useRef(opts.onLevel)
  onLevelRef.current = opts.onLevel

  useEffect(() => {
    const emit = (v: number) => {
      setLevel(v)
      onLevelRef.current?.(v)
    }
    if (!stream) {
      emit(0)
      return
    }
    const Ctor = getAudioContextCtor()
    if (!Ctor) {
      emit(0)
      return
    }
    if (reducedMotion) {
      emit(0.5) 
      return
    }
    const ctx = new Ctor()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.6
    source.connect(analyser)
    const data = new Uint8Array(new ArrayBuffer(analyser.fftSize))
    let smoothed = 0
    let raf = 0
    void ctx.resume()

    const loop = () => {
      analyser.getByteTimeDomainData(data)
      const target = normalizeLevel(rmsFromBytes(data))
      const factor = target > smoothed ? 0.45 : 0.18 
      smoothed = smoothLevel(smoothed, target, factor)
      emit(smoothed)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      try {
        source.disconnect()
      } catch {
        
      }
      ctx.close().catch(() => {})
      emit(0)
    }
  }, [stream, reducedMotion])

  return level
}
