'use client'


import { useState } from 'react'
import { ConnectionActivateModal } from '@/app/config/ConnectionActivateModal'
import { isIconUrl } from '@/lib/integracoes/icon'
import type { IntegracaoCard as IntegracaoCardModel } from '@/lib/integracoes/projecao'
import { CHIP_SEM_CONEXAO, EXPLICACAO_SEM_CONEXAO } from '@/lib/connections/semAuth'

export interface IntegracaoTileProps {
  card: IntegracaoCardModel
  onMudou: (slug: string, connected: boolean) => void
}

export function IntegracaoTile({ card, onMudou }: IntegracaoTileProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const inicial = (card.name.trim()[0] ?? '?').toUpperCase()

  return (
    <div
      {...(card.semAuth ? { title: EXPLICACAO_SEM_CONEXAO } : {})}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        minWidth: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          overflow: 'hidden',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        {card.icon && isIconUrl(card.icon) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.icon} alt="" width={22} height={22} loading="lazy" decoding="async" style={{ objectFit: 'contain' }} />
        ) : card.icon ? (
          card.icon
        ) : (
          inicial
        )}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.name}
        </span>
        {card.semAuth ? (
          
          
          
          
          <span style={{ fontSize: 11, color: 'var(--approve)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ✓ {CHIP_SEM_CONEXAO}
          </span>
        ) : (
          (card.categoriaLabel ?? card.category) && (
            <span style={{ fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {card.categoriaLabel ?? card.category}
            </span>
          )
        )}
      </div>

      {card.semAuth ? null : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
            fontSize: 12.5,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Conectar
        </button>
      )}

      {modalOpen && (
        <ConnectionActivateModal
          slug={card.slug}
          name={card.name}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onConnected={() => onMudou(card.slug, true)}
        />
      )}
    </div>
  )
}
