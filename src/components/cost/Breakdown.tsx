'use client'

import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { fmtUsd } from '@/lib/chart'

export interface BreakdownRow {
  
  label: string
  usd: number
}

interface BreakdownProps {
  title: string
  rows: BreakdownRow[]
}


export function Breakdown({ title, rows }: BreakdownProps) {
  const reduced = useReducedMotion() ?? false
  const max = rows.reduce((m, r) => (r.usd > m ? r.usd : m), 0)

  return (
    <section aria-label={title}>
      <p
        style={{
          margin: 0,
          marginBottom: 16,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {title}
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((row, i) => {
          const frac = max > 0 ? row.usd / max : 0
          
          const op = 0.9 - i * 0.16
          const barOpacity = Math.max(0.22, op)
          return (
            <li key={row.label}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 7,
                }}
              >
                <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{row.label}</span>
                <span
                  style={{
                    fontSize: 13.5,
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {fmtUsd(row.usd)}
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 999,
                  background: 'var(--surface-elevated)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${frac * 100}%` }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.6, delay: 0.1 + i * 0.06, ease: 'easeOut' }
                  }
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: 'var(--text-primary)',
                    opacity: barOpacity,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
