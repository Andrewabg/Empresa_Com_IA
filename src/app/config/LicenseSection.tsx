'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import type { LicenseState } from '@/lib/license-state'
import { describeConfig, TONE_COLOR } from '@/lib/license-copy'
import { takePrefetched } from './prefetch'

const MEMBERS_URL = 'https://elitedaia.com.br/dashboard' 

interface LicenseResponse {
  state: LicenseState
  buyer_name?: string
  club_incluso_ate?: string
  
  firehose_reason?: string
  error?: string
}


function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function LicenseSection() {
  const [state, setState] = useState<LicenseState | null>(null)
  const [buyerName, setBuyerName] = useState<string | undefined>(undefined)
  const [inclusoAte, setInclusoAte] = useState<string | undefined>(undefined)
  const [firehoseReason, setFirehoseReason] = useState<string | undefined>(undefined)
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mounted = useRef(true)
  useEffect(() => {
    
    
    
    
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const apply = useCallback((j: LicenseResponse) => {
    setState(j.state)
    setBuyerName(j.buyer_name)
    setInclusoAte(j.club_incluso_ate)
    setFirehoseReason(j.firehose_reason)
  }, [])

  
  useEffect(() => {
    ;(takePrefetched('/api/license') ?? fetch('/api/license'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j: LicenseResponse | null) => {
        if (mounted.current && j) apply(j)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setLoading(false)
      })
  }, [apply])

  const activate = useCallback(async () => {
    const key = licenseKey.trim()
    if (!key || activating) return
    setActivating(true)
    setError(null)
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: key }),
      })
      const json = (await res.json().catch(() => null)) as LicenseResponse | null
      if (!res.ok || !json) {
        setError(json?.error ?? 'Não foi possível ativar a licença.')
        return
      }
      apply(json)
      setLicenseKey('') 
    } catch {
      setError('Não foi possível ativar a licença.')
    } finally {
      if (mounted.current) setActivating(false)
    }
  }, [licenseKey, activating, apply])

  const desc = describeConfig(state, { buyerName, formattedDate: fmtDate(inclusoAte), firehoseReason })

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Licença
        </h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          Opcional. Sua chave de licença libera novidades e o acesso ao clube. O
          sistema funciona sem ela — isto não destrava nem bloqueia o motor.
        </p>
      </div>

      {}
      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
          Carregando licença…
        </p>
      ) : (
        state &&
        desc.text && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13.5,
              lineHeight: 1.45,
              color: TONE_COLOR[desc.tone],
            }}
          >
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: 99,
                background: TONE_COLOR[desc.tone],
                flexShrink: 0,
              }}
            />
            {desc.text}
            {state === 'in_use_elsewhere' && (
              <a
                href={MEMBERS_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: 8, color: 'var(--wave-from)', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Abrir o painel ↗
              </a>
            )}
          </div>
        )
      )}

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <label
          htmlFor="license_key"
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Chave de licença
        </label>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, flexWrap: 'wrap' }}>
          <input
            id="license_key"
            name="license_key"
            type="password"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void activate()
              }
            }}
            placeholder={
              state && state !== 'never_verified'
                ? '••••••••  (cole uma nova chave para trocar)'
                : 'AWAVE-XXXX-XXXX-XXXX'
            }
            autoComplete="off"
            style={{
              flex: 1,
              minWidth: 200,
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              padding: '11px 14px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => void activate()}
            disabled={activating || licenseKey.trim().length === 0}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgb(40 224 200 / 0.18)',
              background: 'rgb(40 224 200 / 0.07)',
              color: 'var(--wave-from)',
              fontSize: 13.5,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              cursor: activating || licenseKey.trim().length === 0 ? 'not-allowed' : 'pointer',
              opacity: activating || licenseKey.trim().length === 0 ? 0.5 : 1,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {activating ? 'Ativando...' : 'Ativar'}
          </button>
        </div>
        {error && (
          <p
            role="status"
            style={{ margin: '2px 0 0', fontSize: 12.5, lineHeight: 1.45, color: 'var(--reject)' }}
          >
            ✗ {error}
          </p>
        )}
      </div>
    </section>
  )
}
