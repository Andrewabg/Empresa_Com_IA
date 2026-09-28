'use client'

import { useEffect, useId, useMemo, useRef } from 'react'
import { bus } from '@/mock/bus'
import { canonicalSlug } from '@/lib/brain-nav'
import { useReducedMotion } from '@/lib/motion'
import { waveAvatarParams, waveAvatarPath } from '@/lib/avatar/waveAvatar'
import { heroWaveAmplitude, heroBreath } from '@/lib/avatar/waveLine'
import { waveAreaPath } from '@/lib/avatar/orbArea'

interface AgentWaveOrbProps {
  agentId: string
  
  size?: number
  
  lit: boolean
}


const POINTS = 84


export function AgentWaveOrb({ agentId, size = 220, lit }: AgentWaveOrbProps) {
  const reducedMotion = useReducedMotion()
  const rawId = useId().replace(/:/g, '')
  const strokeGradId = `awave-orb-stroke-${rawId}`
  const fillGradId = `awave-orb-fill-${rawId}`

  const params = useMemo(() => waveAvatarParams(agentId), [agentId])
  const strokeRef = useRef<SVGPathElement | null>(null)
  const areaRef = useRef<SVGPathElement | null>(null)
  const lastPulseRef = useRef<number | null>(null)

  
  const d0stroke = useMemo(
    () => waveAvatarPath(params, { width: size, height: size, points: POINTS, t: 0, amplitude: heroBreath(0) }),
    [params, size],
  )
  const d0area = useMemo(() => waveAreaPath(d0stroke, size, size), [d0stroke, size])

  
  
  const alive = lit && !reducedMotion

  useEffect(() => {
    if (!alive) return
    const canon = canonicalSlug(agentId)
    const off = bus.on('live', (e) => {
      if (e.agent && canonicalSlug(e.agent) === canon) lastPulseRef.current = performance.now()
    })
    return off
  }, [alive, agentId])

  useEffect(() => {
    if (!alive) {
      strokeRef.current?.setAttribute('d', d0stroke)
      areaRef.current?.setAttribute('d', d0area)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      const t = (now - t0) / 1000
      const since = lastPulseRef.current === null ? null : now - lastPulseRef.current
      const amp = heroWaveAmplitude(t, since)
      const stroke = waveAvatarPath(params, { width: size, height: size, points: POINTS, t, amplitude: amp })
      strokeRef.current?.setAttribute('d', stroke)
      areaRef.current?.setAttribute('d', waveAreaPath(stroke, size, size))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [alive, params, size, d0stroke, d0area])

  return (
    <div aria-hidden style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {}
      <div
        style={{
          position: 'absolute',
          inset: '-16%',
          borderRadius: '50%',
          background: lit
            ? 'radial-gradient(circle, rgba(40,224,200,0.20), rgba(124,92,255,0.14) 45%, transparent 70%)'
            : 'transparent',
          filter: 'blur(24px)',
          animation: alive ? 'awave-orb-breath 6s ease-in-out infinite' : undefined,
          pointerEvents: 'none',
        }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'relative', display: 'block' }}>
        <defs>
          <linearGradient id={strokeGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--wave-from)" />
            <stop offset="1" stopColor="var(--wave-to)" />
          </linearGradient>
          <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--wave-to)" stopOpacity="0.26" />
            <stop offset="1" stopColor="var(--wave-from)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {}
        <path ref={areaRef} d={d0area} fill={lit ? `url(#${fillGradId})` : 'transparent'} stroke="none" />
        {}
        <path
          ref={strokeRef}
          d={d0stroke}
          fill="none"
          stroke={lit ? `url(#${strokeGradId})` : 'var(--text-tertiary)'}
          strokeWidth={2.5}
          strokeLinecap="round"
          style={lit ? { filter: 'drop-shadow(0 0 6px rgba(40,224,200,0.35))' } : { opacity: 0.6 }}
        />
      </svg>
    </div>
  )
}
