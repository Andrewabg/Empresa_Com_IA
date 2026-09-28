'use client'







import { pct } from '@/lib/chart'
import type { MetricShape } from '@/lib/trafego/types'
import { BlocoCard, BlocoVazio } from './BlocoCard'
import { fmtRoas, fmtValor } from './_format'


export interface GoalsPacingConfig {
  title?: string
  
  metaRoas?: number
  
  metaCpa?: number
  
  gastoDia?: number
  
  orcamentoDia?: number
  
  roasAtual?: number
  
  cpaAtual?: number
}


const RITMO_NO_RITMO = 80

interface GoalRowProps {
  label: string
  
  atual: string
  
  meta: string | null
  
  frac: number
  
  ok: boolean | null
}


function GoalRow({ label, atual, meta, frac, ok }: GoalRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          {label}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{atual}</span>
          {meta && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>meta {meta}</span>}
          {ok !== null && (
            <span
              aria-hidden
              style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? 'var(--approve)' : 'var(--reject)' }}
            />
          )}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-elevated)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(frac * 100, frac > 0 ? 2 : 0)}%`,
            height: '100%',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(90deg, var(--wave-from), var(--wave-to))',
          }}
        />
      </div>
    </div>
  )
}

export function GoalsPacingBlock({
  bloco,
}: {
  bloco: { config: Record<string, unknown>; annotation: string | null; metrics?: MetricShape }
}) {
  const cfg = (bloco.config ?? {}) as Partial<GoalsPacingConfig>
  const m = bloco.metrics
  
  const roas = m?.roas ?? cfg.roasAtual
  const cpa = m?.cpa ?? cfg.cpaAtual

  const temMetaRoas = typeof cfg.metaRoas === 'number' && Number.isFinite(cfg.metaRoas)
  const temMetaCpa = typeof cfg.metaCpa === 'number' && Number.isFinite(cfg.metaCpa)
  const temRitmo =
    typeof cfg.orcamentoDia === 'number' && Number.isFinite(cfg.orcamentoDia) && cfg.orcamentoDia > 0

  
  const roasFrac =
    temMetaRoas && roas !== undefined && cfg.metaRoas! > 0 ? Math.min(roas / cfg.metaRoas!, 1) : 0
  const roasOk = temMetaRoas && roas !== undefined ? roas >= cfg.metaRoas! : null

  
  const cpaFrac =
    temMetaCpa && cpa !== undefined && cpa > 0 ? Math.min(cfg.metaCpa! / cpa, 1) : 0
  const cpaOk = temMetaCpa && cpa !== undefined ? cpa <= cfg.metaCpa! : null

  
  const p = temRitmo ? pct(cfg.gastoDia ?? 0, cfg.orcamentoDia!) : null
  const ritmo =
    p === null
      ? null
      : p.over
        ? { label: 'acima do orçamento', color: 'var(--reject)' as const }
        : p.value >= RITMO_NO_RITMO
          ? { label: 'no ritmo', color: 'var(--approve)' as const }
          : { label: 'abaixo do ritmo', color: 'rgb(214 158 46)' as const }

  const semNada = !temMetaRoas && !temMetaCpa && !temRitmo

  return (
    <BlocoCard type="goals" annotation={bloco.annotation}>
      {semNada ? (
        <BlocoVazio>Sem metas definidas — peça pro Rui fixar a meta de ROAS/CPA e o orçamento do dia.</BlocoVazio>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {temMetaRoas && (
            <GoalRow label="ROAS" atual={fmtRoas(roas)} meta={fmtRoas(cfg.metaRoas)} frac={roasFrac} ok={roasOk} />
          )}
          {temMetaCpa && (
            <GoalRow label="CPA" atual={fmtValor(cpa, 'brl')} meta={fmtValor(cfg.metaCpa, 'brl')} frac={cpaFrac} ok={cpaOk} />
          )}

          {ritmo && p && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Ritmo do orçamento
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ritmo.color }}>{ritmo.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtValor(cfg.gastoDia, 'brl')} / {fmtValor(cfg.orcamentoDia, 'brl')}
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-elevated)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(p.clamped, p.clamped > 0 ? 2 : 0)}%`,
                    height: '100%',
                    borderRadius: 'var(--radius-sm)',
                    background: p.over
                      ? 'color-mix(in srgb, var(--reject) 50%, var(--surface-elevated))'
                      : 'linear-gradient(90deg, var(--wave-from), var(--wave-to))',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </BlocoCard>
  )
}
