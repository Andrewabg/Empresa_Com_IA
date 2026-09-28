'use client'






import { adsManagerUrl } from '@/lib/trafego/format'
import { Markdown } from '@/components/markdown/Markdown'
import { BlocoCard } from './BlocoCard'

export interface RecommendationConfig {
  titulo: string
  
  passos: string[]
  
  prioridade: 'alta' | 'media' | 'baixa'
  
  escopo: { accountId: string; level: 'account' | 'campaign' | 'adset' | 'ad'; entityId?: string }
}

const PRIORIDADE: Record<RecommendationConfig['prioridade'], { label: string; color: string }> = {
  alta: { label: 'Prioridade alta', color: 'var(--reject)' },
  media: { label: 'Prioridade média', color: 'rgb(214 158 46)' },
  baixa: { label: 'Prioridade baixa', color: 'var(--text-tertiary)' },
}

function PriorityBadge({ prioridade }: { prioridade: RecommendationConfig['prioridade'] }) {
  const p = PRIORIDADE[prioridade] ?? PRIORIDADE.media
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        fontSize: 11.5,
        fontWeight: 600,
        color: p.color,
      }}
    >
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
      {p.label}
    </span>
  )
}

const actionBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-hairline)',
  fontFamily: 'var(--font-ui)',
  fontSize: 12.5,
  cursor: 'pointer',
  background: 'transparent',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
}

export function RecommendationCard({
  bloco,
  onMarcarFeito,
  onPedirCopy,
  pedindo,
  onPedirCriativo,
  pedindoCriativo,
}: {
  bloco: { id: string; config: Record<string, unknown>; annotation: string | null; status: 'active' | 'done' }
  onMarcarFeito?: (id: string, status: 'active' | 'done') => void
  onPedirCopy?: (blocoId: string) => void
  pedindo?: boolean
  onPedirCriativo?: (blocoId: string) => void
  pedindoCriativo?: boolean
}) {
  const cfg = (bloco.config ?? {}) as Partial<RecommendationConfig>
  const titulo = cfg.titulo ?? 'Recomendação'
  const passos = Array.isArray(cfg.passos) ? cfg.passos : []
  const prioridade = cfg.prioridade ?? 'media'
  const escopo = cfg.escopo
  const isAd = escopo?.level === 'ad' && !!escopo.entityId
  const done = bloco.status === 'done'
  const href = escopo?.accountId ? adsManagerUrl(escopo) : null

  return (
    <BlocoCard type="recommendation" done={done} headerRight={<PriorityBadge prioridade={prioridade} />}>
      <h3
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.3,
          color: 'var(--text-primary)',
        }}
      >
        {titulo}
      </h3>

      {}
      {bloco.annotation && (
        <div style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          <Markdown chat>{bloco.annotation}</Markdown>
        </div>
      )}

      {}
      {passos.length > 0 && (
        <ol style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {passos.map((passo, i) => (
            <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--bg-base)',
                  background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}>{passo}</span>
            </li>
          ))}
        </ol>
      )}

      {}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...actionBtn, color: 'var(--text-primary)', background: 'var(--surface-elevated)' }}
          >
            Abrir no Gerenciador
            <span aria-hidden>↗</span>
          </a>
        ) : (
          <span style={{ ...actionBtn, color: 'var(--text-tertiary)', cursor: 'default' }} title="Sem conta vinculada ao escopo">
            Abrir no Gerenciador
          </span>
        )}

        <button
          type="button"
          onClick={() => onMarcarFeito?.(bloco.id, done ? 'active' : 'done')}
          style={{
            ...actionBtn,
            color: done ? 'var(--approve)' : 'var(--text-secondary)',
            borderColor: done ? 'color-mix(in srgb, var(--approve) 40%, transparent)' : 'var(--border-hairline)',
          }}
        >
          {done ? '✓ Concluído' : 'Marcar feito'}
        </button>

        {isAd && onPedirCopy && (
          <button
            type="button"
            disabled={pedindo}
            onClick={() => onPedirCopy(bloco.id)}
            style={{ ...actionBtn, color: pedindo ? 'var(--text-tertiary)' : 'var(--text-secondary)', cursor: pedindo ? 'default' : 'pointer' }}
          >
            {pedindo ? 'Pedindo…' : 'Pedir copy à Lia'}
          </button>
        )}

        {isAd && onPedirCriativo && (
          <button
            type="button"
            disabled={pedindoCriativo}
            onClick={() => onPedirCriativo(bloco.id)}
            style={{ ...actionBtn, color: pedindoCriativo ? 'var(--text-tertiary)' : 'var(--text-secondary)', cursor: pedindoCriativo ? 'default' : 'pointer' }}
          >
            {pedindoCriativo ? 'Pedindo…' : 'Pedir criativo ao Téo'}
          </button>
        )}
      </div>
    </BlocoCard>
  )
}
