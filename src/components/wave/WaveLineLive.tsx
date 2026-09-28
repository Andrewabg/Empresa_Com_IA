'use client'

import { useEffect, useMemo, useRef } from 'react'
import { bus } from '@/mock/bus'
import { useReducedMotion } from '@/lib/motion'
import { waveAvatarParams, waveAvatarPath } from '@/lib/avatar/waveAvatar'
import { HERO_WAVE, HERO_WAVE_ID, heroBreath, heroWaveAmplitude } from '@/lib/avatar/waveLine'

interface WaveLineLiveProps {
  
  offline?: boolean
  
  height?: number
}


export function WaveLineLive({ offline = false, height = 56 }: WaveLineLiveProps) {
  const reducedMotion = useReducedMotion()
  const pathRef = useRef<SVGPathElement | null>(null)
  
  const lastPulseRef = useRef<number | null>(null)
  const params = useMemo(() => waveAvatarParams(HERO_WAVE_ID), [])
  
  const d0 = useMemo(
    () => waveAvatarPath(params, { ...HERO_WAVE, t: 0, amplitude: heroBreath(0) }),
    [params],
  )

  const alive = !offline && !reducedMotion

  useEffect(() => {
    if (!alive) return
    const off = bus.on('live', () => {
      lastPulseRef.current = performance.now()
    })
    return off
  }, [alive])

  useEffect(() => {
    if (!alive) {
      pathRef.current?.setAttribute('d', d0)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      const t = (now - t0) / 1000
      const since = lastPulseRef.current === null ? null : now - lastPulseRef.current
      const d = waveAvatarPath(params, {
        ...HERO_WAVE,
        t,
        amplitude: heroWaveAmplitude(t, since),
      })
      pathRef.current?.setAttribute('d', d)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [alive, params, d0])

  return (
    <div aria-hidden style={{ width: '100%', height, overflow: 'hidden' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${HERO_WAVE.width} ${HERO_WAVE.height}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="awave-heroline-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--wave-from)" />
            <stop offset="1" stopColor="var(--wave-to)" />
          </linearGradient>
        </defs>
        <path
          ref={pathRef}
          d={d0}
          fill="none"
          stroke={offline ? 'var(--text-tertiary)' : 'url(#awave-heroline-grad)'}
          strokeWidth={1.6}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={
            offline
              ? { opacity: 0.5 }
              : { filter: 'drop-shadow(0 0 6px rgb(40 224 200 / 0.28))' }
          }
        />
      </svg>
    </div>
  )
}
