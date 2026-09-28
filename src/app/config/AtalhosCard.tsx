'use client'



import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { takePrefetched } from './prefetch'
import {
  ATALHOS_MAX,
  ATALHO_NOME_MAX,
  TEXTOS_ATALHOS_RAIL,
  nomeAtalhoValido,
  validarUrlAtalho,
  type Atalho,
} from '@/lib/atalhosRail'

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

export function AtalhosCard() {
  
  
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [atalhos, setAtalhos] = useState<Atalho[]>([])
  const [nomeNovo, setNomeNovo] = useState('')
  const [urlNovo, setUrlNovo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const aliveRef = useRef(true)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])

  useEffect(() => {
    let alive = true
    ;(takePrefetched('/api/config/atalhos') ?? fetch('/api/config/atalhos'))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j: { atalhos?: Atalho[] } | null) => {
        if (!alive) return
        if (j?.atalhos) {
          setAtalhos(j.atalhos)
        } else {
          setMsg({ ok: false, text: TEXTOS_ATALHOS_RAIL.carregarFalhou })
        }
        setLoaded(true)
      })
    return () => { alive = false }
  }, [])

  
  async function persistir(proxima: Atalho[], anterior: Atalho[]) {
    setSalvando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/config/atalhos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atalhos: proxima }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; atalhos?: Atalho[]; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok && j.atalhos) {
        setAtalhos(j.atalhos)
        setMsg({ ok: true, text: TEXTOS_ATALHOS_RAIL.salvo })
        router.refresh()
      } else {
        setAtalhos(anterior)
        setMsg({ ok: false, text: j?.error ?? TEXTOS_ATALHOS_RAIL.salvarFalhou })
      }
    } catch {
      if (aliveRef.current) {
        setAtalhos(anterior)
        setMsg({ ok: false, text: TEXTOS_ATALHOS_RAIL.salvarFalhou })
      }
    } finally {
      if (aliveRef.current) setSalvando(false)
    }
  }

  async function adicionar() {
    
    
    
    if (atalhos.length >= ATALHOS_MAX) {
      setMsg({ ok: false, text: TEXTOS_ATALHOS_RAIL.limiteAtingido })
      return
    }
    const nome = nomeNovo.trim()
    const url = urlNovo.trim()
    if (!nomeAtalhoValido(nome)) {
      setMsg({ ok: false, text: TEXTOS_ATALHOS_RAIL.nomeObrigatorio })
      return
    }
    if (!validarUrlAtalho(url)) {
      setMsg({ ok: false, text: TEXTOS_ATALHOS_RAIL.urlInvalida })
      return
    }
    const anterior = atalhos
    const proxima = [...atalhos, { nome, url }]
    await persistir(proxima, anterior)
    if (aliveRef.current) { setNomeNovo(''); setUrlNovo('') }
  }

  async function remover(indice: number) {
    const anterior = atalhos
    const proxima = atalhos.filter((_, i) => i !== indice)
    await persistir(proxima, anterior)
  }

  const cheio = atalhos.length >= ATALHOS_MAX

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
          Atalhos
        </span>
        <p style={HINT_STYLE}>
          Fixe links importantes no menu lateral, como uma dashboard externa ou uma área de
          treinamento. Eles aparecem para toda a equipe, numa aba nova.
        </p>
      </div>

      {}
      {loaded && atalhos.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {atalhos.map((a, i) => (
            <li
              key={a.url + a.nome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{a.nome}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.url}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void remover(i)}
                disabled={salvando}
                aria-label={`Remover atalho ${a.nome}`}
                style={{ ...BUTTON_STYLE, padding: '6px 12px', background: 'transparent', color: 'var(--text-secondary)', opacity: salvando ? 0.6 : 1, cursor: salvando ? 'not-allowed' : 'pointer' }}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 160px' }}>
            <label htmlFor="atalho-nome" style={LABEL_STYLE}>Nome</label>
            <input
              id="atalho-nome"
              type="text"
              value={nomeNovo}
              maxLength={ATALHO_NOME_MAX}
              disabled={!loaded || salvando || cheio}
              onChange={(e) => setNomeNovo(e.target.value)}
              placeholder="Dashboard de vendas"
              autoComplete="off"
              style={INPUT_STYLE}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '2 1 240px' }}>
            <label htmlFor="atalho-url" style={LABEL_STYLE}>Link</label>
            <input
              id="atalho-url"
              type="url"
              value={urlNovo}
              disabled={!loaded || salvando || cheio}
              onChange={(e) => setUrlNovo(e.target.value)}
              placeholder="https://"
              autoComplete="off"
              style={INPUT_STYLE}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => void adicionar()}
            disabled={!loaded || salvando || cheio}
            style={{ ...BUTTON_STYLE, opacity: !loaded || salvando || cheio ? 0.6 : 1, cursor: !loaded || salvando || cheio ? 'not-allowed' : 'pointer' }}
          >
            {salvando ? 'Salvando…' : 'Adicionar atalho'}
          </button>
          {msg && (
            <p role="status" style={{ ...HINT_STYLE, color: msg.ok ? 'var(--approve)' : 'var(--reject)' }}>
              {msg.text}
            </p>
          )}
        </div>
        <p style={HINT_STYLE}>
          Até {ATALHOS_MAX} atalhos. Só links que comecem com http:// ou https:// são aceitos.
        </p>
      </div>
    </div>
  )
}
