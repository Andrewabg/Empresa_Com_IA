'use client'








import { funnelRects } from '@/lib/chart'
import { funnelLabel } from '@/lib/trafego/funnelLabels'
import { dropoffFunil } from '@/lib/trafego/diagnostico'
import { fmtPct } from '@/lib/trafego/format'
import type { MetricShape } from '@/lib/trafego/types'
import { BlocoCard, BlocoVazio } from './BlocoCard'

export interface FunnelStepConfig {
  label: string
  count: number
}


export interface FunnelBlocoConfig {
  title?: string
  
  steps?: FunnelStepConfig[]
  
  labels?: Record<string, string>
}

interface ResolvedStep {
  key: string
  label: string
  count: number
}


function resolveSteps(cfg: Partial<FunnelBlocoConfig>, metrics?: MetricShape): ResolvedStep[] {
  if (Array.isArray(cfg.steps) && cfg.steps.length > 0) {
    return cfg.steps.map((s, i) => ({ key: `${s.label}-${i}`, label: s.label, count: s.count }))
  }
  const funnel = metrics?.funnel
  if (funnel && Object.keys(funnel).length > 0) {
    return Object.entries(funnel).map(([key, count]) => ({
      key,
      label: cfg.labels?.[key] ?? funnelLabel(key),
      count,
    }))
  }
  return []
}

const fmtCount = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })

export function FunnelBlock({
  bloco,
}: {
  bloco: { config: Record<string, unknown>; annotation: string | null; metrics?: MetricShape }
}) {
  const cfg = (bloco.config ?? {}) as Partial<FunnelBlocoConfig>
  const steps = resolveSteps(cfg, bloco.metrics)

  if (steps.length === 0) {
    return (
      <BlocoCard type="funnel" annotation={bloco.annotation}>
        <BlocoVazio>Sem etapas de funil no período.</BlocoVazio>
      </BlocoCard>
    )
  }

  
  const rects = funnelRects(steps.map((s) => ({ label: s.label, count: s.count })), 100, 100)
  
  const record: Record<string, number> = {}
  for (const s of steps) record[s.key] = s.count
  const drop = dropoffFunil(record)

  const AMBER = 'rgb(214 158 46)'
  
  
  
  
  const base = steps[0].count > 0 ? steps[0].count : 1
  const FUNNEL_EXP = 0.32
  const MIN_W = 7 
  const larguraPct = (c: number) => Math.max(Math.pow(Math.max(c, 0) / base, FUNNEL_EXP) * 100, MIN_W)

  return (
    <BlocoCard type="funnel" annotation={bloco.annotation}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {steps.map((s, i) => {
          const next = rects[i + 1]
          const isLeak = drop !== null && s.key === drop.etapa
          const nextIsLeak = drop !== null && steps[i + 1]?.key === drop.etapa
          return (
            <div key={s.key}>
              {}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    color: isLeak ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isLeak ? 600 : 400,
                  }}
                >
                  {s.label}
                  {isLeak && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: AMBER,
                      }}
                    >
                      maior queda
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtCount(s.count)}
                </span>
              </div>

              {}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: `${larguraPct(s.count)}%`,
                    height: 20,
                    borderRadius: 4,
                    background: isLeak
                      ? `linear-gradient(90deg, color-mix(in srgb, ${AMBER} 45%, transparent), ${AMBER})`
                      : 'linear-gradient(90deg, var(--wave-from), var(--wave-to))',
                  }}
                />
              </div>

              {}
              {next && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 5,
                    margin: '6px 0',
                    fontSize: 11,
                    color: nextIsLeak ? AMBER : 'var(--text-tertiary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <span aria-hidden>↓</span>
                  {fmtPct(next.rate)} seguem
                </div>
              )}
            </div>
          )
        })}
      </div>
    </BlocoCard>
  )
}
