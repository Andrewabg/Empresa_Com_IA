'use client'







import { useEffect, useState } from 'react'

export interface ConjuntoItem { id: string; nome: string }

interface ConjuntoPickerProps {
  conjuntos: ConjuntoItem[]
  loading: boolean
  onEscolher: (adsetId: string) => void
  onFechar: () => void
}

export function ConjuntoPicker({ conjuntos, loading, onEscolher, onFechar }: ConjuntoPickerProps) {
  const [idManual, setIdManual] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  return (
    <>
      <div
        role="presentation"
        onClick={onFechar}
        style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.50)', zIndex: 60 }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lançar arte como anúncio"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 61,
          width: 'min(440px, 92vw)',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 60px rgb(0 0 0 / 0.50)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-hairline)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Lançar como anúncio
          </span>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              background: 'transparent',
              color: 'var(--text-tertiary)',
              fontSize: 15,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px 18px' }}>
          {loading ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
              Carregando conjuntos…
            </p>
          ) : conjuntos.length > 0 ? (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-tertiary)' }}>
                Em qual conjunto o Rui deve propor este anúncio? Ele sobe PAUSADO, e só depois
                da sua aprovação.
              </p>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {conjuntos.map((c) => (
                  <li key={c.id}>
                    <ConjuntoBtn conjunto={c} onClick={() => onEscolher(c.id)} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                O Rui ainda não leu nenhum conjunto desta conta. Peça o relatório a ele no
                /trafego — ou cole o ID do conjunto direto:
              </p>
              <input
                type="text"
                value={idManual}
                onChange={(e) => setIdManual(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && idManual.trim()) onEscolher(idManual.trim()) }}
                placeholder="ex: 120215000000000000"
                aria-label="ID do conjunto"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}

function ConjuntoBtn({ conjunto, onClick }: { conjunto: ConjuntoItem; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '9px 11px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-hairline)'}`,
        background: hover ? 'var(--surface-elevated)' : 'transparent',
        color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 13,
        cursor: 'pointer',
        transition: 'color 140ms ease, border-color 140ms ease, background 140ms ease',
      }}
    >
      {conjunto.nome}
    </button>
  )
}
