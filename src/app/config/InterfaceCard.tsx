'use client'

import { useEffect, useRef, useState } from 'react'
import { Toggle } from '@/app/agentes/parts'
import { takePrefetched } from './prefetch'


export function InterfaceCard() {
  const [on, setOn] = useState<boolean | null>(null) 
  const [err, setErr] = useState(false)
  
  const aliveRef = useRef(true)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])

  useEffect(() => {
    let alive = true
    ;(takePrefetched('/api/config/ui') ?? fetch('/api/config/ui'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { technical_mode?: boolean } | null) => { if (alive) setOn(j?.technical_mode ?? false) })
      .catch(() => { if (alive) { setOn(false); setErr(true) } })
    return () => { alive = false }
  }, [])

  async function toggle(v: boolean) {
    setOn(v) 
    setErr(false)
    try {
      const res = await fetch('/api/config/ui', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technical_mode: v }),
      })
      if (!aliveRef.current) return
      if (!res.ok) { setOn(!v); setErr(true) }
    } catch { if (aliveRef.current) { setOn(!v); setErr(true) } }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        Interface
      </span>
      <Toggle
        id="ui-technical-mode"
        label="Modo técnico"
        checked={on ?? false}
        onChange={toggle}
        disabled={on === null}
      />
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Mostra os controles avançados dos agentes (persona, ferramentas, modelo). Não recomendado.
      </p>
      {err && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>Não foi possível salvar — tente de novo.</p>}
    </div>
  )
}
