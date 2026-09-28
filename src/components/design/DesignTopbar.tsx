'use client'


import { ControlesDaSala } from '@/components/conversa/ControlesDaSala'

export function DesignTopbar({
  agentName,
  brandName,
  onDirecao,
  onHistorico,
  onNova,
}: {
  agentName: string
  brandName: string | null
  onDirecao: () => void
  onHistorico: () => void
  onNova: () => void
}) {
  return (
    <header
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px clamp(16px, 2.5vw, 28px)',
        borderBottom: '1px solid var(--border-hairline)',
        background: 'linear-gradient(to bottom, rgb(255 255 255 / 0.012), transparent)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 14.5,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        Design{' '}
        <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>· {agentName}</span>
      </h1>

      {brandName && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '4px 11px',
            borderRadius: 999,
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface)',
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 220,
          }}
          title={brandName}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
              flexShrink: 0,
            }}
          />
          {brandName}
        </span>
      )}

      <div style={{ flex: 1 }} />

      <ControlesDaSala
        onHistorico={onHistorico}
        onNova={onNova}
        rotuloNova="Nova arte"
        tituloNova="Começar uma frente nova com o Téo (os criativos de antes continuam na esteira)"
      />

      <button
        type="button"
        onClick={onDirecao}
        title="Abrir a Direção de arte (o que o Téo sabe da identidade visual da marca)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface-elevated)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          cursor: 'pointer',
        }}
      >
        <DirecaoGlyph />
        Direção de arte
      </button>
    </header>
  )
}


function DirecaoGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5" cy="11" r="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11" cy="11" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
