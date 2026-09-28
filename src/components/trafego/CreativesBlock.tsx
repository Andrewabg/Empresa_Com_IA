'use client'









import { useId } from 'react'
import { buildLinePath, maxOf } from '@/lib/chart'
import { FADIGA_CTR_QUEDA, FREQ_FADIGA, CTR_BAIXO } from '@/lib/trafego/diagnostico'
import { BlocoCard, BlocoVazio } from './BlocoCard'
import { fmtValor, fmtRoas } from './_format'

export interface CreativeRow {
  name: string
  
  spend?: number
  
  cpa?: number
  
  ctr?: number
  
  frequency?: number
  
  hookRate?: number
  
  holdRate?: number
  
  serie?: number[]
  
  causa?: 'hook' | 'hold' | 'ctr_cta' | 'downstream' | 'saudavel' | 'cedo'
  
  nota?: string
}


export interface CreativesConfig {
  title?: string
  rows: CreativeRow[]
}


function ctrCaindo(serie?: number[]): boolean {
  if (!Array.isArray(serie)) return false
  const valid = serie.filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
  if (valid.length < 2) return false
  const first = valid[0]
  const last = valid[valid.length - 1]
  return (first - last) / first >= FADIGA_CTR_QUEDA
}


function fadigada(row: CreativeRow): boolean {
  const freqAlta = row.frequency !== undefined && row.frequency >= FREQ_FADIGA
  if (!freqAlta) return false
  if (Array.isArray(row.serie) && row.serie.length >= 2) return ctrCaindo(row.serie)
  return row.ctr !== undefined && row.ctr <= CTR_BAIXO
}

function FadigaPill() {
  const amber = 'rgb(214 158 46)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: amber,
        background: `color-mix(in srgb, ${amber} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${amber} 30%, transparent)`,
      }}
    >
      <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: amber }} />
      fadiga
    </span>
  )
}

const CAUSA_LABEL: Record<string, string> = {
  hook: 'hook', hold: 'hold', ctr_cta: 'cta', downstream: 'oferta',
}

function CausaPill({ causa, nota }: { causa: string; nota?: string }) {
  const label = CAUSA_LABEL[causa]
  if (!label) return null
  const amber = 'rgb(214 158 46)'
  return (
    <span
      title={nota}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
        padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10.5, fontWeight: 600,
        letterSpacing: '0.02em', color: amber, background: `color-mix(in srgb, ${amber} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${amber} 30%, transparent)`,
      }}
    >
      <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: amber }} />
      {label}
    </span>
  )
}


function Sparkline({ serie }: { serie: number[] }) {
  const uid = useId().replace(/:/g, '')
  const sid = `spk-${uid}`
  const W = 64
  const H = 18
  const d = buildLinePath(serie, W, H, maxOf(serie))
  if (!d) return null
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={sid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--wave-from)" />
          <stop offset="100%" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${sid})`} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>
    </span>
  )
}

export function CreativesBlock({
  bloco,
}: {
  bloco: { config: Record<string, unknown>; annotation: string | null }
}) {
  const cfg = (bloco.config ?? {}) as Partial<CreativesConfig>
  const rows = Array.isArray(cfg.rows) ? cfg.rows : []

  return (
    <BlocoCard type="creatives" annotation={bloco.annotation}>
      {rows.length === 0 ? (
        <BlocoVazio>Sem criativos no período.</BlocoVazio>
      ) : (
        <div className="cc-scroll" style={{ maxHeight: 320, display: 'flex', flexDirection: 'column', gap: 2, margin: '0 -2px' }}>
          {rows.map((r, i) => {
            const tired = fadigada(r)
            const hasVideo = r.hookRate !== undefined || r.holdRate !== undefined
            return (
              <div
                key={`${r.name}-${i}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '10px 2px',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border-hairline)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={r.name}
                  >
                    {r.name}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {Array.isArray(r.serie) && r.serie.length >= 2 && <Sparkline serie={r.serie} />}
                    {tired && <FadigaPill />}
                    {r.causa && <CausaPill causa={r.causa} nota={r.nota} />}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 16px' }}>
                  {r.spend !== undefined && <Chip label="Gasto" value={fmtValor(r.spend, 'brl')} />}
                  {r.cpa !== undefined && <Chip label="CPA" value={fmtValor(r.cpa, 'brl')} />}
                  {r.ctr !== undefined && <Chip label="CTR" value={fmtValor(r.ctr, 'pct')} />}
                  {r.frequency !== undefined && <Chip label="Freq." value={fmtRoas(r.frequency)} />}
                  {hasVideo && r.hookRate !== undefined && <Chip label="Hook" value={fmtValor(r.hookRate, 'pct')} />}
                  {hasVideo && r.holdRate !== undefined && <Chip label="Hold" value={fmtValor(r.holdRate, 'pct')} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </BlocoCard>
  )
}
