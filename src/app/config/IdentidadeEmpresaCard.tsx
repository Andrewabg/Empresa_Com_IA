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

const HINT_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--text-tertiary)',
}

const NOME_MAX = 80
const MISSAO_MAX = 400

export function IdentidadeEmpresaCard() {
  const [loaded, setLoaded] = useState(false)
  const [nome, setNome] = useState('')
  const [missao, setMissao] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const aliveRef = useRef(true)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/config/identidade')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j: { companyName?: string; mission?: string } | null) => {
        if (!alive) return
        if (j) {
          setNome(j.companyName ?? '')
          setMissao(j.mission ?? '')
        } else {
          setMsg({ ok: false, text: 'Não deu para carregar o que está salvo.' })
        }
        setLoaded(true)
      })
    return () => { alive = false }
  }, [])

  async function salvar() {
    if (!nome.trim()) {
      setMsg({ ok: false, text: 'O nome da empresa não pode ficar em branco.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/config/identidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: nome.trim(), mission: missao.trim() }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!aliveRef.current) return
      setMsg(
        res.ok && j?.ok
          ? { ok: true, text: 'Salvo. Seus agentes já passam a usar isso na próxima conversa.' }
          : { ok: false, text: j?.error ?? 'Não foi possível salvar. Tente de novo.' },
      )
    } catch {
      if (aliveRef.current) setMsg({ ok: false, text: 'Não foi possível salvar. Tente de novo.' })
    } finally {
      if (aliveRef.current) setSaving(false)
    }
  }

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
          Identidade da empresa
        </span>
        <p style={HINT_STYLE}>
          O nome e a missão que todo agente usa como ponto de partida. Se algo aqui está errado,
          corrija: eles aparecem em toda conversa.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="identidade-nome" style={LABEL_STYLE}>Nome da empresa</label>
        <input
          id="identidade-nome"
          type="text"
          value={nome}
          maxLength={NOME_MAX}
          disabled={!loaded}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Minha Empresa"
          autoComplete="off"
          style={INPUT_STYLE}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="identidade-missao" style={LABEL_STYLE}>Missão</label>
        <textarea
          id="identidade-missao"
          value={missao}
          maxLength={MISSAO_MAX}
          disabled={!loaded}
          onChange={(e) => setMissao(e.target.value)}
          placeholder="Em uma frase: para que a empresa existe."
          rows={3}
          style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'var(--font-ui)' }}
        />
        <p style={HINT_STYLE}>Opcional. Uma frase basta.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={!loaded || saving}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font-ui)',
            cursor: !loaded || saving ? 'default' : 'pointer',
            opacity: !loaded || saving ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {msg && (
          <p style={{ ...HINT_STYLE, color: msg.ok ? 'var(--text-secondary)' : 'var(--danger, #ff6b6b)' }}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}
