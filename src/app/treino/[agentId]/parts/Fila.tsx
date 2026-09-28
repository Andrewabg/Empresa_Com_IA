'use client'



import type { TreinoCaso } from '@/data/treino'
import { filtrarAbertos, ordenarFila } from '@/lib/treino/fila'

const ORIGEM_LABEL: Record<string, string> = {
  marcado: 'Marcado',
  escalacao: 'Escalação',
  auto: 'Auto',
  cliente: 'Cliente',
}

const ORIGEM_COLOR: Record<string, string> = {
  marcado: 'rgb(40 224 200 / 0.18)',
  escalacao: 'rgb(229 99 77 / 0.18)',
  auto: 'var(--surface-elevated)',
  cliente: 'rgb(124 92 255 / 0.14)',
}

const ORIGEM_BORDER: Record<string, string> = {
  marcado: 'rgb(40 224 200 / 0.35)',
  escalacao: 'rgb(229 99 77 / 0.35)',
  auto: 'var(--border-hairline)',
  cliente: 'rgb(124 92 255 / 0.3)',
}

function OrigemBadge({ origem }: { origem: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 999,
        border: `1px solid ${ORIGEM_BORDER[origem] ?? 'var(--border-hairline)'}`,
        background: ORIGEM_COLOR[origem] ?? 'var(--surface-elevated)',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--text-secondary)',
        lineHeight: '17px',
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
    >
      {ORIGEM_LABEL[origem] ?? origem}
    </span>
  )
}


function ultimaDoCliente(
  mensagens: { role: 'user' | 'assistant'; content: string }[],
): string {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    if (mensagens[i].role === 'user') return mensagens[i].content
  }
  return ''
}

export function Fila({
  casos,
  casoSelecionadoId,
  onSelect,
}: {
  casos: TreinoCaso[]
  casoSelecionadoId: string | null
  onSelect: (caso: TreinoCaso) => void
}) {
  const fila = ordenarFila(filtrarAbertos(casos))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {}
      <div
        style={{
          flex: '0 0 auto',
          padding: '13px 16px 9px',
          borderBottom: '1px solid var(--border-hairline)',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Fila de casos
        </span>
        {fila.length > 0 && (
          <span
            style={{
              marginLeft: 8,
              display: 'inline-block',
              padding: '0 6px',
              borderRadius: 999,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              fontSize: 11,
              color: 'var(--text-tertiary)',
              lineHeight: '17px',
            }}
          >
            {fila.length}
          </span>
        )}
      </div>

      {}
      <div
        className="cc-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {fila.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '32px 16px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 24, opacity: 0.25 }}>✓</span>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Nenhum caso aberto.
              <br />
              Quando uma conversa for marcada para revisar, aparece aqui.
            </p>
          </div>
        ) : (
          fila.map((caso) => {
            const selecionado = caso.id === casoSelecionadoId
            const clienteMsg = ultimaDoCliente(caso.estimulo.mensagens)
            return (
              <button
                key={caso.id}
                type="button"
                onClick={() => onSelect(caso)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selecionado ? 'rgb(40 224 200 / 0.35)' : 'var(--border-hairline)'}`,
                  background: selecionado ? 'rgb(40 224 200 / 0.05)' : 'var(--surface-elevated)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                  width: '100%',
                  minWidth: 0,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <OrigemBadge origem={caso.origem} />
                </div>

                {}
                {clienteMsg && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      lineHeight: 1.45,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {clienteMsg}
                  </p>
                )}

                {}
                {caso.sinal && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    Sinal: {caso.sinal}
                  </p>
                )}

                {}
                {caso.resposta_dada && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    Resposta: {caso.resposta_dada}
                  </p>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
