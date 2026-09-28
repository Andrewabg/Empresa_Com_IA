'use client'

import { useState } from 'react'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import { Chip } from './Chip'
import { rotuloDeTool } from '@/lib/loja/rotulosDeTools'
import type { MarketingSeedCard } from '@/lib/marketing-store'

export interface LojaCardProps {
  card: MarketingSeedCard
  installed: boolean
  
  deFerias?: boolean
  
  onOpen: (cardId: string) => void
}


export function LojaCard({ card, installed, deFerias = false, onOpen }: LojaCardProps) {
  const [hovered, setHovered] = useState(false)
  const chips = [...card.skills, ...card.toolsResumo.map(rotuloDeTool)].slice(0, 3)

  return (
    <button
      type="button"
      id={`loja-card-${card.id}`}
      onClick={() => onOpen(card.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => {
        
        
        try {
          if (e.currentTarget.matches(':focus-visible')) setHovered(true)
        } catch {
          setHovered(true)
        }
      }}
      onBlur={() => setHovered(false)}
      aria-label={`${card.name} — ${card.role}. Abrir dossiê`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        width: '100%',
        padding: 'clamp(18px, 2vw, 24px)',
        textAlign: 'left',
        background: 'var(--surface)',
        border: `1px solid ${hovered ? 'rgb(255 255 255 / 0.14)' : 'var(--border-hairline)'}`,
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        color: 'inherit',
        fontFamily: 'var(--font-ui)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 180ms ease, border-color 180ms ease',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <AgentWaveAvatar agentId={card.id} size={64} lit={installed} active={hovered} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
            }}
          >
            {card.name}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{card.role}</div>
        </div>
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 15,
          lineHeight: 1.5,
          color: 'var(--text-secondary)',
        }}
      >
        {card.tagline}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chips.map((c, i) => (
          <Chip key={`${i}-${c}`}>{c}</Chip>
        ))}
      </div>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 12,
          borderTop: '1px solid var(--border-hairline)',
          fontSize: 13,
          fontWeight: 500,
          color: installed ? 'var(--text-primary)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        {installed && deFerias ? (
          <>
            <span aria-hidden>☾</span> De férias
          </>
        ) : installed ? (
          <>
            <span aria-hidden>✓</span> No seu time
          </>
        ) : (
          <>
            Conhecer <span aria-hidden>→</span>
          </>
        )}
      </div>
    </button>
  )
}
