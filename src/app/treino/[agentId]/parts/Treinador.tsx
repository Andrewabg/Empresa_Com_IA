'use client'



import { useCallback, useRef, useState } from 'react'
import type { TreinoCaso } from '@/data/treino'



interface GavetaItem {
  gaveta: 'base' | 'diretriz' | 'persona' | 'playbook'
  conteudo: string
  campo?: 'quem_e' | 'tom' | 'nunca_faz'
  titulo?: string
}

interface Proposta {
  gavetas: GavetaItem[]
  criterio: string
  explicacao: string
}

interface Veredito {
  passou: boolean
  porque: string
  estavel: boolean
}



const GAVETA_LABEL: Record<GavetaItem['gaveta'], string> = {
  base: 'Base de conhecimento',
  playbook: 'Como responder',
  diretriz: 'Diretriz de comportamento',
  persona: 'Personalidade',
}

const CAMPO_LABEL: Record<string, string> = {
  quem_e: 'Quem ela é',
  tom: 'Tom',
  nunca_faz: 'Nunca faz',
}

function GavetaCard({ item }: { item: GavetaItem }) {
  const isPersona = item.gaveta === 'persona'
  return (
    <div
      style={{
        padding: '10px 13px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-elevated)',
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
        <span
          style={{
            display: 'inline-block',
            padding: '1px 7px',
            borderRadius: 999,
            border: '1px solid rgb(40 224 200 / 0.35)',
            background: 'rgb(40 224 200 / 0.07)',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            lineHeight: '17px',
          }}
        >
          {GAVETA_LABEL[item.gaveta]}
        </span>
        {isPersona && item.campo && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
            }}
          >
            → {CAMPO_LABEL[item.campo] ?? item.campo}
          </span>
        )}
        {item.titulo && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
            }}
          >
            · {item.titulo}
          </span>
        )}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--text-primary)',
        }}
      >
        {item.conteudo}
      </p>
    </div>
  )
}



type Fase = 'vazio' | 'digitando' | 'carregando' | 'proposta' | 'aprovando' | 'resultado'

export function Treinador({
  caso,
  onCasoCorrigido,
}: {
  caso: TreinoCaso | null
  onCasoCorrigido: () => void
}) {
  const [fase, setFase] = useState<Fase>('vazio')
  const [fala, setFala] = useState('')
  const [proposta, setProposta] = useState<Proposta | null>(null)
  const [erroMensagem, setErroMensagem] = useState<string | null>(null)
  
  const [antes, setAntes] = useState<string | null>(null)
  const [depois, setDepois] = useState<string | null>(null)
  const [veredito, setVeredito] = useState<Veredito | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  
  
  const casoIdRef = useRef<string | null>(null)
  const casoId = caso?.id ?? null
  if (casoId !== casoIdRef.current) {
    casoIdRef.current = casoId
    setFase(caso ? 'digitando' : 'vazio')
    setFala('')
    setProposta(null)
    setErroMensagem(null)
    setAntes(null)
    setDepois(null)
    setVeredito(null)
  }

  const corrigir = useCallback(async () => {
    if (!caso || !fala.trim()) return
    setFase('carregando')
    setErroMensagem(null)
    try {
      const res = await fetch('/api/treino/corrigir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ casoId: caso.id, fala: fala.trim() }),
      })
      const j = (await res.json().catch(() => ({}))) as { proposta?: Proposta; error?: string }
      if (j.proposta) {
        setProposta(j.proposta)
        setFase('proposta')
      } else {
        setErroMensagem('Não consegui gerar uma proposta. Tente reformular.')
        setFase('digitando')
      }
    } catch {
      setErroMensagem('Erro ao conectar. Tente novamente.')
      setFase('digitando')
    }
  }, [caso, fala])

  const aprovar = useCallback(async () => {
    if (!caso || !proposta) return
    setFase('aprovando')
    setErroMensagem(null)
    try {
      const res = await fetch('/api/treino/aprovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ casoId: caso.id, proposta }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        antes?: string | null
        depois?: string | null
        veredito?: Veredito | null
        error?: string
      }
      if (j.ok) {
        setAntes(j.antes ?? null)
        setDepois(j.depois ?? null)
        setVeredito(j.veredito ?? null)
        setFase('resultado')
        onCasoCorrigido()
      } else {
        setErroMensagem('Erro ao aplicar a correção. Tente novamente.')
        setFase('proposta')
      }
    } catch {
      setErroMensagem('Erro ao conectar. Tente novamente.')
      setFase('proposta')
    }
  }, [caso, proposta, onCasoCorrigido])

  const ajustar = useCallback(() => {
    setProposta(null)
    setFase('digitando')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  const descartar = useCallback(() => {
    setProposta(null)
    setFala('')
    setErroMensagem(null)
    setFase('digitando')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  const novoTreino = useCallback(() => {
    setFase('digitando')
    setFala('')
    setProposta(null)
    setErroMensagem(null)
    setAntes(null)
    setDepois(null)
    setVeredito(null)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  
  if (!caso || fase === 'vazio') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 10,
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 28, opacity: 0.18 }}>✏️</span>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--text-tertiary)',
            lineHeight: 1.6,
            maxWidth: 300,
          }}
        >
          Selecione um caso na fila para começar a treinar o atendente.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
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
          Treinador
        </span>
      </div>

      {}
      <div className="cc-scroll" style={{ flex: 1, minHeight: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {}
        <div
          style={{
            padding: '11px 13px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Contexto do caso
          </p>
          {caso.estimulo.mensagens.slice(-4).map((m, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: m.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  marginRight: 6,
                }}
              >
                {m.role === 'user' ? 'Cliente:' : 'Atendente:'}
              </span>
              {m.content}
            </div>
          ))}
          {caso.sinal && (
            <div
              style={{
                marginTop: 4,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgb(229 99 77 / 0.08)',
                border: '1px solid rgb(229 99 77 / 0.2)',
                fontSize: 12.5,
                color: 'var(--color-reject)',
              }}
            >
              Problema: {caso.sinal}
            </div>
          )}
        </div>

        {}
        {(fase === 'digitando' || fase === 'carregando') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label
              htmlFor="treinador-fala"
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                display: 'block',
              }}
            >
              O que você quer ensinar ao atendente?
            </label>
            <textarea
              id="treinador-fala"
              ref={textareaRef}
              value={fala}
              onChange={(e) => setFala(e.target.value)}
              placeholder='Ex: "Quando o cliente pedir prazo de entrega, sempre diga que é em até 5 dias úteis"'
              rows={4}
              disabled={fase === 'carregando'}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13.5,
                lineHeight: 1.5,
                resize: 'vertical',
                boxSizing: 'border-box',
                opacity: fase === 'carregando' ? 0.6 : 1,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && fase !== 'carregando') {
                  void corrigir()
                }
              }}
            />
            {erroMensagem && (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-reject)' }}>
                {erroMensagem}
              </p>
            )}
            <button
              type="button"
              onClick={() => void corrigir()}
              disabled={!fala.trim() || fase === 'carregando'}
              style={{
                padding: '9px 0',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background:
                  !fala.trim() || fase === 'carregando'
                    ? 'var(--surface-elevated)'
                    : 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                color: !fala.trim() || fase === 'carregando' ? 'var(--text-tertiary)' : '#0a0a0a',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: !fala.trim() || fase === 'carregando' ? 'not-allowed' : 'pointer',
                width: '100%',
                transition: 'opacity 0.15s',
              }}
            >
              {fase === 'carregando' ? 'Analisando…' : 'Sugerir correção  (Ctrl+Enter)'}
            </button>
          </div>
        )}

        {}
        {(fase === 'proposta' || fase === 'aprovando') && proposta && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {}
            <div
              style={{
                padding: '11px 13px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgb(40 224 200 / 0.25)',
                background: 'rgb(40 224 200 / 0.04)',
              }}
            >
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {proposta.explicacao}
              </p>
            </div>

            {}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                }}
              >
                O que será guardado
              </p>
              {proposta.gavetas.map((g, i) => (
                <GavetaCard key={i} item={g} />
              ))}
            </div>

            {}
            <div
              style={{
                padding: '9px 13px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
              }}
            >
              <p
                style={{
                  margin: '0 0 4px',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                }}
              >
                Critério de teste
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {proposta.criterio}
              </p>
            </div>

            {erroMensagem && (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-reject)' }}>
                {erroMensagem}
              </p>
            )}

            {}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => void aprovar()}
                disabled={fase === 'aprovando'}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                  color: '#0a0a0a',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={ajustar}
                style={{
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={descartar}
                style={{
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {}
        {fase === 'aprovando' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              Aplicando correção e testando…
            </span>
          </div>
        )}

        {}
        {fase === 'resultado' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {}
            {veredito && (
              <div
                style={{
                  padding: '11px 13px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${veredito.passou ? 'rgb(63 185 132 / 0.4)' : 'rgb(229 99 77 / 0.4)'}`,
                  background: veredito.passou
                    ? 'rgb(63 185 132 / 0.06)'
                    : 'rgb(229 99 77 / 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: veredito.passou ? 'var(--color-approve)' : 'var(--color-reject)',
                  }}
                >
                  {veredito.passou ? '✓ Teste passou' : '✗ Teste não passou'}
                  {!veredito.estavel && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        fontWeight: 400,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      (instável)
                    </span>
                  )}
                </p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                  {veredito.porque}
                </p>
              </div>
            )}

            {}
            {(antes !== undefined || depois !== undefined) && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgb(229 99 77 / 0.25)',
                    background: 'rgb(229 99 77 / 0.04)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 6px',
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--color-reject)',
                    }}
                  >
                    Antes
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {antes ?? '(sem resposta registrada)'}
                  </p>
                </div>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgb(63 185 132 / 0.25)',
                    background: 'rgb(63 185 132 / 0.04)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 6px',
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--color-approve)',
                    }}
                  >
                    Depois
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {depois ?? '(teste não disponível)'}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={novoTreino}
              style={{
                padding: '8px 0',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Treinar outro caso
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
