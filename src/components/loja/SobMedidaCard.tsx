'use client'


import Link from 'next/link'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'

export function SobMedidaCard() {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.5, delay: 0.12 }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      style={{ marginBottom: 'clamp(24px, 3vw, 36px)' }}
    >
      <Link
        href="/loja/contratar"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(14px, 2vw, 22px)',
          overflow: 'hidden',
          padding: 'clamp(18px, 2.5vw, 28px) clamp(18px, 2.5vw, 30px)',
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          textDecoration: 'none',
        }}
      >
        {}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 60% 130% at 0% 50%, rgb(40 224 200 / 0.07), transparent 60%), radial-gradient(ellipse 60% 130% at 100% 50%, rgb(124 92 255 / 0.06), transparent 60%)',
          }}
        />
        {}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: 'linear-gradient(180deg, var(--wave-from), var(--wave-to))',
            opacity: 0.8,
          }}
        />

        <span
          aria-hidden
          style={{
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            width: 46,
            height: 46,
            flexShrink: 0,
            borderRadius: '50%',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            fontSize: 20,
            backgroundImage: 'linear-gradient(135deg, var(--wave-from), var(--wave-to))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          ∿
        </span>

        <span style={{ position: 'relative', minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Sob medida
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(17px, 1.8vw, 21px)',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
            }}
          >
            Criar meu agente
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', maxWidth: 640 }}>
            Descreva o que você precisa; a gente entrevista, conecta suas ferramentas e entrega um
            funcionário pronto.
          </span>
        </span>

        <span
          aria-hidden
          style={{
            position: 'relative',
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          Começar a entrevista →
        </span>
      </Link>
    </motion.div>
  )
}
