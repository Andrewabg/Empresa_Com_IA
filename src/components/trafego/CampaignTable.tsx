'use client'











import { useState } from 'react'
import { BlocoCard, BlocoVazio } from './BlocoCard'
import { fmtValor, fmtRoas } from './_format'
import { fmtDelta } from '@/lib/trafego/format'
import { buildLinePath, maxOf } from '@/lib/chart'
import type { Veredito } from '@/lib/trafego/veredito'


export type LearningStage = 'LEARNING' | 'SUCCESS' | 'LEARNING_LIMITED' | 'FAIL' | (string & {})

export interface CampaignRow {
  
  id?: string
  name: string
  
  spend?: number
  
  roas?: number
  
  ctr?: number
  
  trend?: 'up' | 'down' | 'flat'
  
  learning?: LearningStage
  
  veredito?: Veredito
  
  sinalPrincipal?: { texto: string; tipo: string; severidade: string }
  
  spark?: number[]
  
  deltaOntem?: number
}


export interface CampaignTableConfig {
  title?: string
  
  sortBy?: 'spend' | 'roas'
  rows: CampaignRow[]
}


const LEARNING_PILL: Record<string, { label: string; color: string }> = {
  LEARNING: { label: 'Aprendizado', color: 'rgb(214 158 46)' },
  SUCCESS: { label: 'Aprendido', color: 'var(--approve)' },
  LEARNING_LIMITED: { label: 'Aprend. limitado', color: 'var(--reject)' },
  FAIL: { label: 'Reprovado', color: 'var(--reject)' },
}

function LearningBadge({ stage }: { stage: LearningStage }) {
  const pill = LEARNING_PILL[stage] ?? { label: String(stage), color: 'var(--text-tertiary)' }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        color: pill.color,
        background: `color-mix(in srgb, ${pill.color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${pill.color} 30%, transparent)`,
      }}
    >
      {pill.label}
    </span>
  )
}


const VEREDITO_CHIP: Record<string, { label: string; cor: string }> = {
  escalar:   { label: 'Escalar',    cor: 'var(--approve)' },
  cortar:    { label: 'Cortar',     cor: 'var(--reject)' },
  observar:  { label: 'Observar',   cor: 'var(--text-tertiary)' },
  aprendendo:{ label: 'Aprendendo', cor: 'rgb(214 158 46)' },
}


function VereditorChip({ v }: { v: Veredito }) {
  const info = VEREDITO_CHIP[v] ?? { label: v, cor: 'var(--text-tertiary)' }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        color: info.cor,
        background: `color-mix(in srgb, ${info.cor} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${info.cor} 30%, transparent)`,
      }}
    >
      {info.label}
    </span>
  )
}

const SINAL_COR: Record<string, string> = {
  alta:  'var(--reject)',
  media: 'var(--text-secondary)',
  baixa: 'var(--text-tertiary)',
}


const SINAL_LABEL: Record<string, string> = {
  roas_baixo: 'ROAS baixo',
  roas_caindo: 'ROAS caindo',
  cpa_alto: 'CPA alto',
  cpa_subindo: 'CPA subindo',
  fadiga: 'Fadiga',
  frequencia_alta: 'Freq. alta',
  cpm_subindo: 'CPM subindo',
  ctr_baixo: 'CTR baixo',
  ctr_caindo: 'CTR caindo',
  hook_fraco: 'Hook fraco',
  hold_fraco: 'Retenção fraca',
  volume_baixo: 'Volume baixo',
  aprendizado: 'Aprendizado',
  gasto_concentrado: 'Gasto concentrado',
  vazamento_funil: 'Vazamento no funil',
}


function SinalBadge({ sinal }: { sinal: { texto: string; tipo: string; severidade: string } }) {
  const cor = SINAL_COR[sinal.severidade] ?? 'var(--text-tertiary)'
  const label = SINAL_LABEL[sinal.tipo] ?? sinal.texto
  return (
    <span
      title={sinal.texto}
      style={{
        display: 'inline-block',
        maxWidth: 130,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 11.5,
        pointerEvents: 'none',
        color: cor,
      }}
    >
      {label}
    </span>
  )
}


function Sparkline({ values }: { values: number[] }) {
  const w = 64, h = 20
  const d = buildLinePath(values, w, h, maxOf(values))
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', pointerEvents: 'none' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="camp-spark-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#28E0C8" />
          <stop offset="100%" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="url(#camp-spark-grad)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}


function DeltaCell({ delta }: { delta: number }) {
  const { label, tone } = fmtDelta(delta)
  const color =
    tone === 'up'   ? 'var(--approve)' :
    tone === 'down' ? 'var(--reject)'  :
                      'var(--text-tertiary)'
  return (
    <span style={{ color, pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}>
      {label}
    </span>
  )
}

const th: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  background: 'var(--surface)',
  padding: '6px 10px',
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  borderBottom: '1px solid var(--border-hairline)',
  whiteSpace: 'nowrap',
}
const tdNum: React.CSSProperties = {
  padding: '9px 10px',
  fontSize: 13,
  color: 'var(--text-primary)',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
}


function CampanhaRow({
  r,
  hasLearning,
  hasSpark,
  hasVeredito,
  hasSinal,
  onDrill,
}: {
  r: CampaignRow
  hasLearning: boolean
  hasSpark: boolean
  hasVeredito: boolean
  hasSinal: boolean
  onDrill?: (campaignId: string) => void
}) {
  const [hover, setHover] = useState(false)
  const clicavel = !!(onDrill && r.id)
  const abrir = clicavel ? () => onDrill!(r.id!) : undefined

  return (
    <tr
      onClick={abrir}
      onKeyDown={
        clicavel
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                abrir?.()
              }
            }
          : undefined
      }
      onMouseEnter={clicavel ? () => setHover(true) : undefined}
      onMouseLeave={clicavel ? () => setHover(false) : undefined}
      role={clicavel ? 'button' : undefined}
      tabIndex={clicavel ? 0 : undefined}
      aria-label={clicavel ? `Ver conjuntos e anúncios de ${r.name}` : undefined}
      title={clicavel ? 'Ver conjuntos e anúncios' : undefined}
      style={{
        borderBottom: '1px solid var(--border-hairline)',
        cursor: clicavel ? 'pointer' : 'default',
        background: hover ? 'var(--surface-elevated)' : 'transparent',
        transition: 'background 120ms ease',
      }}
    >
      <td
        style={{
          padding: '9px 10px',
          fontSize: 13,
          color: 'var(--text-primary)',
          maxWidth: 150,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={r.name}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          {clicavel && (
            <span
              aria-hidden
              style={{
                fontSize: 12,
                color: hover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                flexShrink: 0,
                transition: 'color 120ms ease',
              }}
            >
              ›
            </span>
          )}
        </span>
      </td>
      <td style={tdNum}>{fmtValor(r.spend, 'brl')}</td>
      <td style={tdNum}>
        {}
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
          <span>{fmtRoas(r.roas)}</span>
          {r.deltaOntem !== undefined && <DeltaCell delta={r.deltaOntem} />}
        </span>
      </td>
      {hasSpark && (
        <td style={{ ...tdNum, textAlign: 'center', paddingLeft: 8, paddingRight: 8 }}>
          {r.spark && r.spark.length >= 2
            ? <Sparkline values={r.spark} />
            : <span style={{ color: 'var(--text-tertiary)' }}>—</span>
          }
        </td>
      )}
      {hasVeredito && (
        <td style={{ ...tdNum, textAlign: 'center' }}>
          {r.veredito ? <VereditorChip v={r.veredito} /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
        </td>
      )}
      {hasSinal && (
        <td style={{ padding: '9px 10px', fontSize: 13, maxWidth: 150 }}>
          {r.sinalPrincipal ? <SinalBadge sinal={r.sinalPrincipal} /> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
        </td>
      )}
      {hasLearning && (
        <td style={{ ...tdNum, textAlign: 'right' }}>{r.learning ? <LearningBadge stage={r.learning} /> : '—'}</td>
      )}
    </tr>
  )
}

export function CampaignTable({
  bloco,
  onDrill,
}: {
  bloco: { config: Record<string, unknown>; annotation: string | null }
  
  onDrill?: (campaignId: string) => void
}) {
  const cfg = (bloco.config ?? {}) as Partial<CampaignTableConfig>
  const rows = Array.isArray(cfg.rows) ? cfg.rows : []
  const hasLearning  = rows.some((r) => !!r.learning)
  const hasDelta     = rows.some((r) => r.deltaOntem !== undefined)
  const hasSpark     = rows.some((r) => r.spark != null && r.spark.length >= 2)
  const hasVeredito  = rows.some((r) => r.veredito != null)
  const hasSinal     = rows.some((r) => r.sinalPrincipal != null)

  return (
    <BlocoCard type="table" annotation={bloco.annotation}>
      {rows.length === 0 ? (
        <BlocoVazio>Sem campanhas no período.</BlocoVazio>
      ) : (
        <>
        <div
          className="cc-scroll"
          style={{ maxHeight: 300, margin: '0 -4px', borderRadius: 'var(--radius-sm)' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ui)' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>Campanha</th>
                <th style={{ ...th, textAlign: 'right' }}>Gasto</th>
                <th style={{ ...th, textAlign: 'right' }} title="ROAS do período · ▲/▼% ao lado = variação vs ontem (ontem vs anteontem)">ROAS · vs ontem</th>
                {hasSpark    && <th style={{ ...th, textAlign: 'center' }}>Tendência</th>}
                {hasVeredito && <th style={{ ...th, textAlign: 'center' }}>Ação</th>}
                {hasSinal    && <th style={{ ...th, textAlign: 'left' }}>Sinal</th>}
                {hasLearning && <th style={{ ...th, textAlign: 'right' }}>Fase</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <CampanhaRow
                  key={`${r.name}-${i}`}
                  r={r}
                  hasLearning={hasLearning}
                  hasSpark={hasSpark}
                  hasVeredito={hasVeredito}
                  hasSinal={hasSinal}
                  onDrill={onDrill}
                />
              ))}
            </tbody>
          </table>
        </div>
        {(hasDelta || hasSpark || hasVeredito) && (
          <p style={{ margin: '10px 2px 0', fontSize: 11, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
            {hasDelta && (
              <>
                O <b style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>▲/▼% ao lado do ROAS</b> é a variação vs ontem (ontem vs anteontem — o dia de hoje, ainda parcial, fica de fora).{' '}
              </>
            )}
            {hasSpark && (
              <>
                <b style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Tendência</b>: ROAS dos últimos 7 dias.{' '}
              </>
            )}
            {hasVeredito && (
              <>
                <b style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Ação/Sinal</b>: o que o Rui recomenda e por quê (passe o mouse no sinal pra ver o detalhe).
              </>
            )}
          </p>
        )}
        </>
      )}
    </BlocoCard>
  )
}
