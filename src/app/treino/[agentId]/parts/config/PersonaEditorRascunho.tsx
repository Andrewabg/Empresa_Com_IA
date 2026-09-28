'use client'



import { useState } from 'react'

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>
      {children}
    </span>
  )
}

export interface PersonaCamposEditaveis {
  quem_e: string
  tom: string
  nunca_faz: string[]
}

interface Props {
  quemE: string
  tom: string
  nuncaFaz: string[]
  onQuemEChange: (v: string) => void
  onTomChange: (v: string) => void
  onNuncaFazChange: (v: string[]) => void
}

export function PersonaEditorRascunho({ quemE, tom, nuncaFaz, onQuemEChange, onTomChange, onNuncaFazChange }: Props) {
  const [novoItem, setNovoItem] = useState('')

  function adicionarItem() {
    const v = novoItem.trim()
    if (!v || nuncaFaz.includes(v)) { setNovoItem(''); return }
    onNuncaFazChange([...nuncaFaz, v])
    setNovoItem('')
  }

  function removerItem(item: string) {
    onNuncaFazChange(nuncaFaz.filter((x) => x !== item))
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Label>Quem ela é</Label>
        <input
          type="text"
          value={quemE}
          onChange={(e) => onQuemEChange(e.target.value)}
          placeholder="Ex.: atendente da recepção, acolhedora e objetiva"
          style={inputBase}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Label>Tom</Label>
        <input
          type="text"
          value={tom}
          onChange={(e) => onTomChange(e.target.value)}
          placeholder="Ex.: caloroso, direto, sem formalidade excessiva"
          style={inputBase}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Label>O que ela nunca faz</Label>
        {nuncaFaz.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {nuncaFaz.map((item) => (
              <span
                key={item}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface-elevated)',
                  fontSize: 12.5,
                  color: 'var(--text-secondary)',
                }}
              >
                {item}
                <button
                  type="button"
                  aria-label={`Remover "${item}"`}
                  onClick={() => removerItem(item)}
                  style={{
                    padding: 0, margin: 0, border: 'none',
                    background: 'transparent', color: 'var(--text-tertiary)',
                    cursor: 'pointer', fontSize: 13, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarItem() } }}
            placeholder='Ex.: "Fazer promessas que não pode cumprir"'
            style={{ ...inputBase, flex: 1 }}
          />
          <button
            type="button"
            onClick={adicionarItem}
            disabled={!novoItem.trim()}
            style={{
              flexShrink: 0, padding: '8px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
              color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
              cursor: novoItem.trim() ? 'pointer' : 'not-allowed', opacity: novoItem.trim() ? 1 : 0.5,
            }}
          >
            + Adicionar
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: 'var(--text-tertiary)' }}>
          Comportamentos proibidos. Adicione um por vez e pressione Enter.
        </p>
      </div>
    </>
  )
}
