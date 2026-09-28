'use client'



import { TestButton } from './ui'



export type ConnState = 'connected' | 'testada' | 'warn' | 'conta' | 'off'

function StatusPill({ state }: { state: ConnState }) {
  const map: Record<ConnState, { color: string; bg: string; border: string; label: string }> = {
    connected: { color: 'var(--approve)', bg: 'rgb(63 185 132 / 0.12)', border: 'rgb(63 185 132 / 0.25)', label: 'Conectado' },
    testada: { color: 'var(--approve)', bg: 'rgb(63 185 132 / 0.12)', border: 'rgb(63 185 132 / 0.25)', label: 'Testada, falta salvar' },
    warn: { color: '#e0a94a', bg: 'rgb(214 158 46 / 0.12)', border: 'rgb(214 158 46 / 0.28)', label: 'Verifique a chave' },
    conta: { color: '#e0a94a', bg: 'rgb(214 158 46 / 0.12)', border: 'rgb(214 158 46 / 0.28)', label: 'Confira sua conta' },
    off: { color: 'var(--text-tertiary)', bg: 'rgb(255 255 255 / 0.04)', border: 'var(--border-hairline)', label: 'Não conectado' },
  }
  const s = map[state]
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 500,
        color: s.color, background: s.bg, border: `1px solid ${s.border}`, whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
      {s.label}
    </span>
  )
}

export function ConnectionRow({
  index,
  title,
  description,
  detail,
  state,
  configured,
  editing,
  onEdit,
  onCancel,
  onTest,
  testing,
  collapsedResult,
  children,
}: {
  index: number
  title: string
  description: string
  
  detail?: React.ReactNode
  state: ConnState
  configured: boolean
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onTest: () => void
  testing: boolean
  collapsedResult?: React.ReactNode
  children: React.ReactNode
}) {
  const open = editing || !configured
  return (
    <section
      style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        padding: '18px 20px',
        background: 'var(--surface)',
        border: `1px solid ${state === 'warn' ? 'rgb(214 158 46 / 0.28)' : 'var(--border-hairline)'}`,
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              flexShrink: 0, width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center',
              fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-display)',
              color: state === 'connected' ? 'var(--wave-from)' : 'var(--text-tertiary)',
              background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)',
            }}
          >
            {index}
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {description}
            </p>
            {detail && (
              <p style={{ margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.4, fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                {detail}
              </p>
            )}
          </div>
        </div>
        <StatusPill state={state} />
      </div>

      {open ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
          {configured && editing && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                alignSelf: 'flex-start', marginTop: 2,
                background: 'transparent', border: 'none', padding: '2px 0',
                color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: 12.5, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TestButton onClick={onTest} testing={testing} />
            <button
              type="button"
              onClick={onEdit}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-ui)', cursor: 'pointer',
              }}
            >
              Trocar
            </button>
          </div>
          {collapsedResult}
        </div>
      )}
    </section>
  )
}
