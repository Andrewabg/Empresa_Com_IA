
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { citationsSummary, formatWhen } from '@/lib/citations'
import type { NotaCitada } from '@/server/tools/buscarCerebro'


export function CitationsDisclosure({ notes }: { notes: NotaCitada[] }) {
  const reducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const { count, label } = citationsSummary(notes)
  if (count === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <motion.button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        whileHover={{ color: 'var(--text-secondary)', borderColor: 'var(--text-tertiary)' }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          alignSelf: 'flex-start',
          padding: '5px 10px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
          background: 'transparent',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 11.5,
          cursor: 'pointer',
          transition: 'color 140ms ease, border-color 140ms ease',
        }}
      >
        <SparkGlyph />
        <span>{label}</span>
        <Chevron open={open} reducedMotion={reducedMotion ?? false} />
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            role="list"
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={reducedMotion ? { duration: 0 } : springPreset}
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              overflow: 'hidden',
            }}
          >
            {notes.map((n, i) => {
              const meta = [n.caminho, n.agente, formatWhen(n.quando ?? '')].filter(Boolean).join(' · ')
              return (
                <li
                  key={`${n.id}-${i}`}
                  role="listitem"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    padding: '6px 10px',
                    borderLeft: '2px solid var(--border-hairline)',
                  }}
                >
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                    {n.título ?? n.caminho}
                  </span>
                  {meta && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.35,
                      }}
                    >
                      {meta}
                    </span>
                  )}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}


function SparkGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    </svg>
  )
}


function Chevron({ open, reducedMotion }: { open: boolean; reducedMotion: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: reducedMotion ? undefined : 'transform 160ms ease' }}
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
