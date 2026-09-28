'use client'


import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'
import { getConnectionGuide } from './connectionGuides'
import { connectFailCopy, normalizeReason, type ConnectFailCopy } from '@/lib/connections/activation-outcome'
import { EXPLICACAO_SEM_CONEXAO } from '@/lib/connections/semAuth'

const REDIRECT_URL = 'https://backend.composio.dev/api/v3.1/toolkits/auth/callback'
const POLL_MS = 2000
const POLL_TIMEOUT_MS = 150_000 

interface ActivationField {
  name: string
  label: string
  required: boolean
  type: string
  description?: string
}
type Plan =
  | { mode: 'managed' }
  | { mode: 'byo'; fields: ActivationField[] }
  | { mode: 'apikey'; fields: ActivationField[] }
  
  
  | { mode: 'none' }

export function ConnectionActivateModal({
  slug,
  name,
  open,
  onOpenChange,
  onConnected,
}: {
  slug: string
  name: string
  open: boolean
  onOpenChange: (o: boolean) => void
  onConnected: () => void
}) {
  const [loadingFields, setLoadingFields] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [fieldsError, setFieldsError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [connecting, setConnecting] = useState(false)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [error, setError] = useState<ConnectFailCopy | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  
  useEffect(() => () => stopPoll(), [stopPoll])
  useEffect(() => {
    if (!open) stopPoll()
  }, [open, stopPoll])

  
  useEffect(() => {
    if (!open) return
    setPlan(null)
    setFieldsError(null)
    setValues({})
    setConnecting(false)
    setStatusText(null)
    setError(null)
    setLoadingFields(true)
    let alive = true
    fetch(`/api/config/connections/fields?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as
          | { mode?: 'managed' | 'byo' | 'apikey' | 'none'; fields?: ActivationField[]; error?: string }
          | null
        if (!alive) return
        if (!r.ok || !j || j.error || !j.mode) {
          setFieldsError(j?.error ?? 'Não consegui ler este toolkit. Tente de novo.')
          return
        }
        if (j.mode === 'byo' || j.mode === 'apikey') {
          const fields = j.fields ?? []
          setPlan({ mode: j.mode, fields })
          setValues(Object.fromEntries(fields.map((f) => [f.name, ''])))
        } else if (j.mode === 'none') {
          setPlan({ mode: 'none' })
        } else {
          setPlan({ mode: 'managed' })
        }
      })
      .catch(() => {
        if (alive) setFieldsError('Não consegui ler este toolkit. Tente de novo.')
      })
      .finally(() => {
        if (alive) setLoadingFields(false)
      })
    return () => {
      alive = false
    }
  }, [open, slug])

  const requiredMissing =
    plan?.mode === 'byo' || plan?.mode === 'apikey'
      ? plan.fields.some((f) => f.required && !(values[f.name] ?? '').trim())
      : false

  
  const guide = getConnectionGuide(slug)

  function startPolling(connectionId: string) {
    setStatusText('Aguardando você autorizar na outra aba…')
    const deadline = Date.now() + POLL_TIMEOUT_MS
    stopPoll()
    pollRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        stopPoll()
        setError({ message: 'Tempo esgotado esperando a autorização. Conclua na outra aba e tente de novo.' })
        setConnecting(false)
        setStatusText(null)
        return
      }
      try {
        const r = await fetch(`/api/config/connections/status?id=${encodeURIComponent(connectionId)}`)
        const j = (await r.json().catch(() => null)) as { status?: string } | null
        const status = String(j?.status ?? '').toUpperCase()
        if (status === 'ACTIVE') {
          stopPoll()
          setConnecting(false)
          setStatusText(null)
          onConnected()
          onOpenChange(false)
        } else if (status === 'FAILED' || status === 'EXPIRED') {
          stopPoll()
          setError({ message: 'A autorização falhou ou expirou. Tente de novo.' })
          setConnecting(false)
          setStatusText(null)
        }
        
      } catch {
        
      }
    }, POLL_MS)
  }

  async function handleConnect() {
    if (connecting) return
    setError(null)
    setConnecting(true)
    setStatusText('Iniciando conexão…')
    try {
      const credentials =
        (plan?.mode === 'byo' || plan?.mode === 'apikey') && Object.keys(values).length ? values : undefined
      const r = await fetch('/api/config/connections/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        
        
        body: JSON.stringify({ slug, credentials, returnTo: window.location.pathname }),
      })
      const j = (await r.json().catch(() => null)) as
        | { redirectUrl?: string; connectionId?: string; active?: boolean; error?: string; reason?: string }
        | null
      if (!r.ok || !j || j.error) {
        setError(connectFailCopy(normalizeReason(j?.reason), name))
        setConnecting(false)
        setStatusText(null)
        return
      }
      
      if (j.active) {
        setConnecting(false)
        setStatusText(null)
        onConnected()
        onOpenChange(false)
        return
      }
      if (!j.redirectUrl || !j.connectionId) {
        setError(connectFailCopy('oauth_nao_iniciou', name))
        setConnecting(false)
        setStatusText(null)
        return
      }
      window.open(j.redirectUrl, '_blank', 'noopener,noreferrer')
      startPolling(j.connectionId)
    } catch {
      setError(connectFailCopy('sem_rede', name))
      setConnecting(false)
      setStatusText(null)
    }
  }

  const canConnect = !!plan && !connecting && !requiredMissing

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Conectar ${name}`}
      hint="Autorize esta ferramenta para liberar suas ações aos agentes que dependem dela."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loadingFields && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
            Carregando opções de conexão…
          </p>
        )}

        {!loadingFields && fieldsError && (
          <p role="status" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--reject)' }}>
            {fieldsError}
          </p>
        )}

        {!loadingFields && plan?.mode === 'none' && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {EXPLICACAO_SEM_CONEXAO}
          </p>
        )}

        {!loadingFields && plan?.mode === 'managed' && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            Conexão gerenciada pelo Composio. Clique em <strong style={{ color: 'var(--text-primary)' }}>Conectar</strong>{' '}
            e conclua a autorização na nova aba.
          </p>
        )}

        {!loadingFields && plan?.mode === 'byo' && (
          <>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Use as credenciais do seu próprio app OAuth. No app, registre esta URL de redirecionamento:
            </p>
            <code
              style={{
                display: 'block',
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--text-secondary)',
                background: 'var(--surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
                padding: '9px 12px',
                wordBreak: 'break-all',
              }}
            >
              {REDIRECT_URL}
            </code>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {plan.fields.map((f) => {
                const inputId = `byo_${f.name}`
                return (
                  <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label
                      htmlFor={inputId}
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {f.label}
                      {f.required && <span style={{ color: 'var(--reject)' }}> *</span>}
                    </label>
                    <input
                      id={inputId}
                      name={inputId}
                      type={f.type === 'password' ? 'password' : 'text'}
                      value={values[f.name] ?? ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.name]: e.target.value }))
                      }
                      autoComplete="off"
                      spellCheck={false}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-md)',
                        padding: '11px 14px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-ui)',
                        fontSize: 14,
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </>
        )}

        {!loadingFields && plan?.mode === 'apikey' && (
          <>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Cole o token de acesso abaixo. Ele fica guardado com segurança no Vault e{' '}
              <strong style={{ color: 'var(--text-primary)' }}>nunca</strong> volta pro navegador.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {plan.fields.map((f) => {
                const inputId = `apikey_${f.name}`
                return (
                  <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label
                      htmlFor={inputId}
                      style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}
                    >
                      {guide?.fieldLabel ?? f.label}
                      {f.required && <span style={{ color: 'var(--reject)' }}> *</span>}
                    </label>
                    <input
                      id={inputId}
                      name={inputId}
                      type="password"
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Cole o token aqui"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-md)',
                        padding: '11px 14px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-ui)',
                        fontSize: 14,
                        outline: 'none',
                        width: '100%',
                      }}
                    />
                  </div>
                )
              })}
            </div>

            {}
            {guide ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '14px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                  Como gerar o token
                </span>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{guide.intro}</p>
                <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {guide.steps.map((s, i) => (
                    <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{s}</li>
                  ))}
                </ol>
                {guide.link && (
                  <a
                    href={guide.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 2,
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: 'var(--wave-from)',
                      textDecoration: 'none',
                    }}
                  >
                    {guide.link.label} <span aria-hidden>→</span>
                  </a>
                )}
              </div>
            ) : (
              plan.fields.find((f) => f.description)?.description && (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                  {plan.fields.find((f) => f.description)?.description}
                </p>
              )
            )}
          </>
        )}

        {statusText && (
          <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            {statusText}
          </p>
        )}

        {error && (
          <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--reject)' }}>{error.message}</p>
            {error.cta && (
              <Link
                href={error.cta.href}
                style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--wave-from)', textDecoration: 'none' }}
              >
                {error.cta.label} <span aria-hidden>→</span>
              </Link>
            )}
          </div>
        )}

        {}
        {!fieldsError && plan?.mode === 'none' && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 22px',
              cursor: 'pointer',
            }}
          >
            Entendi
          </button>
        )}

        {!fieldsError && plan?.mode !== 'none' && (
          <button
            type="button"
            onClick={handleConnect}
            disabled={!canConnect}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--bg-base)',
              background: 'linear-gradient(110deg, var(--wave-from), var(--wave-to))',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-md)',
              padding: '12px 22px',
              cursor: canConnect ? 'pointer' : 'not-allowed',
              opacity: canConnect ? 1 : 0.5,
            }}
          >
            {connecting ? 'Conectando…' : 'Conectar'}
          </button>
        )}
      </div>
    </Modal>
  )
}
