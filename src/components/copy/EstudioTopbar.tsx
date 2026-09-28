'use client'


import { ControlesDaSala } from '@/components/conversa/ControlesDaSala'

export function EstudioTopbar({
  agentName,
  brandName,
  onFicha,
  onSwipes,
  onCampanhas,
  onHistorico,
  onNova,
}: {
  agentName: string
  brandName: string | null
  onFicha: () => void
  onSwipes: () => void
  onCampanhas: () => void
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
        Copy <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>· {agentName}</span>
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
        tituloNova="Começar uma frente nova com a Lia (as peças de antes continuam na esteira)"
      />

      <button
        type="button"
        onClick={onCampanhas}
        title="Abrir as Campanhas (planos da Lia — produzir peças em série)"
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
        <CampanhasGlyph />
        Campanhas
      </button>

      <button
        type="button"
        onClick={onSwipes}
        title="Abrir o Swipe file (referências que funcionam)"
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
        <SwipeGlyph />
        Swipe file
      </button>

      <button
        type="button"
        onClick={onFicha}
        title="Abrir a Ficha da marca (o que a Lia sabe da marca)"
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
        <FichaGlyph />
        Ficha da marca
      </button>
    </header>
  )
}

function SwipeGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}


function CampanhasGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.5 2 5.5l6 3 6-3-6-3zM2.5 9 8 11.75 13.5 9M2.5 12 8 14.75 13.5 12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}


function FichaGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 2h5l3 3v9H4V2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 2v3h3M6 9h4M6 11.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
