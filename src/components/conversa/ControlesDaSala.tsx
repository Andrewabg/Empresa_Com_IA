'use client'

import { useId } from 'react'



export function ControlesDaSala({
  onHistorico,
  onNova,
  rotuloNova = 'Nova conversa',
  tituloNova = 'Começar uma conversa nova',
  flutuante = false,
}: {
  onHistorico: () => void
  onNova: () => void
  
  rotuloNova?: string
  tituloNova?: string
  flutuante?: boolean
}) {
  const sombra = flutuante ? '0 1px 10px rgba(0,0,0,0.3)' : 'none'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={onHistorico}
        aria-label="Abrir histórico de conversas"
        title="Histórico de conversas"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          boxShadow: sombra,
          transition: 'color 120ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
      >
        <HistoryGlyph />
      </button>
      <button
        type="button"
        onClick={onNova}
        aria-label={rotuloNova}
        title={tituloNova}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          height: 32,
          padding: '0 12px 0 10px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          fontWeight: 540,
          cursor: 'pointer',
          boxShadow: sombra,
          whiteSpace: 'nowrap',
          transition: 'color 120ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
      >
        <PlusGlyph />
        <span>{rotuloNova}</span>
      </button>
    </div>
  )
}


function PlusGlyph() {
  const gradId = `nova-plus-${useId()}`
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M7 2v10M2 7h10" stroke={`url(#${gradId})`} strokeWidth="1.7" strokeLinecap="round" />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="14" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--wave-from)" />
          <stop offset="1" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
    </svg>
  )
}


export function HistoryGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.6V8l2.3 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
