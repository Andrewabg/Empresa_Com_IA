'use client'

import { memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/motion'
import { waveAvatarParams, waveAvatarPath } from '@/lib/avatar/waveAvatar'

const GEOMETRY: Record<32 | 48 | 64 | 96, { points: number; stroke: number; radius: number }> = {
  32: { points: 32, stroke: 1.25, radius: 9 },
  48: { points: 40, stroke: 1.5, radius: 12 },
  64: { points: 56, stroke: 1.75, radius: 14 },
  96: { points: 72, stroke: 2, radius: 18 },
}

export interface AgentWaveAvatarProps {
  agentId: string
  size: 32 | 48 | 64 | 96
  
  lit: boolean
  
  active?: boolean
}


function AgentWaveAvatarInner({ agentId, size, lit, active = false }: AgentWaveAvatarProps) {
  const reducedMotion = useReducedMotion()
  
  const activeRef = useRef(active)
  activeRef.current = active
  
  const gradId = 'awave-avatar-grad-' + useId().replace(/:/g, '')
  const params = useMemo(() => waveAvatarParams(agentId), [agentId])
  const geom = GEOMETRY[size]

  const dimPathRef = useRef<SVGPathElement | null>(null)
  const litPathRef = useRef<SVGPathElement | null>(null)
  const containerRef = useRef<HTMLSpanElement | null>(null)
  const [visible, setVisible] = useState(false)

  const d0 = useMemo(
    () => waveAvatarPath(params, { width: size, height: size, points: geom.points, t: 0 }),
    [params, size, geom.points],
  )

  
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const animating = !reducedMotion && visible && (lit || active)

  useEffect(() => {
    if (!animating) {
      
      dimPathRef.current?.setAttribute('d', d0)
      litPathRef.current?.setAttribute('d', d0)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      const t = (now - t0) / 1000
      
      const isActive = activeRef.current
      const breath = 0.75 + 0.25 * Math.sin(t * 2 * Math.PI * 0.1)
      const amplitude = (isActive ? 1.2 : 1) * breath
      const d = waveAvatarPath(params, {
        width: size,
        height: size,
        points: geom.points,
        t: t * (isActive ? 1.6 : 1),
        amplitude,
      })
      dimPathRef.current?.setAttribute('d', d)
      litPathRef.current?.setAttribute('d', d)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [animating, params, size, geom.points, d0])

  return (
    <span
      ref={containerRef}
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-grid',
        placeItems: 'center',
        borderRadius: geom.radius,
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        boxShadow: lit ? '0 0 18px rgb(124 92 255 / 0.16)' : 'none',
        transition: 'box-shadow 600ms ease',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--wave-from)" />
            <stop offset="1" stopColor="var(--wave-to)" />
          </linearGradient>
        </defs>
        {}
        <path
          ref={dimPathRef}
          d={d0}
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth={geom.stroke}
          strokeLinecap="round"
          style={{ opacity: lit ? 0 : 0.7, transition: 'opacity 600ms ease' }}
        />
        {}
        <path
          ref={litPathRef}
          d={d0}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={geom.stroke}
          strokeLinecap="round"
          style={{
            opacity: lit ? 1 : 0,
            transition: 'opacity 600ms ease',
            filter: 'drop-shadow(0 0 4px rgb(40 224 200 / 0.35))',
          }}
        />
      </svg>
    </span>
  )
}


export const AgentWaveAvatar = memo(AgentWaveAvatarInner)
