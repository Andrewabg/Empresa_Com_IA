'use client'


import type { FichaJuridica } from '@/lib/juridico/ficha'
import type { PrazoView } from '@/lib/juridico/prazosTipos'
import { alertavel } from '@/lib/juridico/prazosRadar'
import { ControlesDaSala } from '@/components/conversa/ControlesDaSala'

export function JuridicoTopbar({
  agentName,
  ficha,
  prazos,
  hoje,
  onFicha,
  onPrazos,
  onModelos,
  onUpload,
  onHistorico,
  onNova,
}: {
  agentName: string
  ficha: FichaJuridica | null
  prazos: PrazoView[]
  hoje: string
  onFicha: () => void
  onPrazos: () => void
  onModelos: () => void
  onUpload: () => void
  onHistorico: () => void
  onNova: () => void
}) {
  const fichaLabel = ficha?.razaoSocial || 'Ficha Jurídica'
  const nAlerta = prazos.filter((p) => alertavel(p, hoje)).length

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
        Jurídico <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>· {agentName}</span>
      </h1>

      <button
        type="button"
        onClick={onFicha}
        title="Abrir a Ficha Jurídica (o que o Alan sabe da empresa)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 11px',
          borderRadius: 999,
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 11.5,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 240,
        }}
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
        {fichaLabel}
      </button>

      <button
        type="button"
        onClick={onPrazos}
        title="Abrir o Radar de Prazos (renovações, avisos, vencimentos)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 11px',
          borderRadius: 999,
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface)',
          color: nAlerta > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 11.5,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>
          ⏰
        </span>
        Prazos ({nAlerta})
      </button>

      <div style={{ flex: 1 }} />

      <ControlesDaSala
        onHistorico={onHistorico}
        onNova={onNova}
        tituloNova="Começar uma frente nova com o Alan (a mesa de contratos continua onde está)"
      />

      <button
        type="button"
        onClick={onModelos}
        title="Abrir os Modelos (de fábrica + os salvos como modelo da casa)"
        style={secondaryBtn}
      >
        <ModelosGlyph />
        Modelos
      </button>

      <button
        type="button"
        onClick={onUpload}
        title="Analisar um contrato que você recebeu (PDF/texto → parecer com semáforo)"
        style={secondaryBtn}
      >
        <UploadGlyph />
        Analisar contrato
      </button>
    </header>
  )
}

const secondaryBtn: React.CSSProperties = {
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
  whiteSpace: 'nowrap',
}


function ModelosGlyph() {
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


function UploadGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 10.5V3.5M5.5 6 8 3.5 10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v1.5h10V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
