'use client'



const inputBase: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-ui)',
  fontSize: 13.5,
  color: 'var(--text-primary)',
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 11px',
  outline: 'none',
}

export interface EntradaBaseView {
  id?: string
  titulo: string
  conteudo: string
  tipo: 'fato' | 'playbook'
  enabled: boolean
  editavel: boolean                          
  origem?: 'operador' | 'aprendizado'        
}

interface Props {
  entradas: EntradaBaseView[]
  onChange: (next: EntradaBaseView[]) => void
}

function GrupoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>
      {children}
    </span>
  )
}

function Badge({ children, tone = 'neutro' }: { children: React.ReactNode; tone?: 'neutro' | 'suave' }) {
  return (
    <span style={{
      flexShrink: 0, padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 500,
      letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.5,
      border: '1px solid var(--border-hairline)',
      background: tone === 'suave' ? 'transparent' : 'var(--surface-elevated)',
      color: 'var(--text-tertiary)',
    }}>
      {children}
    </span>
  )
}

export function BaseEditor({ entradas, onChange }: Props) {
  
  function patchEntry(idx: number, patch: Partial<EntradaBaseView>) {
    onChange(entradas.map((e, i) => (i === idx ? { ...e, ...patch } : e)))
  }
  function removeEntry(idx: number) {
    onChange(entradas.filter((_, i) => i !== idx))
  }
  function addEntry(tipo: 'fato' | 'playbook') {
    onChange([
      ...entradas,
      { titulo: '', conteudo: '', tipo, enabled: true, editavel: true, origem: 'operador' },
    ])
  }

  
  const comIndice = entradas.map((e, idx) => ({ e, idx }))
  const fatos = comIndice.filter(({ e }) => e.tipo === 'fato')
  const playbooks = comIndice.filter(({ e }) => e.tipo === 'playbook')

  function renderEntrada({ e, idx }: { e: EntradaBaseView; idx: number }) {
    if (!e.editavel) {
      
      return (
        <li key={e.id ?? `g-${idx}`} style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: '9px 11px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)', background: 'transparent',
          opacity: 0.72,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
              {e.titulo || 'Sem título'}
            </span>
            <Badge tone="suave">compartilhada</Badge>
          </div>
          {e.conteudo && (
            <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>{e.conteudo}</span>
          )}
        </li>
      )
    }

    
    return (
      <li key={e.id ?? `n-${idx}`} style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '10px 11px', borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)', background: 'var(--surface)',
        opacity: e.enabled ? 1 : 0.6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={e.titulo}
            onChange={(ev) => patchEntry(idx, { titulo: ev.target.value })}
            placeholder="Título"
            style={{ ...inputBase, flex: 1, fontWeight: 500 }}
          />
          <Badge>{e.origem === 'aprendizado' ? 'aprendido' : 'criado por você'}</Badge>
          <button
            type="button"
            onClick={() => patchEntry(idx, { enabled: !e.enabled })}
            aria-label={e.enabled ? 'Desligar' : 'Ativar'}
            title={e.enabled ? 'Ativo — clique para desligar' : 'Desligado — clique para ativar'}
            style={{
              flexShrink: 0, padding: '5px 10px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              background: e.enabled ? 'var(--surface-elevated)' : 'transparent',
              color: e.enabled ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              fontSize: 11.5, fontWeight: 500, cursor: 'pointer', lineHeight: 1,
            }}
          >
            {e.enabled ? 'ativo' : 'desligado'}
          </button>
          <button
            type="button"
            onClick={() => removeEntry(idx)}
            aria-label="Remover"
            style={{
              flexShrink: 0, width: 26, height: 26, display: 'grid', placeItems: 'center',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)',
              background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer',
              fontSize: 15, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <textarea
          value={e.conteudo}
          onChange={(ev) => patchEntry(idx, { conteudo: ev.target.value })}
          placeholder={e.tipo === 'fato' ? 'A informação que ela deve saber…' : 'Como ela deve agir nessa situação…'}
          rows={2}
          style={{ ...inputBase, resize: 'vertical', lineHeight: 1.5, minHeight: 52 }}
        />
      </li>
    )
  }

  const addBtn: React.CSSProperties = {
    flexShrink: 0, padding: '7px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
    color: 'var(--text-primary)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {entradas.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          Nenhum conhecimento ainda — adicione um fato ou playbook.
        </p>
      ) : (
        <>
          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <GrupoLabel>Fatos</GrupoLabel>
            {fatos.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>Nenhum fato ainda.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fatos.map(renderEntrada)}
              </ul>
            )}
          </div>

          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <GrupoLabel>Playbooks</GrupoLabel>
            {playbooks.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>Nenhum playbook ainda.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {playbooks.map(renderEntrada)}
              </ul>
            )}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => addEntry('fato')} style={addBtn}>+ Fato</button>
        <button type="button" onClick={() => addEntry('playbook')} style={addBtn}>+ Playbook</button>
      </div>
    </div>
  )
}
