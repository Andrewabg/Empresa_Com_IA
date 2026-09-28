import type { AprendizadoUI } from './types'


export function AprendizadosCard({ learnings }: { learnings: AprendizadoUI[] }) {
  if (learnings.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Ainda não aprendeu nada — vai acumulando conforme trabalha.
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {learnings.map((a) => (
        <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{a.summary}</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {new Date(a.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  )
}
