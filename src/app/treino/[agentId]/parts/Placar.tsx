'use client'



import { useCallback, useState } from 'react'

interface Placar {
  total: number
  passando: number
  quebrados: string[]
  instaveis: string[]
}

export function Placar({
  agentId,
  totalTestes,
  initialPlacar,
}: {
  agentId: string
  totalTestes: number
  initialPlacar?: Placar | null
}) {
  const [placar, setPlacar] = useState<Placar | null>(initialPlacar ?? null)
  const [rodando, setRodando] = useState(false)
  const [erroMsg, setErroMsg] = useState<string | null>(null)

  const rodarTodos = useCallback(async () => {
    setRodando(true)
    setErroMsg(null)
    try {
      const res = await fetch('/api/treino/replay-tudo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        placar?: Placar
        error?: string
        reason?: string
      }
      if (j.placar) {
        setPlacar(j.placar)
      } else if (j.reason === 'sem_chave' && j.error) {
        
        
        setErroMsg(j.error)
      } else {
        setErroMsg('Erro ao rodar os testes. Tente novamente.')
      }
    } catch {
      setErroMsg('Erro ao conectar. Tente novamente.')
    } finally {
      setRodando(false)
    }
  }, [agentId])

  const temTestes = totalTestes > 0

  return (
    <div
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Placar de testes
        </span>
        <span
          style={{
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
          }}
        >
          {totalTestes} teste{totalTestes !== 1 ? 's' : ''} guardado{totalTestes !== 1 ? 's' : ''}
        </span>
      </div>

      {}
      {placar ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {}
          <div
            style={{
              flex: 1,
              minWidth: 80,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: placar.passando === placar.total && placar.total > 0
                ? '1px solid rgb(63 185 132 / 0.4)'
                : '1px solid var(--border-hairline)',
              background: placar.passando === placar.total && placar.total > 0
                ? 'rgb(63 185 132 / 0.06)'
                : 'var(--surface-elevated)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: placar.passando === placar.total && placar.total > 0
                  ? 'var(--color-approve)'
                  : 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {placar.passando}
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-tertiary)' }}>
                /{placar.total}
              </span>
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
              passando
            </p>
          </div>

          {}
          {placar.quebrados.length > 0 && (
            <div
              style={{
                flex: 1,
                minWidth: 80,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgb(229 99 77 / 0.35)',
                background: 'rgb(229 99 77 / 0.05)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-reject)',
                  lineHeight: 1.1,
                }}
              >
                {placar.quebrados.length}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                quebrado{placar.quebrados.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {}
          {placar.instaveis.length > 0 && (
            <div
              style={{
                flex: 1,
                minWidth: 80,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgb(255 200 50 / 0.3)',
                background: 'rgb(255 200 50 / 0.04)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'rgb(255 200 50)',
                  lineHeight: 1.1,
                }}
              >
                {placar.instaveis.length}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                instável{placar.instaveis.length !== 1 ? 'is' : ''}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
          {temTestes
            ? 'Ainda não rodou os testes. Clique em "Rodar todos" para conferir.'
            : 'Nenhum teste guardado ainda. Corrija um caso e ele vira teste automático.'}
        </p>
      )}

      {erroMsg && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-reject)' }}>
          {erroMsg}
        </p>
      )}

      {}
      <button
        type="button"
        onClick={() => void rodarTodos()}
        disabled={rodando || !temTestes}
        style={{
          padding: '8px 0',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)',
          background:
            rodando || !temTestes
              ? 'var(--surface-elevated)'
              : 'var(--surface-elevated)',
          color: rodando || !temTestes ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          fontSize: 13,
          fontWeight: 500,
          cursor: rodando || !temTestes ? 'not-allowed' : 'pointer',
          width: '100%',
          opacity: rodando || !temTestes ? 0.6 : 1,
        }}
      >
        {rodando ? 'Rodando testes…' : 'Rodar todos'}
      </button>
    </div>
  )
}
