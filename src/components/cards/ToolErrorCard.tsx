'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'

interface ToolErrorCardProps {
  
  title: string
  
  tool: string
  
  message: string
}


export function ToolErrorCard({ title, tool, message }: ToolErrorCardProps) {
  const reducedMotion = useReducedMotion() ?? false
  const [phase, setPhase] = useState<'error' | 'retrying' | 'done'>('error')
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  const retry = useCallback(() => {
    if (phase === 'retrying') return
    setPhase('retrying')
    timerRef.current = window.setTimeout(
      () => {
        setPhase('done')
        timerRef.current = null
      },
      reducedMotion ? 0 : 1100,
    )
  }, [phase, reducedMotion])

  const isDone = phase === 'done'
  const accent = isDone ? 'var(--approve)' : 'var(--reject)'

  return (
    <motion.article
      aria-label={`${isDone ? 'Recuperado' : 'Falha'}: ${title}`}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : springPreset}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(20px, 2.4vw, 28px)',
        boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.03)',
      }}
    >
      {}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: accent,
          opacity: 0.55,
          transition: reducedMotion ? undefined : 'background 200ms ease',
        }}
      />

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 12,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        <span style={{ color: accent, display: 'grid', opacity: isDone ? 1 : 0.7 }}>
          {isDone ? <CheckGlyph /> : <AlertGlyph />}
        </span>
        {isDone ? 'Recuperado' : 'Ação não concluída'}
        <span aria-hidden style={{ opacity: 0.5 }}>·</span>
        <span style={{ letterSpacing: 0, textTransform: 'none', color: 'var(--text-secondary)' }}>
          {tool}
        </span>
      </header>

      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(17px, 1.9vw, 20px)',
          fontWeight: 600,
          lineHeight: 1.2,
          letterSpacing: '-0.015em',
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: 10,
        }}
      >
        {title}
      </h2>

      <p
        aria-live="polite"
        style={{
          margin: 0,
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--text-secondary)',
        }}
      >
        {isDone
          ? 'Pronto — a ação foi concluída no segundo try. Tudo certo, nada ficou pela metade.'
          : message}
      </p>

      {!isDone && (
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={retry}
            disabled={phase === 'retrying'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1,
              color: 'var(--text-primary)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 15px',
              cursor: phase === 'retrying' ? 'default' : 'pointer',
              opacity: phase === 'retrying' ? 0.6 : 1,
            }}
          >
            <RetryGlyph spinning={phase === 'retrying' && !reducedMotion} />
            {phase === 'retrying' ? 'Tentando…' : 'Tentar de novo'}
          </button>
          {phase !== 'retrying' && (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              O cérebro não foi alterado.
            </span>
          )}
        </div>
      )}
    </motion.article>
  )
}



function AlertGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.5L14.5 13.5H1.5L8 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 6.5v3M8 11.4v.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8.5l3 3L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RetryGlyph({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{
        transformOrigin: 'center',
        animation: spinning ? 'awave-retry-spin 0.8s linear infinite' : undefined,
      }}
    >
      <path d="M13 8a5 5 0 1 1-1.5-3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 2.5V5h-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
