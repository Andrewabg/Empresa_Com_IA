'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/app/agentes/parts'
import ImportDropzone from '@/app/cerebro/ImportDropzone'
import { filtrarRascunhos } from '@/lib/inbox/rascunhos'
import type { CanalRow } from '@/data/canais'
import type { EntradaBaseRow } from '@/data/baseConhecimento'
import type { AgenteRef } from '../InboxClient'



function Chip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
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
        color: muted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        lineHeight: '18px',
      }}
    >
      {children}
    </span>
  )
}

function Divider() {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid var(--border-hairline)',
        margin: '14px 0',
      }}
    />
  )
}



interface FormState {
  id?: string
  titulo: string
  conteudo: string
  agentId: string 
}

const FORM_VAZIO: FormState = { titulo: '', conteudo: '', agentId: '' }



export function BaseTab({
  canais,
  agentes,
}: {
  canais: CanalRow[]
  agentes: AgenteRef[]
}) {
  const [entradas, setEntradas] = useState<EntradaBaseRow[]>([])
  const [carregando, setCarregando] = useState(false)
  const [form, setForm] = useState<FormState>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  
  const [pergunta, setPergunta] = useState('')
  const [testandoAgentId, setTestandoAgentId] = useState('')
  const [testando, setTestando] = useState(false)
  const [resultados, setResultados] = useState<Array<{ titulo: string; conteudo: string; score: number }> | null>(null)

  
  const [ensinarAgentId, setEnsinarAgentId] = useState('') 
  const [bulkBusy, setBulkBusy] = useState(false)

  
  
  
  const editorRef = useRef<HTMLElement>(null)

  
  const agentesDeCanais = agentes.filter((a) => canais.some((c) => c.agent_id === a.id))

  const buscarEntradas = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/inbox/base')
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; entradas?: EntradaBaseRow[] }
      if (j.ok && Array.isArray(j.entradas)) setEntradas(j.entradas)
    } catch (err) {
      console.warn('[BaseTab] buscarEntradas falhou:', err)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void buscarEntradas()
    
    if (agentesDeCanais.length > 0) setTestandoAgentId(agentesDeCanais[0].id)
  }, [buscarEntradas]) // eslint-disable-line react-hooks/exhaustive-deps

  const selecionarParaEditar = (e: EntradaBaseRow) => {
    setForm({
      id: e.id,
      titulo: e.titulo,
      conteudo: e.conteudo,
      agentId: e.agent_id ?? '',
    })
    setErroForm(null)
    setResultados(null)
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const novaEntrada = () => {
    setForm(FORM_VAZIO)
    setErroForm(null)
    setResultados(null)
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const toggleEnabled = async (e: EntradaBaseRow) => {
    try {
      
      await fetch('/api/inbox/base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: e.id, enabled: !e.enabled }),
      })
      await buscarEntradas()
    } catch (err) {
      console.warn('[BaseTab] toggleEnabled falhou:', err)
    }
  }

  const salvar = async () => {
    setSalvando(true)
    setErroForm(null)
    try {
      const res = await fetch('/api/inbox/base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(form.id ? { id: form.id } : {}),
          titulo: form.titulo,
          conteudo: form.conteudo,
          agent_id: form.agentId || null,
        }),
      })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string }
      if (j.ok) {
        await buscarEntradas()
        if (!form.id && j.id) setForm((prev) => ({ ...prev, id: j.id }))
      } else {
        setErroForm('Preencha título e conteúdo antes de salvar.')
      }
    } catch {
      setErroForm('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!form.id) return
    setExcluindo(true)
    try {
      await fetch(`/api/inbox/base?id=${encodeURIComponent(form.id)}`, { method: 'DELETE' })
      setForm(FORM_VAZIO)
      await buscarEntradas()
    } catch (err) {
      console.warn('[BaseTab] excluir falhou:', err)
    } finally {
      setExcluindo(false)
    }
  }

  const testar = async () => {
    if (!pergunta.trim() || !testandoAgentId) return
    setTestando(true)
    setResultados(null)
    try {
      const res = await fetch('/api/inbox/base/testar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: pergunta.trim(), agentId: testandoAgentId }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        resultados?: Array<{ titulo: string; conteudo: string; score: number }>
      }
      if (j.ok && Array.isArray(j.resultados)) setResultados(j.resultados)
    } catch (err) {
      console.warn('[BaseTab] testar falhou:', err)
    } finally {
      setTestando(false)
    }
  }

  const nomePorId = (id: string | null) =>
    id ? (agentes.find((a) => a.id === id)?.name ?? id) : 'Todos'

  
  const rascunhos = filtrarRascunhos(entradas)

  const bulkAction = useCallback(async (action: 'enable_all' | 'discard_all') => {
    const ids = rascunhos.map((r) => r.id)
    if (ids.length === 0) return
    setBulkBusy(true)
    try {
      await fetch('/api/inbox/base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids }),
      })
    } catch (err) {
      console.warn('[BaseTab] bulkAction falhou:', err)
    } finally {
      setBulkBusy(false)
      await buscarEntradas() 
    }
  }, [rascunhos, buscarEntradas])

  

  return (
    <div className="base-grid">
      {}
      <div className="base-col-esq">
        {}
        <Card
          className="base-ensinar"
          label="Ensinar a base com documentos"
          hint="suba PDFs/planilhas; viram rascunhos p/ você revisar"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label
                htmlFor="ensinar-escopo"
                style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}
              >
                Para qual agente
              </label>
              <select
                id="ensinar-escopo"
                value={ensinarAgentId}
                onChange={(ev) => setEnsinarAgentId(ev.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Todos os agentes</option>
                {agentesDeCanais.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <ImportDropzone
              target="base"
              baseAgentId={ensinarAgentId}
              storageKey="inbox:activeBaseImport"
              onImported={buscarEntradas}
            />
          </div>
        </Card>

        {}
        <Card
          className="base-lista"
          label="Base de conhecimento"
          hint={
            entradas.length === 0
              ? 'só o que está aqui existe pros agentes de canal'
              : `${entradas.length} ${entradas.length === 1 ? 'entrada' : 'entradas'} · só o que está aqui existe pros agentes de canal`
          }
          footer={
            <button
              type="button"
              onClick={novaEntrada}
              style={{
                width: '100%',
                padding: '7px 0',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              + Nova entrada
            </button>
          }
        >
          {}
          {rascunhos.length > 0 && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
              }}
            >
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {rascunhos.length} {rascunhos.length === 1 ? 'rascunho a revisar' : 'rascunhos a revisar'}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                Vindos dos documentos que você ensinou — ative os certos, descarte o resto.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void bulkAction('enable_all')}
                  disabled={bulkBusy}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                    color: '#0a0a0a',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: bulkBusy ? 'not-allowed' : 'pointer',
                    opacity: bulkBusy ? 0.7 : 1,
                  }}
                >
                  {bulkBusy ? '…' : 'Ativar todos'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Descartar todos os rascunhos? Esta ação remove-os da base.'))
                      void bulkAction('discard_all')
                  }}
                  disabled={bulkBusy}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-hairline)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: bulkBusy ? 'not-allowed' : 'pointer',
                    opacity: bulkBusy ? 0.7 : 1,
                  }}
                >
                  Descartar todos
                </button>
              </div>
            </div>
          )}

          {carregando && (
            <p style={{ margin: '8px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
              Carregando…
            </p>
          )}
          {!carregando && entradas.length === 0 && (
            <p style={{ margin: '8px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
              Nenhuma entrada ainda. Clique em &quot;+ Nova entrada&quot; para começar.
            </p>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entradas.map((e) => (
              <li
                key={e.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${form.id === e.id ? 'rgb(40 224 200 / 0.35)' : 'var(--border-hairline)'}`,
                  background: form.id === e.id ? 'rgb(40 224 200 / 0.04)' : 'var(--surface-elevated)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                {}
                <button
                  type="button"
                  onClick={() => selecionarParaEditar(e)}
                  aria-current={form.id === e.id ? 'true' : undefined}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: 0,
                    margin: 0,
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      margin: '0 0 5px',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {e.titulo}
                  </span>
                  {}
                  {e.conteudo?.trim() && (
                    <span
                      style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                        overflow: 'hidden',
                        margin: '0 0 6px',
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {e.conteudo}
                    </span>
                  )}
                  <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <Chip>{nomePorId(e.agent_id)}</Chip>
                    {e.origem === 'aprendizado' && <Chip muted>aprendizado</Chip>}
                  </span>
                </button>
                {}
                <button
                  type="button"
                  role="switch"
                  aria-checked={e.enabled}
                  aria-label={e.enabled ? 'Desativar' : 'Ativar'}
                  onClick={() => void toggleEnabled(e)}
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 20,
                    padding: 0,
                    borderRadius: 99,
                    position: 'relative',
                    cursor: 'pointer',
                    border: `1px solid ${e.enabled ? 'rgb(40 224 200 / 0.4)' : 'var(--border-hairline)'}`,
                    background: e.enabled
                      ? 'linear-gradient(120deg, var(--wave-from), var(--wave-to))'
                      : 'var(--surface-elevated)',
                    transition: 'background 0.18s, border-color 0.18s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: e.enabled ? 'calc(100% - 18px)' : 2,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: e.enabled ? '#fff' : 'var(--text-tertiary)',
                      transition: 'left 0.18s',
                    }}
                  />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {}
      <Card ref={editorRef} label={form.id ? 'Editando entrada' : 'Nova entrada'}>
        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label
              htmlFor="base-titulo"
              style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}
            >
              Título
            </label>
            <input
              id="base-titulo"
              type="text"
              value={form.titulo}
              onChange={(ev) => setForm((p) => ({ ...p, titulo: ev.target.value }))}
              placeholder="Ex: Horário de atendimento"
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13.5,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="base-conteudo"
              style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}
            >
              Conteúdo
            </label>
            <textarea
              id="base-conteudo"
              value={form.conteudo}
              onChange={(ev) => setForm((p) => ({ ...p, conteudo: ev.target.value }))}
              placeholder="Descreva aqui o conhecimento que o agente deve usar…"
              rows={10}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'var(--font-mono, monospace)',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="base-escopo"
              style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}
            >
              Escopo
            </label>
            <select
              id="base-escopo"
              value={form.agentId}
              onChange={(ev) => setForm((p) => ({ ...p, agentId: ev.target.value }))}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            >
              <option value="">Todos os agentes</option>
              {agentesDeCanais.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {erroForm && (
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-error, #ff4d6d)' }}>
              {erroForm}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                color: '#0a0a0a',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: salvando ? 'not-allowed' : 'pointer',
                opacity: salvando ? 0.7 : 1,
              }}
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => void excluir()}
                disabled={excluindo}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  cursor: excluindo ? 'not-allowed' : 'pointer',
                  opacity: excluindo ? 0.7 : 1,
                }}
              >
                {excluindo ? 'Excluindo…' : 'Excluir'}
              </button>
            )}
          </div>
        </div>

        <Divider />

        {}
        <div>
          <p
            style={{
              margin: '0 0 10px',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Testar pergunta
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={pergunta}
              onChange={(ev) => setPergunta(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === 'Enter') void testar() }}
              placeholder="Ex: Qual o horário de atendimento?"
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13,
                minWidth: 0,
              }}
            />
            <select
              value={testandoAgentId}
              onChange={(ev) => setTestandoAgentId(ev.target.value)}
              aria-label="Agente para testar"
              style={{
                padding: '7px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            >
              {agentesDeCanais.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              {agentesDeCanais.length === 0 && <option value="">Nenhum agente</option>}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void testar()}
            disabled={testando || !pergunta.trim() || !testandoAgentId}
            style={{
              width: '100%',
              padding: '7px 0',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              cursor: testando || !pergunta.trim() || !testandoAgentId ? 'not-allowed' : 'pointer',
              opacity: testando || !pergunta.trim() || !testandoAgentId ? 0.6 : 1,
              marginBottom: 10,
            }}
          >
            {testando ? 'Testando…' : 'Testar'}
          </button>

          {resultados !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {resultados.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  Nada encontrado — o agente vai admitir e escalar.
                </p>
              ) : (
                resultados.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-hairline)',
                      background: 'var(--surface-elevated)',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 4px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {r.titulo}
                    </p>
                    <p
                      style={{
                        margin: '0 0 6px',
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {r.conteudo}
                    </p>
                    <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                      score {r.score.toFixed(3)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
