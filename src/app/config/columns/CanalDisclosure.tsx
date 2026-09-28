'use client'



import { useState } from 'react'
import { disclosurePadrao } from '@/lib/canais/disclosure'

export function CanalDisclosure({
  canalId,
  atual,
  empresa,
}: {
  canalId: string
  atual: string
  empresa: string
}) {
  const padrao = disclosurePadrao(empresa)
  const [texto, setTexto] = useState(atual || padrao)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  async function salvar() {
    setSalvando(true)
    setMsg(null)
    
    
    const valor = texto.trim()
    try {
      const res = await fetch('/api/config/canais/numeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal_id: canalId, disclosure: valor }),
      })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (j.ok) {
        if (!valor) setTexto(padrao)
        setMsg({ ok: true, texto: valor ? 'Salvo.' : 'Voltou ao texto padrão.' })
      } else {
        setMsg({ ok: false, texto: j.error ?? 'Não consegui salvar.' })
      }
    } catch (err) {
      setMsg({ ok: false, texto: err instanceof Error ? err.message : 'Falhou.' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
        Como o agente se apresenta na primeira mensagem da conversa (obrigatório por lei — dá para
        mudar o texto, não para desligar):
      </span>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        maxLength={300}
        aria-label="Texto de identificação do agente"
        style={{
          width: '100%', resize: 'vertical', background: 'var(--surface)',
          border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
          padding: '8px 10px', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
          fontSize: 12.5, lineHeight: 1.5, outline: 'none', boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando}
          style={{
            padding: '5px 12px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
            color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-ui)',
            cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.6 : 1,
          }}
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        {texto.trim() !== padrao && (
          <button
            type="button"
            onClick={() => setTexto(padrao)}
            style={{
              padding: 0, border: 'none', background: 'transparent',
              color: 'var(--text-tertiary)', fontSize: 11.5, fontFamily: 'var(--font-ui)', cursor: 'pointer',
            }}
          >
            usar o texto padrão
          </button>
        )}
        {msg && (
          <span role="status" style={{ fontSize: 11.5, color: msg.ok ? 'var(--approve)' : 'var(--reject)' }}>
            {msg.ok ? '✓' : '✗'} {msg.texto}
          </span>
        )}
      </div>
    </div>
  )
}
