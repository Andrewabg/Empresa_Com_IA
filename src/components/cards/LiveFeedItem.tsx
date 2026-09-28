'use client'

import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { springPreset } from '@/lib/motion'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import { agentMeta, canonicalSlug } from '@/lib/brain-nav'
import type { LiveEvent } from '@/mock/types'




function MemoryGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 2.4v1.3M8 12.3v1.3M2.4 8h1.3M12.3 8h1.3M4.1 4.1l.9.9M11 11l.9.9M11.9 4.1l-.9.9M5 11l-.9.9"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  )
}


function ActionGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8.5 2L3.5 9h3.5l-1 5 5-7H7.5l1-5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}


function ToolGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10.3 2.6a2.6 2.6 0 0 0-2.9 3.4L2.9 10.5a1.2 1.2 0 1 0 1.7 1.7l4.5-4.5a2.6 2.6 0 0 0 3.4-2.9l-1.6 1.6-1.6-.4-.4-1.6 1.4-1.4Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const GLYPH: Record<LiveEvent['type'], () => React.ReactElement> = {
  memory: MemoryGlyph,
  action: ActionGlyph,
  tool: ToolGlyph,
}

const TYPE_LABEL: Record<LiveEvent['type'], string> = {
  memory: 'memória',
  action: 'ação',
  tool: 'ferramenta',
}




export function relativeTime(atMs: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - atMs)
  const s = Math.floor(diff / 1000)
  if (s < 10) return 'agora'
  if (s < 60) return `há ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return `há ${d} d`
}

interface LiveFeedItemProps {
  event: LiveEvent
  
  now: number
  
  instant?: boolean
  
  divider?: boolean
  
  nomesDeAgente?: Record<string, string>
}


export function LiveFeedItem({ event, now, instant = false, divider = false, nomesDeAgente }: LiveFeedItemProps) {
  const reducedMotion = useReducedMotion()
  const Glyph = GLYPH[event.type]
  const noAnim = instant || reducedMotion
  
  const pulse = !noAnim
  
  const agentSlug = event.agent ? canonicalSlug(event.agent) : null

  return (
    <motion.li
      layout={!noAnim}
      initial={noAnim ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPreset}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '13px 6px',
        listStyle: 'none',
        borderTop: divider ? '1px solid var(--border-hairline)' : 'none',
      }}
    >
      {}
      {pulse && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0.85, scaleY: 0.4 }}
          animate={{ opacity: 0, scaleY: 1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: -4,
            top: 8,
            bottom: 8,
            width: 2,
            transformOrigin: 'center',
            borderRadius: 2,
            background: 'linear-gradient(to bottom, var(--wave-from), var(--wave-to))',
          }}
        />
      )}
      {}
      {agentSlug ? (
        <span style={{ marginTop: 1, flexShrink: 0 }}>
          <AgentWaveAvatar agentId={agentSlug} size={32} lit={!instant} active={false} />
        </span>
      ) : (
        <span
          aria-hidden
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 32,
            height: 32,
            flexShrink: 0,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--text-secondary)',
            marginTop: 1,
          }}
        >
          <Glyph />
        </span>
      )}

      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            lineHeight: 1.45,
            color: 'var(--text-primary)',
          }}
        >
          {event.label}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 3,
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
          }}
        >
          {agentSlug && (
            <>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                {agentMeta(agentSlug, nomesDeAgente).name}
              </span>
              <span aria-hidden style={{ opacity: 0.5 }}>·</span>
            </>
          )}
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 500,
            }}
          >
            {TYPE_LABEL[event.type]}
          </span>
          <span aria-hidden style={{ opacity: 0.5 }}>·</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {relativeTime(event.at, now)}
          </span>
        </span>
      </span>
    </motion.li>
  )
}
