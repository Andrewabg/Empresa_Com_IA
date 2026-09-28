'use client'

import { motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { formatWhen } from '@/lib/citations'


export type MemoryCardKind = 'memory' | 'action'

export interface MemoryCardData {
  id: string
  kind: MemoryCardKind
  
  title: string
  
  snippet: string
  
  path?: string
  
  agent: string
  
  at: string
  
  source?: string | null
}


export type MemoryCardVariant = 'inline' | 'browser'

interface MemoryCardProps {
  data: MemoryCardData
  
  instant?: boolean
  
  variant?: MemoryCardVariant
  
  footerAction?: React.ReactNode
}




function MemoryGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 2.6v1.2M8 12.2v1.2M2.6 8h1.2M12.2 8h1.2M4.3 4.3l.85.85M10.85 10.85l.85.85M11.7 4.3l-.85.85M5.15 10.85l-.85.85"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </svg>
  )
}


function ActionGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8.5 2L3.5 9h3.5l-1 5 5-7H7.5l1-5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const KIND_GLYPH: Record<MemoryCardKind, () => React.ReactElement> = {
  memory: MemoryGlyph,
  action: ActionGlyph,
}

const KIND_LABEL: Record<MemoryCardKind, string> = {
  memory: 'Memória salva',
  action: 'Ação tomada',
}


export function MemoryCard({
  data,
  instant = false,
  variant = 'inline',
  footerAction,
}: MemoryCardProps) {
  const reducedMotion = useReducedMotion()
  const noAnim = instant || reducedMotion
  const Glyph = KIND_GLYPH[data.kind]
  const isBrowser = variant === 'browser'

  return (
    <motion.article
      aria-label={isBrowser ? `Memória: ${data.title}` : `${KIND_LABEL[data.kind]}: ${data.title}`}
      initial={noAnim ? false : { opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springPreset}
      className={isBrowser ? 'memory-card--browser' : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden',
        
        background: isBrowser ? 'var(--surface)' : 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px 13px 17px',
        
        boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.03)',
        transition: 'border-color 140ms ease, background 140ms ease',
      }}
    >
      {}
      <span
        aria-hidden
        className={isBrowser ? 'memory-card__wave' : undefined}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: 'linear-gradient(to bottom, var(--wave-from), var(--wave-to))',
          opacity: isBrowser ? 0.45 : 0.75,
          transition: 'opacity 160ms ease',
        }}
      />

      {}
      {!isBrowser && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 22,
              height: 22,
              flexShrink: 0,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            <Glyph />
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            {KIND_LABEL[data.kind]}
          </span>
        </header>
      )}

      {}
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.25,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: 5,
        }}
      >
        {data.title}
      </h3>

      {}
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--text-secondary)',
          margin: 0,
        }}
      >
        {data.snippet}
      </p>

      {}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 11,
          paddingTop: 10,
          borderTop: '1px solid var(--border-hairline)',
          fontSize: 11.5,
          color: 'var(--text-tertiary)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            minWidth: 0,
          }}
        >
          {}
          {!isBrowser && data.path && (
            <>
              <code
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11.5,
                  color: 'var(--text-secondary)',
                }}
              >
                {data.path}
              </code>
              <span aria-hidden style={{ opacity: 0.5 }}>
                ·
              </span>
            </>
          )}
          {}
          <span>
            {isBrowser ? 'escrito por ' : ''}
            <span style={{ color: isBrowser ? 'var(--text-secondary)' : 'inherit' }}>
              {data.agent}
            </span>
          </span>
          <span aria-hidden style={{ opacity: 0.5 }}>
            ·
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatWhen(data.at)}</span>
          {}
          {data.source && (
            <>
              <span aria-hidden style={{ opacity: 0.5 }}>
                ·
              </span>
              <span>
                origem:{' '}
                <span style={{ color: isBrowser ? 'var(--text-secondary)' : 'inherit' }}>{data.source}</span>
              </span>
            </>
          )}
        </span>

        {isBrowser && footerAction}
      </footer>
    </motion.article>
  )
}

