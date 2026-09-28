'use client'



import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { bus } from '@/mock/bus'
import type { CrewMember } from '@/data/crew'
import { canonicalSlug } from '@/lib/brain-nav'
import { cn } from '@/lib/cn'
import { useReducedMotion } from '@/lib/motion'
import { CrewCard } from '@/components/cards/CrewCard'
import { Skeleton } from '@/components/ui/Skeleton'


const MARQUEE_PX_POR_SEG = 32


const MIN_PARA_GIRAR = 4

function CardSkeleton() {
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--surface-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)',
        padding: '12px 14px',
        width: 264,
        flex: '0 0 auto',
      }}
    >
      <Skeleton width={48} height={48} radius={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton height={13} width="55%" />
        <Skeleton height={10} width="40%" />
        <Skeleton height={11} width="80%" />
      </div>
    </div>
  )
}

export interface CrewRowProps {
  seed: CrewMember[]
  empty?: boolean
  loading?: boolean
  offline?: boolean
}

export function CrewRow({ seed, empty = false, loading = false, offline = false }: CrewRowProps) {
  const reducedMotion = useReducedMotion()

  
  const nowRef = useRef<number>(0)
  if (nowRef.current === 0) nowRef.current = Date.now()
  const now = nowRef.current

  const [members, setMembers] = useState<CrewMember[]>(seed)
  const [pulsingSlugs, setPulsingSlugs] = useState<Set<string>>(new Set())
  const pulseTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  
  
  const containerRef = useRef<HTMLDivElement | null>(null)
  const groupRef = useRef<HTMLDivElement | null>(null)
  const [transborda, setTransborda] = useState(false)
  const [durSeg, setDurSeg] = useState(40)

  useEffect(() => {
    if (loading || offline) return

    const off = bus.on('live', (e) => {
      const slug = e.agent ? canonicalSlug(e.agent) : null
      if (!slug) return 

      setMembers((prev) => {
        const idx = prev.findIndex((m) => m.slug === slug)
        
        
        if (idx === -1) return prev
        return prev.map((m, i) =>
          i === idx
            ? {
                ...m,
                status: 'active' as const,
                lastEvent: { label: e.label, at: e.at, type: e.type },
                outputToday: m.outputToday + 1,
              }
            : m,
        )
      })

      setPulsingSlugs((prev) => new Set(prev).add(slug))
      const existing = pulseTimersRef.current.get(slug)
      if (existing !== undefined) clearTimeout(existing)
      const timer = setTimeout(() => {
        setPulsingSlugs((prev) => {
          const next = new Set(prev)
          next.delete(slug)
          return next
        })
        pulseTimersRef.current.delete(slug)
      }, 1000)
      pulseTimersRef.current.set(slug, timer)
    })

    return () => {
      off()
      for (const timer of pulseTimersRef.current.values()) clearTimeout(timer)
      pulseTimersRef.current.clear()
    }
  }, [loading, offline])

  
  useEffect(() => {
    const container = containerRef.current
    const group = groupRef.current
    if (!container || !group || typeof ResizeObserver === 'undefined') return
    const medir = () => {
      const larguraGrupo = group.scrollWidth
      setTransborda(larguraGrupo > container.clientWidth + 1)
      
      setDurSeg(Math.max(20, Math.round(larguraGrupo / MARQUEE_PX_POR_SEG)))
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(container)
    ro.observe(group)
    return () => ro.disconnect()
  }, [members.length, loading])

  if (loading) {
    return (
      <div className="cc-crew" aria-label="Carregando equipe" aria-busy="true">
        <div className="cc-crew-track">
          <div className="cc-crew-group">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  
  
  
  const marquee = members.length >= MIN_PARA_GIRAR && transborda && !reducedMotion && !offline

  return (
    <div>
      <div
        ref={containerRef}
        className={cn('cc-crew', marquee && 'cc-crew--marquee')}
        aria-label="Sua equipe"
        style={marquee ? ({ '--cc-marquee-dur': `${durSeg}s` } as React.CSSProperties) : undefined}
      >
        <div className="cc-crew-track">
          <div ref={groupRef} className="cc-crew-group">
            <AnimatePresence>
              {members.map((m) => (
                <motion.div
                  key={m.slug}
                  initial={{ opacity: 0, scale: 0.96, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 6 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{ flex: '0 0 auto' }}
                >
                  <CrewCard member={m} now={now} pulsing={pulsingSlugs.has(m.slug)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {}
          {marquee && (
            <div className="cc-crew-group" aria-hidden>
              {members.map((m) => (
                <CrewCard
                  key={`loop-${m.slug}`}
                  member={m}
                  now={now}
                  pulsing={pulsingSlugs.has(m.slug)}
                  tabIndex={-1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {empty && (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          A empresa está começando — fale com o assistente e a equipe cresce
          conforme os agentes entram em ação.
        </p>
      )}
    </div>
  )
}
