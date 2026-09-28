import type { Agent, SaveState } from './types'
import { Toggle } from './parts'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'

export function EditorTopBar({ agent, effectiveModel, enabled, onToggleEnabled, dirty, save, onSave, locked }: {
  agent: Agent
  effectiveModel: string
  enabled: boolean
  onToggleEnabled: (v: boolean) => void
  dirty: boolean
  save: SaveState
  onSave: () => void
  
  locked?: boolean
}) {
  const saving = save.kind === 'saving'
  return (
    <div style={{
      flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      padding: '12px 16px', background: 'var(--surface)',
      border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)',
    }}>
      {}
      <AgentWaveAvatar agentId={agent.id} size={48} lit={enabled} />

      {}
      <div style={{ minWidth: 0, marginRight: 'auto', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
          {agent.name}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>· {agent.role}</span>
      </div>

      {}
      <code title="fixo nesta versão" style={{
        fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)',
        background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-sm)', padding: '3px 9px', flexShrink: 0,
      }}>
        {effectiveModel}
      </code>

      {}
      <div title={locked ? 'Este atendente é editado pelo Treino.' : 'Quando desligado, o agente não responde. O Nathan principal deve ficar ativo.'} style={{ flexShrink: 0, minWidth: 120 }}>
        <Toggle id="agent-enabled" label="ativo" checked={enabled} onChange={onToggleEnabled} disabled={locked} />
      </div>

      {locked ? (
        
        <span
          title="Abra o Treino para editar com segurança."
          style={{ flexShrink: 0, maxWidth: 260, fontSize: 12.5, lineHeight: 1.4, color: 'var(--text-tertiary)', textAlign: 'right' }}
        >
          Este atendente é editado pelo Treino.
        </span>
      ) : (
        <>
          {}
          {save.kind === 'error' && (
            <span title={save.text} style={{ fontSize: 12.5, color: 'var(--reject)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {save.text}
            </span>
          )}
          {save.kind === 'saved' && (
            <span style={{ fontSize: 12.5, color: 'var(--approve)', flexShrink: 0 }}>✓ Salvo</span>
          )}
          {dirty && save.kind !== 'saving' && save.kind !== 'error' && (
            <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', flexShrink: 0 }}>alterações não salvas</span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500,
              color: 'var(--bg-base)', background: 'var(--text-primary)',
              border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '10px 24px',
              cursor: saving || !dirty ? 'not-allowed' : 'pointer', opacity: saving || !dirty ? 0.5 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      )}
    </div>
  )
}
