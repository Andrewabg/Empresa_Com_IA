'use client'






import { useEffect, useState } from 'react'

export interface AdItem { id: string; nome: string | null; roas?: number; ctr?: number; spend?: number }

interface NoArPickerProps {
  pecaId: string
  ads: AdItem[]
  loading: boolean
  onEscolher: (pecaId: string, adId: string, metricas?: { roas?: number; ctr?: number; spend?: number; nome?: string | null }) => void
  onFechar: () => void
}

export function NoArPicker({ pecaId, ads, loading, onEscolher, onFechar }: NoArPickerProps) {
  const [idManual, setIdManual] = useState('')

  
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  return (
    <>
      {}
      <div
        role="presentation"
        onClick={onFechar}
        style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.50)', zIndex: 60 }}
      />

      {}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Marcar peça no ar"
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
        {}
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
            Marcar peça no ar
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

        {}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px 18px' }}>
          {loading ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
              Carregando anúncios…
            </p>
          ) : ads.length > 0 ? (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-tertiary)' }}>
                Escolha o anúncio que esta peça virou:
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
                {ads.map((ad) => (
                  <li key={ad.id}>
                    <AdBtn ad={ad} onClick={() => onEscolher(pecaId, ad.id, { roas: ad.roas, ctr: ad.ctr, spend: ad.spend, nome: ad.nome })} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                Nenhum anúncio encontrado na conta. Cole o ID do anúncio Meta diretamente:
              </p>
              <input
                type="text"
                value={idManual}
                onChange={(e) => setIdManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && idManual.trim()) onEscolher(pecaId, idManual.trim())
                }}
                placeholder="ex: 120215000000000000"
                aria-label="ID do anúncio"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-ui)',
                }}
              />
              <button
                type="button"
                disabled={!idManual.trim()}
                onClick={() => { if (idManual.trim()) onEscolher(pecaId, idManual.trim()) }}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: idManual.trim() ? 'pointer' : 'default',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--bg-base)',
                  background: idManual.trim()
                    ? 'linear-gradient(120deg, var(--wave-from), var(--wave-to))'
                    : 'var(--surface-elevated)',
                  opacity: idManual.trim() ? 1 : 0.45,
                  transition: 'opacity 140ms ease',
                }}
              >
                Confirmar ID
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}


function AdBtn({ ad, onClick }: { ad: AdItem; onClick: () => void }) {
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
        padding: '9px 12px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${hover ? 'var(--wave-from)' : 'var(--border-hairline)'}`,
        background: hover ? 'var(--surface)' : 'var(--surface-elevated)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 13,
        color: 'var(--text-primary)',
        transition: 'border-color 120ms ease, background 120ms ease',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ad.nome ?? ad.id}
      </span>
      {ad.roas !== undefined && (
        <span
          style={{
            flexShrink: 0,
            fontSize: 12,
            color: 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ROAS {ad.roas.toFixed(1)}x
        </span>
      )}
    </button>
  )
}
