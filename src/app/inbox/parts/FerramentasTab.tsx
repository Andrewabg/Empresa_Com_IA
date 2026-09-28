'use client'



import { useState } from 'react'
import Link from 'next/link'
import type { FerramentaView } from '@/lib/inbox/ferramentas'
import type { AtendenteFerramentas } from '../InboxClient'




interface IntegracoesResposta {
  composio_toolkits?: string[]
  composio_action_modes?: Record<string, 'hitl' | 'direto'>
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        borderRadius: 999,
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-elevated)',
        fontSize: 11.5,
        fontWeight: 500,
        color: 'var(--text-tertiary)',
        lineHeight: '18px',
      }}
    >
      {children}
    </span>
  )
}


function ToggleLigada({
  ligada,
  disabled,
  onClick,
}: {
  ligada: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-label={ligada ? 'Desligar ferramenta' : 'Ligar ferramenta'}
      disabled={disabled}
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: 36,
        height: 20,
        padding: 0,
        borderRadius: 99,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        border: `1px solid ${ligada ? 'rgb(40 224 200 / 0.4)' : 'var(--border-hairline)'}`,
        background: ligada
          ? 'linear-gradient(120deg, var(--wave-from), var(--wave-to))'
          : 'var(--surface-elevated)',
        transition: 'background 0.18s, border-color 0.18s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: ligada ? 'calc(100% - 18px)' : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: ligada ? '#fff' : 'var(--text-tertiary)',
          transition: 'left 0.18s',
        }}
      />
    </button>
  )
}


function ModoSegmento({
  modo,
  disabled,
  onSelect,
}: {
  modo: 'hitl' | 'direto'
  disabled: boolean
  onSelect: (m: 'hitl' | 'direto') => void
}) {
  const opcoes: Array<{ valor: 'hitl' | 'direto'; label: string }> = [
    { valor: 'hitl', label: 'Pede sua aprovação' },
    { valor: 'direto', label: 'Age sozinho' },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="Ao agir"
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 2,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-elevated)',
      }}
    >
      {opcoes.map((o) => {
        const ativo = modo === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={disabled}
            onClick={() => onSelect(o.valor)}
            style={{
              padding: '3px 10px',
              borderRadius: 'calc(var(--radius-sm) - 2px)',
              border: 'none',
              background: ativo ? 'var(--surface)' : 'transparent',
              color: ativo ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontSize: 12,
              fontWeight: ativo ? 500 : 400,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}



function AtendenteCard({
  atendente,
  iconePorSlug,
  apenasLeitura,
}: {
  atendente: AtendenteFerramentas
  iconePorSlug: Record<string, string | undefined>
  
  apenasLeitura: boolean
}) {
  const { agentId, agentName } = atendente
  const [ferramentas, setFerramentas] = useState<FerramentaView[]>(atendente.ferramentas)
  
  const [emVoo, setEmVoo] = useState<Set<string>>(() => new Set())
  const [erro, setErro] = useState<string | null>(null)

  const trancar = (slug: string, on: boolean) =>
    setEmVoo((prev) => {
      const next = new Set(prev)
      if (on) next.add(slug)
      else next.delete(slug)
      return next
    })

  
  const reconciliar = (tools: IntegracoesResposta) => {
    const allow = new Set((tools.composio_toolkits ?? []).map((s) => s.toLowerCase()))
    const modes: Record<string, 'hitl' | 'direto'> = {}
    for (const [k, v] of Object.entries(tools.composio_action_modes ?? {})) modes[k.toLowerCase()] = v
    setFerramentas((prev) =>
      prev.map((f) => {
        const key = f.slug.toLowerCase()
        return {
          ...f,
          ligada: f.required || allow.has(key),
          modo: modes[key] ?? 'hitl',
        }
      }),
    )
  }

  async function patch(body: Record<string, unknown>): Promise<IntegracoesResposta | null> {
    const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/integracoes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error('patch falhou')
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; tools?: IntegracoesResposta }
    if (!j.ok || !j.tools) throw new Error('resposta inválida')
    return j.tools
  }

  const toggleLigada = async (slug: string, ligada: boolean) => {
    const alvo = ferramentas.find((f) => f.slug === slug)
    if (!alvo || alvo.required || emVoo.has(slug)) return
    setErro(null)
    const anterior = ferramentas
    trancar(slug, true)
    
    
    const otimista = ferramentas.map((f) => (f.slug === slug ? { ...f, ligada } : f))
    setFerramentas(otimista)
    const composio_toolkits = otimista.filter((f) => f.ligada && !f.required).map((f) => f.slug)
    const required_toolkits = otimista.filter((f) => f.required).map((f) => f.slug)
    try {
      const tools = await patch({ composio_toolkits, required_toolkits })
      if (tools) reconciliar(tools)
    } catch {
      setFerramentas(anterior)
      setErro('Não deu para salvar. Tente de novo.')
    } finally {
      trancar(slug, false)
    }
  }

  const definirModo = async (slug: string, modo: 'hitl' | 'direto') => {
    const alvo = ferramentas.find((f) => f.slug === slug)
    if (!alvo || emVoo.has(slug) || alvo.modo === modo) return
    setErro(null)
    const anterior = ferramentas
    trancar(slug, true)
    const otimista = ferramentas.map((f) => (f.slug === slug ? { ...f, modo } : f))
    setFerramentas(otimista)
    
    const composio_action_modes: Record<string, 'hitl' | 'direto'> = {}
    for (const f of otimista) if (f.ligada) composio_action_modes[f.slug] = f.modo
    try {
      const tools = await patch({ composio_action_modes })
      if (tools) reconciliar(tools)
    } catch {
      setFerramentas(anterior)
      setErro('Não deu para salvar. Tente de novo.')
    } finally {
      trancar(slug, false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '18px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface)',
      }}
    >
      {}
      <div>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        >
          {agentName} — o que ela pode usar
        </h2>
        <p style={{ margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Isto controla <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>quando ela age</strong>{' '}
          (marcar, criar, enviar). Ler é sempre na hora — leituras nunca pedem aprovação.
        </p>
        {apenasLeitura && (
          <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            Para equipar e definir aprovação, use o{' '}
            <Link
              href="/agentes"
              style={{ color: 'var(--text-secondary)', fontWeight: 600, textDecoration: 'none' }}
            >
              Rascunho &amp; Teste em Agentes →
            </Link>
          </p>
        )}
      </div>

      {erro && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>{erro}</p>
      )}

      {ferramentas.length === 0 ? (
        <p style={{ margin: '4px 0', fontSize: 13, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          {apenasLeitura
            ? `A ${agentName} ainda não tem ferramentas equipadas.`
            : `Conecte ferramentas em Integrações para equipar a ${agentName}.`}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ferramentas.map((f) => {
            const icone = iconePorSlug[f.slug]
            
            const travada = apenasLeitura || emVoo.has(f.slug)
            return (
              <li
                key={f.slug}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface-elevated)',
                }}
              >
                {}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {icone ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={icone}
                      alt=""
                      width={20}
                      height={20}
                      style={{ borderRadius: 5, flexShrink: 0 }}
                    />
                  ) : (
                    <span
                      aria-hidden
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        flexShrink: 0,
                        background: 'var(--surface)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    />
                  )}
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {f.name}
                    </span>
                    {!f.connected && (
                      <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                        conexão caiu — reconecte em Integrações
                      </span>
                    )}
                  </span>
                </div>

                {}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {f.ligada && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Ao agir:</span>
                        <ModoSegmento
                          modo={f.modo}
                          disabled={travada}
                          onSelect={(m) => void definirModo(f.slug, m)}
                        />
                      </span>
                      {f.modo === 'direto' && (
                        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                          executa sem te avisar
                        </span>
                      )}
                    </div>
                  )}
                  {f.required ? (
                    <Chip>necessária</Chip>
                  ) : (
                    <ToggleLigada
                      ligada={f.ligada}
                      disabled={travada}
                      onClick={() => void toggleLigada(f.slug, !f.ligada)}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}



export default function FerramentasTab({
  atendentes,
  composioConfigured,
  iconePorSlug,
  apenasLeitura = false,
}: {
  atendentes: AtendenteFerramentas[]
  composioConfigured: boolean
  iconePorSlug: Record<string, string | undefined>
  
  apenasLeitura?: boolean
}) {
  
  if (!composioConfigured) {
    return (
      <div
        style={{
          maxWidth: 520,
          padding: '22px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface)',
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Nenhuma ferramenta conectada ainda
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          Conecte as integrações da empresa (Gmail, Agenda, etc.) e depois equipe cada atendente
          aqui — dizendo o que ele pode usar e como deve agir.
        </p>
        <Link
          href="/config"
          style={{
            display: 'inline-block',
            padding: '7px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Abrir configurações →
        </Link>
      </div>
    )
  }

  if (atendentes.length === 0) {
    return (
      <div
        style={{
          maxWidth: 520,
          padding: '22px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface)',
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Nenhum atendente ativo
        </p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          Vincule um atendente a um canal para equipá-lo com ferramentas.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflow: 'auto',
        minHeight: 0,
        paddingBottom: 8,
      }}
    >
      {atendentes.map((a) => (
        <AtendenteCard key={a.agentId} atendente={a} iconePorSlug={iconePorSlug} apenasLeitura={apenasLeitura} />
      ))}
    </div>
  )
}
