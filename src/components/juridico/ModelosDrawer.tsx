'use client'





import { useState } from 'react'
import type { ContratoView } from '@/lib/juridico/types'
import { MODELOS_FABRICA } from '@/lib/juridico/modelosFabrica'

export function ModelosDrawer({
  modelos,
  onFocar,
}: {
  modelos: ContratoView[]
  onFocar: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 2px' }}>
      {}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SecaoTitulo>De fábrica</SecaoTitulo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MODELOS_FABRICA.map((m) => (
            <div
              key={m.tipo}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '11px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{m.nome}</span>
                <Badge>de fábrica</Badge>
              </div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{m.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      {}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SecaoTitulo>Da casa</SecaoTitulo>
        {modelos.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
            Nenhum modelo da casa ainda. Salve um contrato que ficou bom pra reusar depois.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {modelos.map((m) => (
              <ModeloCasaRow key={m.id} modelo={m} onFocar={onFocar} />
            ))}
          </div>
        )}
      </section>

      {}
      <p
        style={{
          margin: 0,
          paddingTop: 12,
          borderTop: '1px solid var(--border-hairline)',
          fontSize: 12,
          lineHeight: 1.55,
          color: 'var(--text-tertiary)',
        }}
      >
        Peça: <span style={{ color: 'var(--text-secondary)' }}>"Alan, salva esse contrato como modelo da casa"</span>
      </p>
    </div>
  )
}


function ModeloCasaRow({ modelo, onFocar }: { modelo: ContratoView; onFocar: (id: string) => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onFocar(modelo.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        padding: '11px 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)',
        background: hover ? 'var(--surface-elevated)' : 'var(--surface)',
        cursor: 'pointer',
        transition: 'background 140ms ease',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {modelo.titulo}
      </span>
      <Badge>da casa</Badge>
    </button>
  )
}


function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
      }}
    >
      {children}
    </span>
  )
}


function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 10.5,
        lineHeight: 1.4,
        color: 'var(--text-tertiary)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
