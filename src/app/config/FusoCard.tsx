'use client'

import { useEffect, useRef, useState } from 'react'
import { TZ_DEFAULT, ehFusoValido } from '@/lib/tempo/fusoDoDono'


const FUSOS = [
  'America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Fortaleza',
  'America/Rio_Branco', 'America/Noronha',
  'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Santiago',
  'America/Buenos_Aires', 'America/Montevideo', 'America/Asuncion', 'America/La_Paz',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/Lisbon', 'Europe/Madrid', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Africa/Luanda', 'Africa/Maputo', 'Asia/Dubai', 'Asia/Tokyo', 'Australia/Sydney',
]

export function FusoCard() {
  const [fuso, setFuso] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [err, setErr] = useState('')
  const aliveRef = useRef(true)
  
  
  
  
  const confirmadoRef = useRef<string | null>(null)
  
  
  
  
  
  
  const seqRef = useRef(0)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/config/fuso')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { fuso?: string | null } | null) => {
        if (!alive) return
        
        
        const palpite = (() => {
          try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' }
        })()
        const valor = j?.fuso ?? (ehFusoValido(palpite) ? palpite : TZ_DEFAULT)
        confirmadoRef.current = valor
        setFuso(valor)
      })
      .catch(() => { if (alive) { confirmadoRef.current = TZ_DEFAULT; setFuso(TZ_DEFAULT) } })
    return () => { alive = false }
  }, [])

  async function salvar(v: string) {
    const anterior = confirmadoRef.current
    const minhaSeq = ++seqRef.current
    setFuso(v); setSalvo(false); setErr('')
    try {
      const res = await fetch('/api/config/fuso', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fuso: v }),
      })
      if (!aliveRef.current) return
      
      
      if (minhaSeq !== seqRef.current) return
      
      
      if (res.ok) { confirmadoRef.current = v; setSalvo(true) }
      else { setFuso(anterior); setErr('Não foi possível salvar esse fuso.') }
    } catch {
      if (aliveRef.current && minhaSeq === seqRef.current) {
        setFuso(anterior); setErr('Não foi possível salvar esse fuso.')
      }
    }
  }

  const opcoes = fuso && !FUSOS.includes(fuso) ? [fuso, ...FUSOS] : FUSOS

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        Fuso horário
      </span>
      <select
        aria-label="Fuso horário"
        value={fuso ?? TZ_DEFAULT}
        disabled={fuso === null}
        onChange={(e) => void salvar(e.target.value)}
        style={{ background: 'var(--surface-2, transparent)', color: 'var(--text-primary)', border: '1px solid var(--border-hairline)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
      >
        {opcoes.map((tz) => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
      </select>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        É a hora que vale para os seus lembretes, para as rotinas dos funcionários, para o resumo da manhã e para a janela de silêncio da noite.
      </p>
      {salvo && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>Salvo.</p>}
      {err && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>{err}</p>}
    </div>
  )
}
