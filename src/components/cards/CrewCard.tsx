'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import { relativeTime } from '@/components/cards/LiveFeedItem'
import type { CrewMember } from '@/data/crew'

interface CrewCardProps {
  member: CrewMember
  
  now: number
  
  pulsing?: boolean
  
  tabIndex?: number
}


export function CrewCard({ member, now, pulsing = false, tabIndex }: CrewCardProps) {
  const [hover, setHover] = useState(false)
  const isActive = member.status === 'active'
  const href = member.cockpit ?? `/conversa?agent=${encodeURIComponent(member.slug)}`

  return (
    <Link
      href={href}
      tabIndex={tabIndex}
      aria-label={`${member.name} — ${member.role}${member.pending > 0 ? ` — ${member.pending} ${member.pending === 1 ? 'pendência' : 'pendências'}` : ''} — abrir espaço de trabalho`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={cn(
        'border border-[var(--border-hairline)] hover:border-white/15',
        'transition-colors',
      )}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--surface-elevated)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        textDecoration: 'none',
        width: 264,
        flex: '0 0 auto',
      }}
    >
      {}
      <AgentWaveAvatar
        agentId={member.slug}
        size={48}
        lit
        active={isActive || hover || pulsing}
      />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14.5,
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {member.name}
          </span>
          {member.pending > 0 && (
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: 'var(--text-primary)',
                background: 'color-mix(in srgb, var(--wave-to) 16%, transparent)',
                border: '1px solid color-mix(in srgb, var(--wave-to) 30%, transparent)',
                borderRadius: 'var(--radius-sm)',
                padding: '1px 7px',
                lineHeight: 1.6,
              }}
            >
              {member.pending}
            </span>
          )}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {member.role}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginTop: 5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {member.lastEvent
            ? `${relativeTime(member.lastEvent.at, now)} · ${member.lastEvent.label}`
            : 'sem atividade ainda'}
        </span>
      </span>
      {}
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          alignSelf: 'center',
          fontSize: 13,
          color: 'var(--text-secondary)',
          opacity: hover ? 0.9 : 0.25,
          transition: 'opacity 160ms ease',
        }}
      >
        →
      </span>
    </Link>
  )
}
