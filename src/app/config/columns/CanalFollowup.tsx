'use client'



import { useState } from 'react'
import { configFollowup, HORAS_MIN, HORAS_MAX } from '@/lib/canais/followup'

export function CanalFollowup({ canalId, config }: { canalId: string; config: unknown }) {
  const inicial = configFollowup(config)
  const [ligado, setLigado] = useState(inicial.ligado)
  const [horas, setHoras] = useState(String(inicial.horas))
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  async function salvar(proxLigado: boolean, proxHoras: string) {
    setSalvando(true)
    setMsg(null)
    const n = Number.parseInt(proxHoras, 10)
    const h = Number.isFinite(n) ? Math.min(HORAS_MAX, Math.max(HORAS_MIN, n)) : 4
    try {
      const res = await fetch('/api/config/canais/numeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal_id: canalId, followup: { ligado: proxLigado, horas: h } }),
      })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (j.ok) {
        
        setHoras(String(h))
        setMsg({ ok: true, texto: proxLigado ? `Ligado — toque após ${h}h de silêncio.` : 'Desligado.' })
      } else {
        setLigado(!proxLigado) 
        setMsg({ ok: false, texto: j.error ?? 'Não consegui salvar.' })
      }
    } catch (err) {
      setLigado(!proxLigado)
      setMsg({ ok: false, texto: err instanceof Error ? err.message : 'Falhou.' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: salvando ? 'wait' : 'pointer' }}>
        <input
          type="checkbox"
          checked={ligado}
          disabled={salvando}
          onChange={(e) => { setLigado(e.target.checked); void salvar(e.target.checked, horas) }}
          style={{ accentColor: 'var(--accent-a, #28E0C8)', width: 14, height: 14, cursor: 'inherit' }}
        />
        <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>Dar um toque em quem sumiu</span>
      </label>
      <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Se o cliente parar de responder no meio da conversa, o agente manda{' '}
        <strong style={{ color: 'var(--text-secondary)', fontWeight: 550 }}>uma</strong> mensagem retomando o
        assunto — e só dentro das 24h da última mensagem dele, sem custo extra de plataforma. Quem responder
        não recebe o toque.
      </span>
      {ligado && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Esperar</span>
          <input
            type="number"
            min={HORAS_MIN}
            max={HORAS_MAX}
            value={horas}
            disabled={salvando}
            aria-label="Horas de silêncio antes do toque"
            onChange={(e) => setHoras(e.target.value)}
            onBlur={() => void salvar(true, horas)}
            style={{
              width: 62, background: 'var(--surface)', border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)', padding: '5px 8px', color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)', fontSize: 12.5, outline: 'none',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>horas de silêncio</span>
        </div>
      )}
      {msg && (
        <span role="status" style={{ fontSize: 11.5, color: msg.ok ? 'var(--approve)' : 'var(--reject)' }}>
          {msg.ok ? '✓' : '✗'} {msg.texto}
        </span>
      )}
    </div>
  )
}
