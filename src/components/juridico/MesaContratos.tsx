'use client'






import type { ReactNode } from 'react'
import type { ContratoView } from '@/lib/juridico/types'
import { agruparMesa, type GrupoMesa } from '@/lib/juridico/parecer'
import { ContratoCard } from './ContratoCard'


const ORDEM: { grupo: Exclude<GrupoMesa, 'arquivados'>; label: string }[] = [
  { grupo: 'producao', label: 'Em produção' },
  { grupo: 'analises', label: 'Análises' },
  { grupo: 'finalizados', label: 'Finalizados' },
  { grupo: 'modelos', label: 'Modelos da casa' },
]

export function MesaContratos({
  contratos,
  onFocar,
}: {
  contratos: ContratoView[]
  onFocar: (id: string) => void
}) {
  const grupos = agruparMesa(contratos)
  const arquivados = grupos.arquivados
  const temVisivel = ORDEM.some(({ grupo }) => grupos[grupo].length > 0) || arquivados.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 'clamp(16px, 2.5vw, 28px)' }}>
      {!temVisivel && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
          Nenhum contrato na mesa ainda. Peça o primeiro ao Alan aqui do lado.
        </p>
      )}

      {ORDEM.map(({ grupo, label }) => {
        const itens = grupos[grupo]
        if (itens.length === 0) return null
        return (
          <section key={grupo} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <GrupoHeader label={label} count={itens.length} />
            <Grade>
              {itens.map((c) => (
                <ContratoCard key={c.id} contrato={c} onFocar={onFocar} />
              ))}
            </Grade>
          </section>
        )
      })}

      {arquivados.length > 0 && (
        <details style={{ display: 'flex', flexDirection: 'column' }}>
          <summary
            style={{
              cursor: 'pointer',
              listStyle: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Arquivados
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
              {arquivados.length}
            </span>
          </summary>
          <div style={{ marginTop: 10 }}>
            <Grade>
              {arquivados.map((c) => (
                <ContratoCard key={c.id} contrato={c} onFocar={onFocar} />
              ))}
            </Grade>
          </div>
        </details>
      )}
    </div>
  )
}


function GrupoHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </div>
  )
}


function Grade({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
      {children}
    </div>
  )
}
