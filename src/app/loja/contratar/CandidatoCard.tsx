'use client'



import Link from 'next/link'
import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import type { CandidatoCardData } from '@/server/agent/wireTypes'
import { candidatoDiff } from '@/lib/hiring/candidato-diff'
import { getStatusLabel } from './statusLabels'


const AMBAR = 'rgb(214 158 46)'

const usd = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' })

const sectionLabel: React.CSSProperties = {
  margin: 0,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
}

export interface CandidatoCardProps {
  candidato: CandidatoCardData
  sessionId: string | null
  
  bloqueado: boolean
  
  onPedirAjustes: () => void
}

export function CandidatoCard({ candidato, sessionId, bloqueado, onPedirAjustes }: CandidatoCardProps) {
  const router = useRouter()
  const nomeId = useId()
  const [nome, setNome] = useState(candidato.nome)
  const [contratando, setContratando] = useState(false)
  const [jaExiste, setJaExiste] = useState<{ id: string; msg: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function contratar() {
    
    if (contratando || bloqueado || !sessionId) return
    setContratando(true)
    setErro(null)
    setJaExiste(null)
    try {
      const res = await fetch('/api/loja/contratar/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...(nome.trim() ? { nome: nome.trim() } : {}) }),
      })
      const j = (await res.json().catch(() => null)) as
        | { agentId?: string; workspaceHref?: string; error?: string; existingId?: string; msg?: string }
        | null
      if (res.ok && j?.workspaceHref) {
        
        router.push(j.workspaceHref)
        return
      }
      if (res.status === 409 && j?.error === 'ja_existe' && j.existingId) {
        setJaExiste({ id: j.existingId, msg: j.msg ?? 'você já tem um agente pra isso — quer ajustá-lo?' })
        setContratando(false)
        return
      }
      console.warn('[CandidatoCard] contratar falhou', j?.error ?? `HTTP ${res.status}`)
      setErro('Não deu pra contratar agora — tenta de novo em instantes.')
      setContratando(false)
    } catch {
      setErro('Não deu pra contratar agora — problema de conexão. Tente de novo.')
      setContratando(false)
    }
  }

  const podeContratar = !contratando && !bloqueado && !!sessionId

  
  const antes = candidato.antes
  const { missaoMudou, orcamentoMudou, ferramentasAdicionadas, ferramentasRemovidas } =
    candidatoDiff(candidato)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 'clamp(16px, 2.5vw, 22px)',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        
        boxShadow: '0 0 0 1px rgb(255 255 255 / 0.02), 0 12px 40px rgb(0 0 0 / 0.25)',
      }}
    >
      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <AgentWaveAvatar agentId={`candidato-${candidato.papel}`} size={48} lit />
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label htmlFor={nomeId} style={sectionLabel}>
            {antes ? `Novo perfil do ${candidato.papel}` : 'Nome do agente — pode trocar'}
          </label>
          <input
            id={nomeId}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={120}
            disabled={contratando}
            aria-label="Nome do agente"
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px dashed var(--border-hairline)',
              outline: 'none',
              padding: '2px 0 4px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{candidato.papel}</span>
        </div>
      </div>

      {}
      {missaoMudou && antes ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={sectionLabel}>Missão</p>
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
            <span style={{ textDecoration: 'none' }}>Antes: </span>
            {antes.missao}
          </span>
          <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Depois: {candidato.missao}
          </span>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          {candidato.missao}
        </p>
      )}

      {}
      {antes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={sectionLabel}>O que muda</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ferramentasAdicionadas.length === 0 && ferramentasRemovidas.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Sem mudança nas ferramentas.
              </span>
            ) : (
              <>
                {ferramentasAdicionadas.map((f) => (
                  <span
                    key={`add-${f.slug}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'transparent',
                      backgroundImage: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                    }}
                  >
                    ＋ {f.name}
                  </span>
                ))}
                {ferramentasRemovidas.map((a) => (
                  <span
                    key={`rem-${a.slug}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      textDecoration: 'line-through',
                    }}
                  >
                    <span style={{ textDecoration: 'none' }}>－</span> {a.name}
                  </span>
                ))}
              </>
            )}
          </div>
          {orcamentoMudou && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Orçamento: de {usd.format(antes.budgetUsd)} para {usd.format(candidato.budgetUsd)} por tarefa.
            </span>
          )}
        </div>
      )}

      {}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={sectionLabel}>Faz sozinho</p>
          {candidato.fazSozinho.map((item, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--wave-from), var(--wave-to))',
                  transform: 'translateY(-1px)',
                }}
              />
              {item}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={sectionLabel}>Pede sua aprovação</p>
          {candidato.pedeAprovacao.map((item, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              <span
                aria-hidden
                style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: AMBAR, transform: 'translateY(-1px)' }}
              />
              {item}
            </span>
          ))}
        </div>
      </div>

      {}
      {candidato.ferramentas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={sectionLabel}>Ferramentas</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {candidato.ferramentas.map((f) => (
              <span
                key={f.slug}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 99,
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface-elevated)',
                  fontSize: 11.5,
                  color: 'var(--text-secondary)',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background:
                      f.status === 'conectada'
                        ? 'linear-gradient(135deg, var(--wave-from), var(--wave-to))'
                        : 'transparent',
                    border: f.status === 'conectada' ? 'none' : '1px solid var(--text-tertiary)',
                  }}
                />
                {f.name}
                {f.status !== 'conectada' && (
                  <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                    {getStatusLabel(f.status)}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          {candidato.leituraCerebro}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Orçamento: até {usd.format(candidato.budgetUsd)} por tarefa.
        </span>
      </div>

      {}
      {jaExiste && (
        <div
          role="status"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '12px 14px',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {jaExiste.msg}
          </span>
          <Link
            href={`/agente/${encodeURIComponent(jaExiste.id)}`}
            prefetch={false}
            style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none' }}
          >
            Abrir estação dele →
          </Link>
        </div>
      )}

      {erro && (
        <p role="alert" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--reject)' }}>
          {erro}
        </p>
      )}

      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => void contratar()}
          disabled={!podeContratar}
          title={bloqueado ? 'Aguarde a resposta do RH terminar' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '11px 22px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: podeContratar ? 'pointer' : 'not-allowed',
            opacity: podeContratar ? 1 : 0.5,
          }}
        >
          {antes
            ? contratando
              ? 'Aplicando…'
              : 'Aplicar mudanças'
            : contratando
              ? 'Contratando…'
              : `Contratar ${nome.trim() || candidato.nome}`}
        </button>
        <button
          type="button"
          onClick={onPedirAjustes}
          disabled={contratando}
          style={{
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontFamily: 'var(--font-ui)',
            cursor: contratando ? 'not-allowed' : 'pointer',
          }}
        >
          Pedir ajustes
        </button>
      </div>
    </div>
  )
}
