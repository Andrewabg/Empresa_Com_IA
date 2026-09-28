'use client'



import { useEffect, useRef, useState } from 'react'


const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-md)',
  padding: '11px 14px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
}
const BUTTON_STYLE: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
const HINT_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--text-tertiary)',
}

interface Campo {
  chave: string
  rotulo: string
  tipo: 'segredo' | 'texto' | 'url'
  obrigatorio: boolean
  ajuda: string | null
  configurado: boolean
  valor: string
}
interface Evento {
  id: string
  slug: string
  status: string
  received_at: string
  last_error: string | null
}
interface Resposta {
  campos: Campo[]
  eventos: Evento[]
}


const STATUS_META: Record<string, { rotulo: string; cor: string }> = {
  queued: { rotulo: 'recebido', cor: 'var(--text-secondary)' },
  processing: { rotulo: 'processando', cor: 'var(--text-secondary)' },
  done: { rotulo: 'processado', cor: 'var(--approve)' },
  rejected: { rotulo: 'rejeitado', cor: 'var(--reject)' },
  dead: { rotulo: 'falhou', cor: 'var(--reject)' },
}

function fmtQuando(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function IntegracaoCard() {
  const [loaded, setLoaded] = useState(false)
  const [campos, setCampos] = useState<Campo[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const aliveRef = useRef(true)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])

  useEffect(() => {
    fetch('/api/config/custom')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j: Resposta | null) => {
        if (!aliveRef.current) return
        if (j) {
          setCampos(j.campos ?? [])
          setEventos(j.eventos ?? [])
          
          const inicial: Record<string, string> = {}
          for (const c of j.campos ?? []) inicial[c.chave] = c.tipo === 'segredo' ? '' : c.valor
          setRascunho(inicial)
        }
        setLoaded(true)
      })
  }, [])

  async function salvar() {
    setSaving(true)
    setMsg(null)
    
    const body: Record<string, string> = {}
    for (const c of campos) {
      const v = rascunho[c.chave] ?? ''
      if (c.tipo === 'segredo') {
        if (v.trim() !== '') body[c.chave] = v 
      } else {
        body[c.chave] = v 
      }
    }
    try {
      const res = await fetch('/api/config/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok) {
        setMsg({ ok: true, text: 'Integrações salvas.' })
        
        setCampos((prev) =>
          prev.map((c) =>
            c.tipo === 'segredo' && (rascunho[c.chave] ?? '').trim() !== ''
              ? { ...c, configurado: true }
              : c,
          ),
        )
        setRascunho((prev) => {
          const next = { ...prev }
          for (const c of campos) if (c.tipo === 'segredo') next[c.chave] = ''
          return next
        })
      } else {
        setMsg({ ok: false, text: j?.error ?? 'Não foi possível salvar. Tente de novo.' })
      }
    } catch {
      if (aliveRef.current) setMsg({ ok: false, text: 'Não foi possível salvar. Tente de novo.' })
    } finally {
      if (aliveRef.current) setSaving(false)
    }
  }

  
  if (loaded && campos.length === 0) return null

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Integrações
        </span>
        <p style={HINT_STYLE}>
          As chaves e endereços que as automações da sua empresa precisam. Preencha uma vez
          — os segredos ficam guardados em cofre e nunca aparecem de volta na tela.
        </p>
      </div>

      {}
      {campos.map((c) => {
        const id = `custom-cfg-${c.chave}`
        const val = rascunho[c.chave] ?? ''
        return (
          <div key={c.chave} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor={id} style={LABEL_STYLE}>
              {c.rotulo}
              {c.obrigatorio && <span style={{ color: 'var(--text-tertiary)' }}> *</span>}
            </label>
            <input
              id={id}
              type={c.tipo === 'segredo' ? 'password' : c.tipo === 'url' ? 'url' : 'text'}
              value={val}
              disabled={!loaded}
              onChange={(e) => {
                const v = e.target.value
                setRascunho((prev) => ({ ...prev, [c.chave]: v }))
                setMsg(null)
              }}
              placeholder={c.tipo === 'segredo' ? (c.configurado ? '•••••••• (configurado)' : 'ainda não configurado') : ''}
              autoComplete="off"
              style={INPUT_STYLE}
            />
            {c.tipo === 'segredo' && (
              <p style={HINT_STYLE}>
                {c.configurado
                  ? 'Já configurado. Digite um novo valor só se quiser trocar.'
                  : 'Ainda não configurado.'}
              </p>
            )}
            {c.ajuda && <p style={HINT_STYLE}>{c.ajuda}</p>}
          </div>
        )
      })}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={saving || !loaded}
          style={{ ...BUTTON_STYLE, opacity: saving || !loaded ? 0.6 : 1, cursor: saving || !loaded ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && (
          <p role="status" style={{ ...HINT_STYLE, color: msg.ok ? 'var(--approve)' : 'var(--reject)' }}>
            {msg.text}
          </p>
        )}
      </div>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        <span style={LABEL_STYLE}>Últimos eventos</span>
        {eventos.length === 0 ? (
          <p style={HINT_STYLE}>Nenhum evento recebido ainda.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {eventos.map((ev) => {
              const meta = STATUS_META[ev.status] ?? { rotulo: ev.status, cor: 'var(--text-secondary)' }
              return (
                <li
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12.5,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 500,
                      color: meta.cor,
                      border: `1px solid ${meta.cor}`,
                      opacity: 0.9,
                    }}
                  >
                    {meta.rotulo}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}>{ev.slug}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtQuando(ev.received_at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <p style={HINT_STYLE}>Os últimos webhooks que suas automações receberam. Só leitura.</p>
      </div>
    </div>
  )
}
