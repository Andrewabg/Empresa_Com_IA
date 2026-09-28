'use client'



import { useRef, useState } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }
interface AcaoSimulada {
  toolkit: string | null
  slug: string
  args: Record<string, unknown>
  modo: 'hitl' | 'direto'
}

type Turno = Msg & { acoes?: AcaoSimulada[] }

export function Simulador({ agentId, agentName }: { agentId: string; agentName?: string }) {
  const [mensagens, setMensagens] = useState<Turno[]>([])
  const [entrada, setEntrada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  async function enviar() {
    const texto = entrada.trim()
    if (!texto || enviando) return
    setErro(null)
    const proxUser: Turno = { role: 'user', content: texto }
    const transcript = [...mensagens, proxUser]
    setMensagens(transcript)
    setEntrada('')
    setEnviando(true)
    try {
      const res = await fetch('/api/agents/' + encodeURIComponent(agentId) + '/draft/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        
        body: JSON.stringify({ mensagens: transcript.map(({ role, content }) => ({ role, content })), origem: 'rascunho' }),
      })
      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try { const j = (await res.json()) as { error?: string }; if (j?.error) detail = j.error } catch {  }
        setErro(`Não foi possível simular (${detail}).`)
        setEnviando(false)
        return
      }
      const j = (await res.json()) as { texto?: string; acoesSimuladas?: AcaoSimulada[] }
      setMensagens((prev) => [
        ...prev,
        { role: 'assistant', content: j.texto ?? '', acoes: j.acoesSimuladas ?? [] },
      ])
      
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight })
    } catch (e) {
      setErro(`Não foi possível simular (${e instanceof Error ? e.message : String(e)}).`)
    } finally {
      setEnviando(false)
    }
  }

  function reiniciar() {
    setMensagens([])
    setEntrada('')
    setErro(null)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)',
      background: 'var(--surface)', overflow: 'hidden',
    }}>
      {}
      <div style={{
        flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, padding: '11px 14px 0',
      }}>
        <span style={{
          fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: 'var(--text-tertiary)',
        }}>
          Simulador{agentName ? (
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
              · {agentName}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={reiniciar}
          disabled={mensagens.length === 0}
          style={{
            padding: '4px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)', background: 'transparent',
            color: 'var(--text-tertiary)', fontSize: 12,
            cursor: mensagens.length === 0 ? 'not-allowed' : 'pointer', opacity: mensagens.length === 0 ? 0.5 : 1,
          }}
        >
          Reiniciar
        </button>
      </div>

      {}
      <p style={{ margin: 0, padding: '0 14px', fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        As chamadas externas estão desligadas — nada é enviado a contatos reais.
      </p>

      {}
      <div
        ref={scrollRef}
        className="cc-scroll"
        style={{
          margin: '0 10px', padding: '10px 8px',
          minHeight: 140, maxHeight: 280, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10,
          background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        {mensagens.length === 0 ? (
          <p style={{ margin: 'auto', fontSize: 12.5, color: 'var(--text-tertiary)', textAlign: 'center' }}>
            Escreva uma mensagem como se fosse um cliente e veja como o rascunho responde.
          </p>
        ) : (
          mensagens.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '82%',
                padding: '8px 12px',
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                background: m.role === 'user' ? 'var(--surface-elevated)' : 'var(--surface)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-primary)',
              }}>
                {m.content || (m.role === 'assistant' ? '(sem resposta)' : '')}
              </div>
              {}
              {m.role === 'assistant' && m.acoes && m.acoes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: '90%' }}>
                  {m.acoes.map((a, j) => (
                    <span
                      key={j}
                      title={JSON.stringify(a.args)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '3px 9px', borderRadius: 99, fontSize: 11,
                        border: `1px solid ${a.modo === 'hitl' ? 'rgb(214 158 46 / 0.35)' : 'var(--border-hairline)'}`,
                        background: a.modo === 'hitl' ? 'rgb(214 158 46 / 0.08)' : 'var(--surface-elevated)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <code style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--text-secondary)' }}>
                        {a.toolkit ? `${a.toolkit}·` : ''}{a.slug}
                      </code>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {a.modo === 'hitl' ? 'simulado · exigiria aprovação' : 'simulado · direto'}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {enviando && (
          <div style={{ alignSelf: 'flex-start', fontSize: 12.5, color: 'var(--text-tertiary)', padding: '2px 4px' }}>
            digitando…
          </div>
        )}
      </div>

      {erro && (
        <p style={{ margin: 0, padding: '0 14px', fontSize: 12, color: 'var(--reject)' }}>{erro}</p>
      )}

      {}
      <div style={{ flex: '0 0 auto', display: 'flex', gap: 8, padding: '0 14px 12px' }}>
        <input
          type="text"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void enviar() } }}
          placeholder="Escreva como um cliente…"
          disabled={enviando}
          style={{
            flex: 1, boxSizing: 'border-box',
            fontFamily: 'var(--font-ui)', fontSize: 13.5, color: 'var(--text-primary)',
            background: 'var(--surface)', border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)', padding: '9px 12px', outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={enviando || !entrada.trim()}
          style={{
            flexShrink: 0, padding: '9px 20px', borderRadius: 'var(--radius-sm)',
            border: '1px solid transparent', background: 'var(--text-primary)', color: 'var(--bg-base)',
            fontSize: 13.5, fontWeight: 500,
            cursor: enviando || !entrada.trim() ? 'not-allowed' : 'pointer',
            opacity: enviando || !entrada.trim() ? 0.5 : 1,
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
