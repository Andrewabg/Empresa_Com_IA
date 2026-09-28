'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { Wave } from '@/components/wave/Wave'
import { useWave } from '@/components/wave/useWave'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import type { MarketingSeedCard } from '@/lib/marketing-store'

export interface LojaHeroProps {
  
  cards: MarketingSeedCard[]
  installedSet: Set<string>
  
  onAvatarClick: (cardId: string) => void
}


export function LojaHero({ cards, installedSet, onAvatarClick }: LojaHeroProps) {
  const wave = useWave()
  const reducedMotion = useReducedMotion()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const total = cards.length
  const hired = cards.filter((c) => installedSet.has(c.id)).length
  const pct = total > 0 ? (hired / total) * 100 : 0

  
  const prevHiredRef = useRef(hired)
  const pulse = wave.pulse 
  useEffect(() => {
    if (hired > prevHiredRef.current) {
      pulse({ id: `hire-${hired}`, t: performance.now() })
    }
    prevHiredRef.current = hired
  }, [hired, pulse])

  
  
  
  const enter = (delay: number) => ({
    initial: reducedMotion ? (false as const) : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: reducedMotion ? { duration: 0 } : { duration: 0.5, delay },
  })

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <Wave
          scale="hero"
          state={wave.state}
          amplitude={wave.amplitude}
          ripples={wave.ripples}
          aria-label="Onda da Awave"
        />
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 75% 65% at 50% 45%, transparent 40%, var(--bg-base) 100%)',
        }}
      />

      {}
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(480px, 100%), 1fr))',
          alignItems: 'center',
          columnGap: 'clamp(32px, 4vw, 72px)',
          rowGap: 24,
          padding: 'clamp(24px, 3.5vh, 44px) 0 clamp(20px, 3vh, 36px)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <motion.p
            {...enter(0)}
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Sua empresa 24h
          </motion.p>

          <motion.h1
            {...enter(0.05)}
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(34px, 3.2vw, 54px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: 'var(--text-primary)',
              maxWidth: 640,
            }}
          >
            Monte sua empresa que trabalha 24h
          </motion.h1>

          <motion.p
            {...enter(0.1)}
            style={{
              margin: 0,
              fontSize: 14.5,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
              maxWidth: 520,
            }}
          >
            Especialistas prontos: contrate em 1 clique, converse a qualquer hora — eles
            aprendem com a sua empresa. Escolha a quem cada um responde.
          </motion.p>
        </div>

        {total === 0 ? (
          <EmptyCatalog />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            {}
            {}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: -4, padding: 4 }}>
              {cards.map((c, i) => (
                <motion.button
                  key={c.id}
                  type="button"
                  title={`${c.name} — ${c.role}`}
                  aria-label={`${c.name} — ${c.role}`}
                  onClick={() => onAvatarClick(c.id)}
                  onMouseEnter={() => setHoveredId(c.id)}
                  onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                  onFocus={(e) => {
                    
                    
                    try {
                      if (e.currentTarget.matches(':focus-visible')) setHoveredId(c.id)
                    } catch {
                      setHoveredId(c.id)
                    }
                  }}
                  onBlur={() => setHoveredId((h) => (h === c.id ? null : h))}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.15 + i * 0.04 }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    borderRadius: 12,
                  }}
                >
                  <AgentWaveAvatar
                    agentId={c.id}
                    size={48}
                    lit={installedSet.has(c.id)}
                    active={hoveredId === c.id}
                  />
                </motion.button>
              ))}
            </div>

            {}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{hired}</strong>{' '}
                de {total} no seu time
              </span>
              <div
                aria-hidden
                style={{
                  height: 2,
                  borderRadius: 99,
                  background: 'var(--border-hairline)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 99,
                    background: 'linear-gradient(90deg, var(--wave-from), var(--wave-to))',
                    transition: 'width 600ms ease',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}


function EmptyCatalog() {
  return (
    <div
      style={{
        marginTop: 12,
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface)',
        padding: 'clamp(24px, 4vw, 40px)',
        maxWidth: 560,
      }}
    >
      <div aria-hidden style={{ opacity: 0.5, marginBottom: 16 }}>
        <Wave scale="inline" state="idle" amplitude={0} ripples={[]} aria-label="Onda" />
      </div>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
        Catálogo indisponível no momento
      </p>
      <p
        style={{
          margin: '10px 0 0',
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--text-secondary)',
        }}
      >
        Conecte sua licença em{' '}
        <Link href="/config" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>
          Configurações
        </Link>{' '}
        para receber os cargos prontos da Loja. Se já está conectado, o catálogo é sincronizado
        em instantes — recarregue daqui a pouco.
      </p>
    </div>
  )
}
