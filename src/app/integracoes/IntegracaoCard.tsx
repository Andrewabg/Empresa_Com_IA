'use client'


import { useState } from 'react'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import { ConnectionActivateModal } from '@/app/config/ConnectionActivateModal'
import type { IntegracaoCard as IntegracaoCardModel } from '@/lib/integracoes/projecao'
import { isIconUrl } from '@/lib/integracoes/icon'
import { CHIP_SEM_CONEXAO, EXPLICACAO_SEM_CONEXAO } from '@/lib/connections/semAuth'

export interface IntegracaoCardProps {
  card: IntegracaoCardModel
  
  onMudou: (slug: string, connected: boolean) => void
}


function usadaPorLabel(nomes: string[]): string {
  if (nomes.length === 0) return 'Nenhum funcionário usa ainda'
  const head = nomes.slice(0, 3).join(', ')
  const rest = nomes.length - 3
  return rest > 0 ? `Usada por ${head} +${rest}` : `Usada por ${head}`
}

export function IntegracaoCard({ card, onMudou }: IntegracaoCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleDisconnect() {
    if (disconnecting) return
    setDisconnecting(true)
    setFailed(false)
    
    onMudou(card.slug, false)
    try {
      const r = await fetch('/api/config/connections/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: card.slug }),
      })
      const j = (await r.json().catch(() => null)) as { ok?: boolean } | null
      if (r.ok && j?.ok) {
        setConfirming(false)
      } else {
        onMudou(card.slug, true) 
        setConfirming(false) 
        setFailed(true)
      }
    } catch {
      onMudou(card.slug, true) 
      setConfirming(false) 
      setFailed(true)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        width: '100%',
        padding: 'clamp(18px, 2vw, 24px)',
        background: 'var(--surface)',
        border: `1px solid ${card.connected ? 'rgb(124 92 255 / 0.24)' : 'var(--border-hairline)'}`,
        borderRadius: 'var(--radius-lg)',
        minWidth: 0,
      }}
    >
      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {card.icon ? (
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              fontSize: 22,
              overflow: 'hidden',
            }}
          >
            {isIconUrl(card.icon) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.icon} alt="" width={26} height={26} style={{ objectFit: 'contain' }} />
            ) : (
              card.icon
            )}
          </span>
        ) : (
          <AgentWaveAvatar agentId={card.slug} size={48} lit={card.connected} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
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
            {card.connected && (
              <span
                aria-hidden
                title="Conectado"
                style={{
                  width: 7,
                  height: 7,
                  flexShrink: 0,
                  borderRadius: 99,
                  background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                  boxShadow: '0 0 6px rgb(40 224 200 / 0.6)',
                }}
              />
            )}
          </div>
          {(card.categoriaLabel ?? card.category) && (
            <span
              style={{
                fontSize: 11,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              {card.categoriaLabel ?? card.category}
            </span>
          )}
        </div>
      </div>

      {card.descricao && (
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {card.descricao}
        </p>
      )}

      {}
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: 'var(--text-tertiary)',
        }}
      >
        {usadaPorLabel(card.usadaPor)}
      </p>

      {}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 12,
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          minHeight: 34,
        }}
      >
        {card.semAuth ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12.5,
              color: 'var(--approve)',
            }}
            title={EXPLICACAO_SEM_CONEXAO}
          >
            <span aria-hidden>✓</span> {CHIP_SEM_CONEXAO}
          </span>
        ) : card.connected ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12.5,
              color: 'var(--approve)',
            }}
          >
            <span aria-hidden>✓</span> conectado
          </span>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>a conectar</span>
        )}

        {}
        {card.semAuth ? null : card.connected ? (
          confirming ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--text-tertiary)', textAlign: 'right', maxWidth: 220 }}>
                {card.usadaPor.length > 0
                  ? `Usada por ${card.usadaPor.length} ${card.usadaPor.length === 1 ? 'funcionário' : 'funcionários'} — desconectar remove a conta pra todos e eles voltam a mostrar “a conectar”.`
                  : 'Desconectar remove a conta; os agentes que a pedem voltam a mostrar “a conectar”.'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface-elevated)',
                    color: 'var(--reject)',
                    fontSize: 12.5,
                    fontFamily: 'var(--font-ui)',
                    cursor: disconnecting ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {disconnecting ? 'Desconectando…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={disconnecting}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    fontSize: 12.5,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </span>
            </div>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {failed && <span style={{ fontSize: 11.5, color: 'var(--reject)' }}>falhou</span>}
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                style={{
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
                Reconectar
              </button>
              <button
                type="button"
                onClick={() => {
                  setFailed(false)
                  setConfirming(true)
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  fontSize: 12.5,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Desconectar
              </button>
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid transparent',
              background: 'linear-gradient(110deg, var(--wave-from), var(--wave-to))',
              color: 'var(--bg-base)',
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Conectar
          </button>
        )}
      </div>

      {modalOpen && (
        <ConnectionActivateModal
          slug={card.slug}
          name={card.name}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onConnected={() => {
            
            onMudou(card.slug, true)
          }}
        />
      )}
    </div>
  )
}
