'use client'




import { motion, useReducedMotion } from 'motion/react'
import type { CampanhaView, PlanoItemStatus } from '@/lib/estudio/types'
import { itensParaArte } from '@/lib/estudio/campanha'

export function CampanhaCard({
  campanha,
  onProduzir,
  onReproduzir,
  producing,
  onProduzirArtes,
  produzindoArtes,
}: {
  campanha: CampanhaView
  onProduzir: (id: string) => void
  onReproduzir?: (id: string, index: number) => void
  producing?: boolean
  
  onProduzirArtes?: (id: string) => void
  produzindoArtes?: boolean
}) {
  const temFila = campanha.plano.some((it) => it.status === 'pendente' || it.status === 'falhou')
  
  const nArtePendente = itensParaArte(campanha.plano).length
  const temArtePendente = nArtePendente > 0

  return (
    <li
      style={{
        listStyle: 'none',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{campanha.nome}</span>
        {campanha.bigIdea && (
          <span
            style={{
              fontSize: 12.5,
              lineHeight: 1.5,
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              borderLeft: '2px solid var(--border-hairline)',
              paddingLeft: 9,
            }}
          >
            {campanha.bigIdea}
          </span>
        )}
      </div>

      {campanha.plano.length > 0 && (
        <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {campanha.plano.map((it, i) => (
            <li
              key={i}
              style={{
                listStyle: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
              }}
            >
              <span style={{ minWidth: 0, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${it.formato} · ${it.canal} · ${it.angulo}`}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{it.formato}</span>
                <span style={{ color: 'var(--text-tertiary)' }}> · {it.canal} · {it.angulo}</span>
              </span>
              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <StatusChip status={it.status} />
                {}
                {it.arte_status && <StatusChip status={it.arte_status} prefixo="arte" />}
                {it.status === 'falhou' && onReproduzir && (
                  <button
                    type="button"
                    onClick={() => onReproduzir(campanha.id, i)}
                    title="Tentar produzir esta peça de novo"
                    style={{
                      flexShrink: 0,
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid color-mix(in srgb, var(--reject) 36%, transparent)',
                      background: 'transparent',
                      color: 'var(--reject)',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 11,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Reproduzir
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {temFila && (
        <button
          type="button"
          onClick={() => onProduzir(campanha.id)}
          disabled={producing}
          style={{
            alignSelf: 'flex-start',
            padding: '9px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
            color: '#fff',
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: producing ? 'not-allowed' : 'pointer',
            opacity: producing ? 0.5 : 1,
          }}
        >
          {producing ? 'Produzindo…' : 'Produzir campanha'}
        </button>
      )}

      {}
      {temArtePendente && onProduzirArtes && (
        <button
          type="button"
          onClick={() => onProduzirArtes(campanha.id)}
          disabled={produzindoArtes}
          style={{
            alignSelf: 'flex-start',
            padding: '9px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: produzindoArtes ? 'not-allowed' : 'pointer',
            opacity: produzindoArtes ? 0.5 : 1,
          }}
        >
          {produzindoArtes ? 'Pedindo…' : `Pedir as artes ao Téo (${nArtePendente})`}
        </button>
      )}
    </li>
  )
}

const CHIP_LABEL: Record<PlanoItemStatus, string> = {
  pendente: 'pendente',
  produzindo: 'produzindo',
  pronta: '✓ pronta',
  falhou: 'falhou',
}


function StatusChip({ status, prefixo }: { status: PlanoItemStatus; prefixo?: string }) {
  const reduced = useReducedMotion()
  const rotulo = prefixo ? `${prefixo}: ${CHIP_LABEL[status]}` : CHIP_LABEL[status]

  if (status === 'produzindo') {
    return (
      <motion.span
        animate={{ opacity: reduced ? 1 : [0.6, 1, 0.6] }}
        transition={reduced ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          flexShrink: 0,
          padding: '2px 9px',
          borderRadius: 999,
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: '#fff',
          background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
          whiteSpace: 'nowrap',
        }}
      >
        {rotulo}
      </motion.span>
    )
  }

  const isFalhou = status === 'falhou'
  return (
    <span
      style={{
        flexShrink: 0,
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        color: isFalhou ? 'var(--reject)' : 'var(--text-tertiary)',
        background: isFalhou ? 'color-mix(in srgb, var(--reject) 12%, transparent)' : 'transparent',
        border: `1px solid ${isFalhou ? 'color-mix(in srgb, var(--reject) 30%, transparent)' : 'color-mix(in srgb, var(--text-tertiary) 34%, transparent)'}`,
      }}
    >
      {rotulo}
    </span>
  )
}
