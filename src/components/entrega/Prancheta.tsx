'use client'







import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { ImgCriativo } from '@/components/design/ImgCriativo'
import type { EstadoItem, ItemDaEntrega } from '@/lib/entrega/types'

export interface RotulosDaEquipe { copy: string; arte: string }


export function rotuloDoEstado(item: ItemDaEntrega, equipe: RotulosDaEquipe): string {
  switch (item.estado) {
    case 'na-fila': return 'na fila'
    case 'escrevendo': return `${equipe.copy} escrevendo`
    case 'texto-pronto': return `texto pronto, com ${equipe.arte}`
    case 'desenhando': return `${equipe.arte} desenhando`
    case 'pronto': return 'pronta'
    case 'travado': return 'travou'
  }
}

const EM_VOO: ReadonlySet<EstadoItem> = new Set<EstadoItem>(['escrevendo', 'desenhando'])

export function Prancheta({
  itens,
  equipe,
}: {
  itens: ItemDaEntrega[]
  equipe: RotulosDaEquipe
}) {
  if (!itens.length) {
    return (
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
        Esta entrega não tem itens no plano.
      </p>
    )
  }

  return (
    <ul
      style={{
        margin: 0, padding: 0, listStyle: 'none',
        display: 'grid', gap: 10,
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
      }}
    >
      {itens.map((item) => (
        <ItemDaPrancheta key={item.indice} item={item} equipe={equipe} />
      ))}
    </ul>
  )
}

function ItemDaPrancheta({ item, equipe }: { item: ItemDaEntrega; equipe: RotulosDaEquipe }) {
  const rotulo = rotuloDoEstado(item, equipe)
  
  
  const destino = item.criativoId ? '/design' : item.pecaId ? '/copy' : null

  const corpo = (
    <>
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface-elevated)',
        }}
      >
        {item.artifactId ? (
          <ImgCriativo artifactId={item.artifactId} alt={`Arte de ${item.formatoNome}`} ratio={4 / 5} />
        ) : (
          <div style={{ width: '100%', aspectRatio: 4 / 5, display: 'grid', placeItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', padding: '0 12px' }}>
              {item.estado === 'travado' ? 'sem entrega' : 'em produção'}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <span
          title={`${item.formatoNome} · ${item.canal} · ${item.angulo}`}
          style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {item.formatoNome}
        </span>
        {item.angulo && (
          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.angulo}
          </span>
        )}
        <ChipDoEstado estado={item.estado} rotulo={rotulo} />
      </div>
    </>
  )

  const estilo: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: 10,
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-hairline)',
    background: 'var(--surface)',
    textDecoration: 'none',
    minWidth: 0,
  }

  return (
    <li style={{ listStyle: 'none', minWidth: 0 }}>
      {destino ? <Link href={destino} style={estilo}>{corpo}</Link> : <div style={estilo}>{corpo}</div>}
    </li>
  )
}


function ChipDoEstado({ estado, rotulo }: { estado: EstadoItem; rotulo: string }) {
  const reduced = useReducedMotion()

  if (EM_VOO.has(estado)) {
    return (
      <motion.span
        animate={{ opacity: reduced ? 1 : [0.62, 1, 0.62] }}
        transition={reduced ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          alignSelf: 'flex-start', padding: '2px 9px', borderRadius: 999,
          fontSize: 10.5, fontWeight: 600, letterSpacing: '0.02em', color: '#fff',
          background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {rotulo}
      </motion.span>
    )
  }

  const travou = estado === 'travado'
  const pronto = estado === 'pronto'
  return (
    <span
      style={{
        alignSelf: 'flex-start', padding: '2px 9px', borderRadius: 999,
        fontSize: 10.5, fontWeight: 600, letterSpacing: '0.02em',
        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: travou ? 'var(--reject)' : pronto ? 'var(--text-secondary)' : 'var(--text-tertiary)',
        background: travou ? 'color-mix(in srgb, var(--reject) 12%, transparent)' : 'transparent',
        border: `1px solid ${travou ? 'color-mix(in srgb, var(--reject) 30%, transparent)' : 'color-mix(in srgb, var(--text-tertiary) 34%, transparent)'}`,
      }}
    >
      {pronto ? `✓ ${rotulo}` : rotulo}
    </span>
  )
}
