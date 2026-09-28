import { avisoDeBracoParado, type BracoParado } from '@/lib/saudeDoMotor'


export function BracoParadoBanner({ bracos }: { bracos: readonly BracoParado[] }) {
  const texto = avisoDeBracoParado(bracos)
  if (!texto) return null
  return (
    <p
      role="alert"
      style={{
        margin: '0 0 16px',
        padding: '11px 16px',
        fontSize: 13,
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderLeft: '2px solid var(--reject)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {texto}
    </p>
  )
}
