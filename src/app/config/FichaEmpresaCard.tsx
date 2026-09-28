'use client'



import { useEffect, useRef, useState } from 'react'
import type { FatoEmpresa, CategoriaFato } from '@/lib/memory/fichaEmpresa'

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

const CATEGORIAS: { value: CategoriaFato | ''; label: string }[] = [
  { value: '', label: 'Sem categoria' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'oferta', label: 'Oferta' },
  { value: 'publico', label: 'Público-alvo' },
  { value: 'politica', label: 'Política' },
  { value: 'dados', label: 'Dados cadastrais' },
  { value: 'outro', label: 'Outro' },
]

const BADGE_COLORS: Record<CategoriaFato, string> = {
  financeiro: 'rgba(40, 224, 200, 0.15)',
  oferta:     'rgba(124, 92, 255, 0.15)',
  publico:    'rgba(255, 180, 70, 0.15)',
  politica:   'rgba(229, 99, 77, 0.15)',
  dados:      'rgba(120, 120, 120, 0.15)',
  outro:      'rgba(80, 80, 80, 0.12)',
}

const BADGE_TEXT: Record<CategoriaFato, string> = {
  financeiro: '#28E0C8',
  oferta:     '#9c82ff',
  publico:    '#f0a830',
  politica:   '#e5634d',
  dados:      '#aaa',
  outro:      '#888',
}

const CATEGORIA_LABEL: Record<CategoriaFato, string> = {
  financeiro: 'Financeiro',
  oferta:     'Oferta',
  publico:    'Público-alvo',
  politica:   'Política',
  dados:      'Dados cadastrais',
  outro:      'Outro',
}

export function FichaEmpresaCard() {
  const [loaded, setLoaded] = useState(false)
  const [fatos, setFatos] = useState<FatoEmpresa[]>([])
  const [rotulo, setRotulo] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<CategoriaFato | ''>('')
  const [adicionando, setAdicionando] = useState(false)
  const [removendo, setRemovendoId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const aliveRef = useRef(true)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/config/ficha-empresa')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j: { fatos?: FatoEmpresa[] } | null) => {
        if (!alive) return
        if (j?.fatos) {
          setFatos(j.fatos)
        } else {
          setMsg({ ok: false, text: 'Nao foi possivel carregar os fatos salvos.' })
        }
        setLoaded(true)
      })
    return () => { alive = false }
  }, [])

  async function adicionar() {
    const rotuloTrim = rotulo.trim()
    const valorTrim = valor.trim()
    if (!rotuloTrim || !valorTrim) {
      setMsg({ ok: false, text: 'Preencha o rotulo e o valor antes de adicionar.' })
      return
    }
    setAdicionando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/config/ficha-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          fato: { rotulo: rotuloTrim, valor: valorTrim, categoria: categoria || undefined },
        }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; fatos?: FatoEmpresa[]; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok && j.fatos) {
        setFatos(j.fatos)
        setRotulo('')
        setValor('')
        setCategoria('')
        setMsg({ ok: true, text: 'Fato adicionado.' })
      } else {
        setMsg({ ok: false, text: j?.error ?? 'Não foi possível adicionar o fato. Tente de novo.' })
      }
    } catch {
      if (aliveRef.current) setMsg({ ok: false, text: 'Não foi possível adicionar o fato. Tente de novo.' })
    } finally {
      if (aliveRef.current) setAdicionando(false)
    }
  }

  async function remover(id: string) {
    setRemovendoId(id)
    setMsg(null)
    try {
      const res = await fetch('/api/config/ficha-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', id }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; fatos?: FatoEmpresa[]; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok && j.fatos) {
        setFatos(j.fatos)
        setMsg({ ok: true, text: 'Fato removido.' })
      } else {
        setMsg({ ok: false, text: j?.error ?? 'Não foi possível remover. Tente de novo.' })
      }
    } catch {
      if (aliveRef.current) setMsg({ ok: false, text: 'Não foi possível remover. Tente de novo.' })
    } finally {
      if (aliveRef.current) setRemovendoId(null)
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
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Fatos da empresa
        </span>
        <p style={HINT_STYLE}>
          O que o assistente sempre sabe sobre a empresa. Fatos aqui entram em toda conversa,
          sem precisar buscar. Você também pode registrar fatos pelo chat (o assistente aprende
          automaticamente).
        </p>
      </div>

      {}
      {!loaded ? (
        <p style={HINT_STYLE}>Carregando...</p>
      ) : fatos.length === 0 ? (
        <p style={{ ...HINT_STYLE, fontStyle: 'italic' }}>
          Nenhum fato ainda. Adicione o que o assistente deve sempre saber, ou registre pelo chat.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fatos.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {f.rotulo}
                  </span>
                  {f.categoria && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: BADGE_COLORS[f.categoria],
                        color: BADGE_TEXT[f.categoria],
                        flexShrink: 0,
                      }}
                    >
                      {CATEGORIA_LABEL[f.categoria]}
                    </span>
                  )}
                  {f.fonte === 'conversa' && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: 'rgba(120,120,120,0.10)',
                        color: '#888',
                        flexShrink: 0,
                      }}
                    >
                      via chat
                    </span>
                  )}
                </div>
                <p style={{ ...HINT_STYLE, marginTop: 2, wordBreak: 'break-word' }}>
                  {f.valor}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remover(f.id)}
                disabled={removendo === f.id}
                aria-label={`Remover fato "${f.rotulo}"`}
                style={{
                  ...BUTTON_STYLE,
                  padding: '5px 10px',
                  fontSize: 12,
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  flexShrink: 0,
                  opacity: removendo === f.id ? 0.5 : 1,
                  cursor: removendo === f.id ? 'not-allowed' : 'pointer',
                }}
              >
                {removendo === f.id ? '...' : 'Remover'}
              </button>
            </div>
          ))}
        </div>
      )}

      {}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--border-hairline)',
        }}
      >
        <span style={LABEL_STYLE}>Adicionar fato</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            placeholder='Rótulo (ex.: "Comissão padrão", "Ticket médio", "CNPJ")'
            maxLength={80}
            disabled={adicionando}
            style={INPUT_STYLE}
          />
          <input
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder='Valor (ex.: "15%", "R$ 3.000", "00.000.000/0001-00")'
            maxLength={400}
            disabled={adicionando}
            style={INPUT_STYLE}
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaFato | '')}
            disabled={adicionando}
            style={{ ...INPUT_STYLE, width: 'auto' }}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => void adicionar()}
            disabled={adicionando || !rotulo.trim() || !valor.trim()}
            style={{
              ...BUTTON_STYLE,
              opacity: adicionando || !rotulo.trim() || !valor.trim() ? 0.6 : 1,
              cursor: adicionando || !rotulo.trim() || !valor.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {adicionando ? 'Adicionando...' : 'Adicionar'}
          </button>
          {msg && (
            <p role="status" style={{ ...HINT_STYLE, color: msg.ok ? 'var(--approve)' : 'var(--reject)' }}>
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
