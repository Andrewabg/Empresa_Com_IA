'use client'






import { useId } from 'react'
import { buildBars, maxOf } from '@/lib/chart'
import { BlocoCard, BlocoVazio } from './BlocoCard'
import { fmtValor, type BlocoFmt } from './_format'

export interface ComparisonBar {
  label: string
  value: number
}


export interface ComparisonConfig {
  title: string
  
  fmt: BlocoFmt
  bars: ComparisonBar[]
}


const VW = 720
const VH = 220
const PAD = { top: 26, right: 8, bottom: 30, left: 8 }
const PLOT_W = VW - PAD.left - PAD.right
const PLOT_H = VH - PAD.top - PAD.bottom


function short(label: string, max = 16): string {
  return label.length > max ? label.slice(0, max - 1) + '…' : label
}

export function ComparisonBlock({
  bloco,
}: {
  bloco: { config: Record<string, unknown>; annotation: string | null }
}) {
  const cfg = (bloco.config ?? {}) as Partial<ComparisonConfig>
  const fmt: BlocoFmt = cfg.fmt ?? 'num'
  const title = cfg.title ?? 'Comparativo'
  const bars = Array.isArray(cfg.bars) ? cfg.bars.filter((b) => b && typeof b.value === 'number') : []

  const uid = useId().replace(/:/g, '')
  const gradId = `cmp-fill-${uid}`

  const values = bars.map((b) => b.value)
  const max = maxOf(values)
  const rects = buildBars(values, PLOT_W, PLOT_H, max)

  return (
    <BlocoCard type="comparison" annotation={bloco.annotation}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
      </div>

      {bars.length === 0 ? (
        <BlocoVazio>Sem dados pra comparar no período.</BlocoVazio>
      ) : (
        <figure style={{ margin: 0 }}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            role="img"
            aria-label={title}
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--wave-from)" />
                <stop offset="100%" stopColor="var(--wave-to)" />
              </linearGradient>
            </defs>

            {}
            <line
              x1={PAD.left}
              y1={PAD.top + PLOT_H}
              x2={VW - PAD.right}
              y2={PAD.top + PLOT_H}
              stroke="var(--border-hairline)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />

            <g transform={`translate(${PAD.left} ${PAD.top})`}>
              {rects.map((r, i) => {
                const cx = r.x + r.width / 2
                return (
                  <g key={`${bars[i].label}-${i}`}>
                    <rect
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      rx={4}
                      fill={`url(#${gradId})`}
                      opacity={0.92}
                    />
                    {}
                    <text
                      x={cx}
                      y={r.y - 7}
                      textAnchor="middle"
                      style={{
                        fill: 'var(--text-primary)',
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: 'var(--font-ui)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmtValor(bars[i].value, fmt)}
                    </text>
                    {}
                    <text
                      x={cx}
                      y={PLOT_H + 18}
                      textAnchor="middle"
                      style={{ fill: 'var(--text-tertiary)', fontSize: 11.5, fontFamily: 'var(--font-ui)' }}
                    >
                      {short(bars[i].label)}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        </figure>
      )}
    </BlocoCard>
  )
}
