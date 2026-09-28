'use client'






import type { MetricShape } from '@/lib/trafego/types'
import { fmtDelta, type DeltaTone } from '@/lib/trafego/format'
import { BlocoCard, BlocoVazio } from './BlocoCard'
import { fmtValor, metricValue, type BlocoFmt, type KpiMetric } from './_format'


export interface KpiTileConfig {
  
  label: string
  
  metric: KpiMetric
  
  fmt: BlocoFmt
  
  inverseGood?: boolean
  
  meta?: number
  
  value?: number
  
  delta?: number
}


export interface KpiBlocoConfig {
  tiles: KpiTileConfig[]
}


function deltaColor(tone: DeltaTone, inverseGood?: boolean): string {
  if (tone === 'flat') return 'var(--text-tertiary)'
  const good = inverseGood ? tone === 'down' : tone === 'up'
  return good ? 'var(--approve)' : 'var(--reject)'
}

interface KpiTileProps {
  label: string
  value: number | undefined
  fmt: BlocoFmt
  delta?: number
  meta?: number
  inverseGood?: boolean
}


export function KpiTile({ label, value, fmt, delta, meta, inverseGood }: KpiTileProps) {
  const d = delta !== undefined ? fmtDelta(delta) : null
  const metaOk =
    meta !== undefined && value !== undefined
      ? inverseGood
        ? value <= meta
        : value >= meta
      : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, padding: '4px 2px' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          
          
          fontSize: 'clamp(18px, 2vw, 24px)',
          fontWeight: 600,
          lineHeight: 1.05,
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={fmtValor(value, fmt)}
      >
        {fmtValor(value, fmt)}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 16 }}>
        {d && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: deltaColor(d.tone, inverseGood),
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {d.label}
          </span>
        )}
        {metaOk !== null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              color: 'var(--text-tertiary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: metaOk ? 'var(--approve)' : 'var(--reject)',
              }}
            />
            meta {fmtValor(meta, fmt)}
          </span>
        )}
      </div>
    </div>
  )
}


export function KpiRow({ tiles, metrics }: { tiles: KpiTileConfig[]; metrics?: MetricShape }) {
  return (
    <div
      style={{
        display: 'grid',
        
        
        gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
        gap: 'clamp(12px, 2vw, 22px)',
      }}
    >
      {tiles.map((t, i) => (
        <KpiTile
          key={`${t.label}-${i}`}
          label={t.label}
          value={t.value ?? metricValue(metrics, t.metric)}
          fmt={t.fmt}
          delta={t.delta}
          meta={t.meta}
          inverseGood={t.inverseGood}
        />
      ))}
    </div>
  )
}


export function KpiBlock({ bloco }: { bloco: { config: Record<string, unknown>; annotation: string | null; metrics?: MetricShape } }) {
  const cfg = (bloco.config ?? {}) as Partial<KpiBlocoConfig>
  const tiles = Array.isArray(cfg.tiles) ? cfg.tiles : []
  return (
    <BlocoCard type="kpi" annotation={bloco.annotation}>
      {tiles.length > 0 ? (
        <KpiRow tiles={tiles} metrics={bloco.metrics} />
      ) : (
        <BlocoVazio>Sem indicadores ainda — peça pro Rui destacar os KPIs da conta.</BlocoVazio>
      )}
    </BlocoCard>
  )
}
