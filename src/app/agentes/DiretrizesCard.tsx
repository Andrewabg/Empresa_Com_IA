import { norm, textosSubstituidos } from '@/lib/directives'
import type { DiretrizUI, SaveState } from './types'



export function DiretrizesCard({
  directives, dirState,
  newDirective, onNewDirectiveChange, onAdd, onRemove, onEdit,
  dirSave, dirDirty, onSave,
}: {
  directives: DiretrizUI[]
  dirState: 'loading' | 'loaded' | 'error'
  newDirective: string
  onNewDirectiveChange: (v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
  onEdit: (i: number, texto: string) => void
  dirSave: SaveState
  dirDirty: boolean
  onSave: () => void
}) {
  if (dirState === 'loading') {
    return <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Carregando…</p>
  }
  if (dirState === 'error') {
    return (
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Não foi possível carregar as diretrizes deste agente.
      </p>
    )
  }
  
  
  
  
  
  
  const substituidas = textosSubstituidos(directives)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {directives.length === 0 && (
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            Nenhuma diretriz ainda. Adicione regras que o agente deve seguir sempre.
          </p>
        )}
        {}
        {directives.map((d, i) => {
          const historico = substituidas.has(norm(d.texto))
          return (
            <div key={d.at} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: historico ? 0.55 : 1 }}>
              <input
                type="text"
                value={d.texto}
                aria-label={`Diretriz ${i + 1}`}
                readOnly={historico}
                title={historico ? 'Substituída. Mantida como histórico, não entra mais nas regras do agente.' : undefined}
                onChange={(e) => onEdit(i, e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: 'border-box',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  padding: '8px 10px',
                  outline: 'none',
                }}
              />
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  fontSize: 10.5,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                  minWidth: 38,
                  textAlign: 'center',
                }}
              >
                {historico ? 'substituída' : d.origem === 'reflector' ? 'auto' : 'você'}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remover diretriz ${i + 1}`}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newDirective}
          placeholder="Adicionar diretriz…"
          aria-label="Nova diretriz"
          onChange={(e) => onNewDirectiveChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
          style={{
            flex: 1, minWidth: 0, boxSizing: 'border-box',
            background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
            fontSize: 13, fontFamily: 'var(--font-ui)', padding: '8px 10px', outline: 'none',
          }}
        />
        <button
          type="button" onClick={onAdd} disabled={!newDirective.trim()}
          style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)', background: 'transparent',
            color: 'var(--text-secondary)', fontSize: 12.5, fontFamily: 'var(--font-ui)',
            cursor: newDirective.trim() ? 'pointer' : 'not-allowed', opacity: newDirective.trim() ? 1 : 0.5,
          }}
        >
          Adicionar
        </button>
      </div>

      {}
      {dirSave.kind === 'error' && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-tertiary)' }}>{dirSave.text}</p>
      )}
      {dirSave.kind === 'saved' && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-tertiary)' }}>
          ✓ Diretrizes salvas — a próxima tarefa do agente já segue.
        </p>
      )}
      <div>
        <button
          type="button" onClick={onSave} disabled={dirSave.kind === 'saving' || !dirDirty}
          style={{
            padding: '9px 18px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))', color: '#fff',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-ui)',
            cursor: dirSave.kind === 'saving' || !dirDirty ? 'not-allowed' : 'pointer',
            opacity: dirSave.kind === 'saving' || !dirDirty ? 0.5 : 1,
          }}
        >
          {dirSave.kind === 'saving' ? 'Salvando…' : 'Salvar diretrizes'}
        </button>
      </div>
    </div>
  )
}
