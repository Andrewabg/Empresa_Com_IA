'use client'






import { BlocoCard, BlocoVazio } from './BlocoCard'
import { fmtValor, fmtRoas } from './_format'

export type PublicoTipo = 'frio' | 'morno' | 'quente'

export interface AudienceRow {
  label: string
  
  tipo?: PublicoTipo
  
  spend?: number
  
  roas?: number
  
  cpa?: number
}


export interface AudiencesConfig {
  title?: string
  rows: AudienceRow[]
}


const TIPO_PILL: Record<PublicoTipo, { label: string; dot: string }> = {
  frio: { label: 'Frio', dot: 'var(--wave-from)' },
  morno: { label: 'Morno', dot: 'color-mix(in srgb, var(--wave-from) 50%, var(--wave-to))' },
  quente: { label: 'Remarketing', dot: 'var(--wave-to)' },
}

function TipoPill({ tipo }: { tipo: PublicoTipo }) {
  const p = TIPO_PILL[tipo]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        padding: '2px 9px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: 'var(--text-tertiary)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
      }}
    >
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot }} />
      {p.label}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 56 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </span>
  )
}

export function AudiencesBlock({
  bloco,
}: {
  bloco: { config: Record<string, unknown>; annotation: string | null }
}) {
  const cfg = (bloco.config ?? {}) as Partial<AudiencesConfig>
  const rows = Array.isArray(cfg.rows) ? cfg.rows : []

  return (
    <BlocoCard type="audiences" annotation={bloco.annotation}>
      {rows.length === 0 ? (
        <BlocoVazio>Sem públicos no período — peça pro Rui detalhar frio/morno/remarketing.</BlocoVazio>
      ) : (
        <div className="cc-scroll" style={{ maxHeight: 300, display: 'flex', flexDirection: 'column' }}>
          {rows.map((r, i) => (
            <div
              key={`${r.label}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '11px 2px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--border-hairline)' : 'none',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {r.tipo && <TipoPill tipo={r.tipo} />}
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={r.label}
                >
                  {r.label}
                </span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                {r.spend !== undefined && <Metric label="Gasto" value={fmtValor(r.spend, 'brl')} />}
                {r.roas !== undefined && <Metric label="ROAS" value={fmtRoas(r.roas)} />}
                {r.cpa !== undefined && <Metric label="CPA" value={fmtValor(r.cpa, 'brl')} />}
              </span>
            </div>
          ))}
        </div>
      )}
    </BlocoCard>
  )
}
