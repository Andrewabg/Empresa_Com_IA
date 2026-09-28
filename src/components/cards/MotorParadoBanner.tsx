import { avisoDeMotorParado } from '@/lib/saudeDoMotor'


export function MotorParadoBanner({ paradoHaMinutos }: { paradoHaMinutos: number | null }) {
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
      {avisoDeMotorParado(paradoHaMinutos)}
    </p>
  )
}
