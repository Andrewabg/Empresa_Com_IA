





import type { ReactNode } from 'react'
import { Markdown } from '@/components/markdown/Markdown'
import type { BlocoType } from '@/lib/trafego/types'


export const TYPE_LABEL: Record<BlocoType, string> = {
  kpi: 'Indicadores',
  timeseries: 'Série temporal',
  table: 'Tabela de campanhas',
  funnel: 'Funil de conversão',
  comparison: 'Comparativo',
  creatives: 'Criativos & fadiga',
  audiences: 'Públicos',
  goals: 'Metas & ritmo',
  health: 'Saúde da conta',
  recommendation: 'O que melhorar',
  note: 'Nota',
  drilldown: 'Drill da campanha',
  plano: 'Plano de ação',
  historico: 'Histórico',
}

interface BlocoCardProps {
  type: BlocoType
  
  annotation?: string | null
  
  done?: boolean
  
  headerRight?: ReactNode
  children: ReactNode
}


export function BlocoCard({ type, annotation, done, headerRight, children }: BlocoCardProps) {
  return (
    <section
      aria-label={TYPE_LABEL[type]}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface)',
        padding: '16px 18px',
        opacity: done ? 0.6 : 1,
        transition: 'opacity 160ms ease',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          <WaveMark />
          {TYPE_LABEL[type]}
        </span>
        {headerRight}
      </header>

      <div style={{ marginTop: 12 }}>{children}</div>

      {annotation && (
        <div
          style={{
            margin: '12px 0 0',
            paddingTop: 12,
            borderTop: '1px solid var(--border-hairline)',
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--text-tertiary)',
          }}
        >
          <Markdown chat>{annotation}</Markdown>
        </div>
      )}
    </section>
  )
}


export function BlocoVazio({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>{children}</p>
  )
}


export function WaveMark() {
  return (
    <svg width="14" height="10" viewBox="0 0 16 12" fill="none" aria-hidden>
      <defs>
        <linearGradient id="painel-wavemark" x1="0" y1="0" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--wave-from)" />
          <stop offset="1" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
      <path
        d="M1 6c1.8 0 1.8-3.5 3.6-3.5S6.4 9.5 8 9.5s1.8-7 3.6-7S13.2 6 15 6"
        stroke="url(#painel-wavemark)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
