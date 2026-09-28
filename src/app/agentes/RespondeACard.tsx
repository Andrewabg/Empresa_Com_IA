'use client'

import type { Agent, SaveState } from './types'
import { Card } from './parts'


export function RespondeACard({
  agent, options, save, onChange,
}: {
  agent: Agent
  
  options: { id: string; name: string; role: string }[]
  save: SaveState
  onChange: (managerId: string) => void
}) {
  return (
    <Card label="Responde a" style={{ minWidth: 0, flex: '0 0 auto' }}>
      {options.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>Nenhum gerente disponível.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <select
            aria-label={`Gerente de ${agent.name}`}
            value={agent.manager_id ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={save.kind === 'saving'}
            style={{
              width: '100%', boxSizing: 'border-box', background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13,
              padding: '9px 11px', cursor: save.kind === 'saving' ? 'wait' : 'pointer', outline: 'none',
            }}
          >
            {}
            {agent.manager_id === null && <option value="" disabled>— escolher —</option>}
            {options.map((m) => (
              <option key={m.id} value={m.id}>{m.name} · {m.role}</option>
            ))}
          </select>
          {save.kind === 'saved' && <span style={{ fontSize: 12, color: 'var(--approve)' }}>✓ salvo</span>}
          {save.kind === 'error' && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{save.text}</span>}
        </div>
      )}
    </Card>
  )
}
