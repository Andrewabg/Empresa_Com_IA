'use client'






import { BlocoCard } from './BlocoCard'

export interface HealthConfig {
  title?: string
  
  reprovados?: number
  
  aprendizadoLimitado?: { nome: string }[]
  
  alertas?: string[]
}

const RED = 'var(--reject)'
const AMBER = 'rgb(214 158 46)'
const GREEN = 'var(--approve)'

function IssueRow({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '9px 2px',
        borderBottom: '1px solid var(--border-hairline)',
      }}
    >
      <span
        aria-hidden
        style={{ flexShrink: 0, width: 7, height: 7, borderRadius: '50%', background: color, marginTop: 5 }}
      />
      <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}>{children}</span>
    </div>
  )
}

export function HealthBlock({
  bloco,
}: {
  bloco: { config: Record<string, unknown>; annotation: string | null }
}) {
  const cfg = (bloco.config ?? {}) as Partial<HealthConfig>
  const reprovados = typeof cfg.reprovados === 'number' && cfg.reprovados > 0 ? cfg.reprovados : 0
  const limitado = Array.isArray(cfg.aprendizadoLimitado) ? cfg.aprendizadoLimitado : []
  const alertas = Array.isArray(cfg.alertas) ? cfg.alertas.filter((a) => typeof a === 'string' && a.trim() !== '') : []

  const total = (reprovados > 0 ? 1 : 0) + limitado.length + alertas.length

  return (
    <BlocoCard type="health" annotation={bloco.annotation}>
      {total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Conta saudável — nenhum problema de entrega detectado.
          </span>
        </div>
      ) : (
        <div className="cc-scroll" style={{ maxHeight: 280, display: 'flex', flexDirection: 'column' }}>
          {reprovados > 0 && (
            <IssueRow color={RED}>
              <strong style={{ fontWeight: 600 }}>{reprovados}</strong>{' '}
              {reprovados === 1 ? 'anúncio reprovado' : 'anúncios reprovados'} na revisão do Meta
            </IssueRow>
          )}
          {limitado.map((c, i) => (
            <IssueRow key={`lim-${i}`} color={AMBER}>
              <span style={{ color: 'var(--text-secondary)' }}>Aprendizado limitado: </span>
              {c.nome}
            </IssueRow>
          ))}
          {alertas.map((a, i) => (
            <IssueRow key={`alert-${i}`} color={AMBER}>
              {a}
            </IssueRow>
          ))}
        </div>
      )}
    </BlocoCard>
  )
}
