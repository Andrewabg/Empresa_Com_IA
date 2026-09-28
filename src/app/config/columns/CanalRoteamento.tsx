'use client'



import { useState } from 'react'
import { PALAVRAS_PADRAO, lerRoteador, type PapelCargo } from '@/lib/canais/roteamento'

interface AgenteSummary { id: string; name: string; is_primary?: boolean }

interface LinhaCargo {
  agentId: string
  papel: PapelCargo
  
  palavras: string
}

const PAPEL_LABEL: Record<PapelCargo, string> = {
  suporte: 'Suporte / pós-venda',
  vendas: 'Vendas',
  geral: 'Geral',
}

const INPUT: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '6px 9px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 12.5,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const SELECT: React.CSSProperties = {
  ...INPUT,
  background: 'var(--surface-elevated)',
  cursor: 'pointer',
  width: 'auto',
}

export function CanalRoteamento({
  canalId,
  agentePadrao,
  config,
  agentes,
}: {
  canalId: string
  
  agentePadrao: string
  config: unknown
  agentes: AgenteSummary[]
}) {
  const salvo = lerRoteador(config, agentePadrao)
  const [aberto, setAberto] = useState(salvo !== null)
  const [linhas, setLinhas] = useState<LinhaCargo[]>(() =>
    salvo
      ? salvo.cargos.map((c) => ({ agentId: c.agentId, papel: c.papel, palavras: c.palavras.join(', ') }))
      : [{ agentId: agentePadrao, papel: 'suporte', palavras: PALAVRAS_PADRAO.suporte.join(', ') }],
  )
  const [novo, setNovo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const nomeDe = (id: string) => agentes.find((a) => a.id === id)?.name ?? id
  const disponiveis = agentes.filter((a) => !linhas.some((l) => l.agentId === a.id))

  function editar(i: number, patch: Partial<LinhaCargo>) {
    setMsg(null)
    setLinhas((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)))
  }

  
  function trocarPapel(i: number, papel: PapelCargo) {
    const atual = linhas[i]
    const vazio = atual.palavras.trim() === ''
    editar(i, { papel, ...(vazio ? { palavras: PALAVRAS_PADRAO[papel].join(', ') } : {}) })
  }

  function adicionar(agentId: string) {
    if (!agentId) return
    
    
    const papel: PapelCargo = linhas.some((l) => l.papel === 'vendas') ? 'suporte' : 'vendas'
    setLinhas((ls) => [...ls, { agentId, papel, palavras: PALAVRAS_PADRAO[papel].join(', ') }])
    setNovo('')
    setMsg(null)
  }

  function remover(i: number) {
    setLinhas((ls) => ls.filter((_, k) => k !== i))
    setMsg(null)
  }

  async function enviar(corpo: Record<string, unknown>, sucesso: string) {
    setSalvando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/config/canais/numeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal_id: canalId, ...corpo }),
      })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (j.ok) setMsg({ ok: true, texto: sucesso })
      else setMsg({ ok: false, texto: j.error ?? 'Não consegui salvar.' })
    } catch (err) {
      setMsg({ ok: false, texto: err instanceof Error ? err.message : 'Falhou.' })
    } finally {
      setSalvando(false)
    }
  }

  const salvar = () =>
    enviar(
      {
        roteamento: {
          cargos: linhas.map((l) => ({
            agentId: l.agentId,
            nome: nomeDe(l.agentId),
            papel: l.papel,
            palavras: l.palavras.split(',').map((p) => p.trim()).filter(Boolean),
          })),
        },
      },
      `${linhas.length} cargos dividem este número.`,
    )

  const desligar = () =>
    enviar({ roteamento: null }, 'Desligado — o número volta a atender por um cargo só.')

  if (!aberto) {
    return (
      <div style={{ width: '100%' }}>
        <button
          type="button"
          onClick={() => setAberto(true)}
          style={{
            padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-tertiary)',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          Dividir este número entre dois cargos
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--text-primary)' }}>
        Cargos que dividem este número
      </span>
      <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Quando a mensagem do cliente bate com as palavras de um cargo, a conversa passa para
        ele — mesmo transcript, sem recomeçar. Quem atende quando nada bate é{' '}
        <strong style={{ color: 'var(--text-secondary)', fontWeight: 550 }}>{nomeDe(agentePadrao)}</strong>.
      </span>

      {linhas.map((l, i) => (
        <div
          key={l.agentId}
          style={{
            display: 'flex', flexDirection: 'column', gap: 6, padding: '9px 10px',
            background: 'var(--surface)', border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--text-primary)' }}>
              {nomeDe(l.agentId)}
            </span>
            {l.agentId === agentePadrao && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>atende por padrão</span>
            )}
            <select
              value={l.papel}
              disabled={salvando}
              aria-label={`Papel de ${nomeDe(l.agentId)}`}
              onChange={(e) => trocarPapel(i, e.target.value as PapelCargo)}
              style={{ ...SELECT, marginLeft: 'auto' }}
            >
              {(Object.keys(PAPEL_LABEL) as PapelCargo[]).map((p) => (
                <option key={p} value={p}>{PAPEL_LABEL[p]}</option>
              ))}
            </select>
            {l.agentId !== agentePadrao && (
              <button
                type="button"
                onClick={() => remover(i)}
                disabled={salvando}
                style={{
                  padding: '4px 9px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)', background: 'transparent',
                  color: 'var(--reject)', fontSize: 11.5, fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                }}
              >
                remover
              </button>
            )}
          </div>
          {}
          <textarea
            value={l.palavras}
            disabled={salvando}
            rows={2}
            aria-label={`Palavras que chamam ${nomeDe(l.agentId)}`}
            placeholder="palavras separadas por vírgula"
            onChange={(e) => editar(i, { palavras: e.target.value })}
            style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5, minHeight: 46 }}
          />
        </div>
      ))}

      {disponiveis.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={novo}
            disabled={salvando}
            aria-label="Adicionar cargo a este número"
            onChange={(e) => adicionar(e.target.value)}
            style={SELECT}
          >
            <option value="">+ Adicionar cargo…</option>
            {disponiveis.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {linhas.length < 2 && (
        <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Com um cargo só não há para onde transferir — adicione o segundo para valer.
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando || linhas.length < 2}
          style={{
            padding: '6px 14px', borderRadius: 'var(--radius-md)', border: 'none',
            background: salvando || linhas.length < 2
              ? 'var(--surface)'
              : 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
            color: salvando || linhas.length < 2 ? 'var(--text-tertiary)' : '#fff',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-ui)',
            cursor: salvando || linhas.length < 2 ? 'not-allowed' : 'pointer',
          }}
        >
          {salvando ? 'Salvando…' : 'Salvar divisão'}
        </button>
        {salvo && (
          <button
            type="button"
            onClick={() => void desligar()}
            disabled={salvando}
            style={{
              padding: '6px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
            }}
          >
            Desligar divisão
          </button>
        )}
      </div>

      {msg && (
        <span role="status" style={{ fontSize: 11.5, color: msg.ok ? 'var(--approve)' : 'var(--reject)' }}>
          {msg.ok ? '✓' : '✗'} {msg.texto}
        </span>
      )}
    </div>
  )
}
