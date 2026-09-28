'use client'



import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ToolkitCardData } from '@/server/agent/wireTypes'
import type { HiringDecisao } from './useHiringStream'
import { getStatusLabel } from './statusLabels'
import { connectFailCopy, normalizeReason, type ConnectFailCopy } from '@/lib/connections/activation-outcome'
import { isIconUrl } from '@/lib/integracoes/icon'

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


type Fase = 'repouso' | 'planejando' | 'form' | 'ativando' | 'aguardando' | 'composioAusente'

const REDIRECT_URL = 'https://backend.composio.dev/api/v3.1/toolkits/auth/callback'

export interface ToolkitCardProps {
  data: ToolkitCardData
  
  bloqueado: boolean
  decidir: (slug: string, decisao: HiringDecisao) => Promise<{ ok: boolean; error?: string }>
  
  onConectada: (slug: string) => void
}

export function ToolkitCard({ data, bloqueado, decidir, onConectada }: ToolkitCardProps) {
  const [fase, setFase] = useState<Fase>('repouso')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<ConnectFailCopy | null>(null)
  const [decidindo, setDecidindo] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mounted = useRef(true)
  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stopPoll()
    }
  }, [stopPoll])

  
  useEffect(() => {
    if (data.status === 'conectada') {
      stopPoll()
      setFase('repouso')
      setErro(null)
    }
  }, [data.status, stopPoll])

  
  const startPolling = useCallback(
    (connectionId: string) => {
      const deadline = Date.now() + POLL_TIMEOUT_MS
      stopPoll()
      setFase('aguardando')
      pollRef.current = setInterval(async () => {
        if (!mounted.current) return
        if (Date.now() > deadline) {
          stopPoll()
          setErro({ message: 'Tempo esgotado esperando a autorização. Conclua na outra aba e tente de novo.' })
          setFase('repouso')
          return
        }
        try {
          const r = await fetch(`/api/config/connections/status?id=${encodeURIComponent(connectionId)}`)
          const j = (await r.json().catch(() => null)) as { status?: string } | null
          const status = String(j?.status ?? '').toUpperCase()
          if (status === 'ACTIVE') {
            stopPoll()
            if (!mounted.current) return
            setFase('repouso')
            setErro(null)
            onConectada(data.slug)
          } else if (status === 'FAILED' || status === 'EXPIRED') {
            stopPoll()
            if (!mounted.current) return
            setErro({ message: 'A autorização falhou ou expirou. Tente de novo.' })
            setFase('repouso')
          }
          
        } catch {
          
        }
      }, POLL_MS)
    },
    [data.slug, onConectada, stopPoll],
  )

  
  const ativar = useCallback(
    async (p: Plan, creds?: Record<string, string>) => {
      setFase('ativando')
      setErro(null)
      try {
        const r = await fetch('/api/config/connections/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: data.slug, ...(creds && Object.keys(creds).length ? { credentials: creds } : {}) }),
        })
        const j = (await r.json().catch(() => null)) as
          | { redirectUrl?: string; connectionId?: string; active?: boolean; error?: string; reason?: string }
          | null
        if (r.status === 409) {
          
          setFase('composioAusente')
          return
        }
        if (!r.ok || !j || j.error) {
          setErro(connectFailCopy(normalizeReason(j?.reason), data.name))
          setFase(p.mode === 'managed' || p.mode === 'none' ? 'repouso' : 'form')
          return
        }
        
        if (j.active) {
          setFase('repouso')
          onConectada(data.slug)
          return
        }
        if (!j.redirectUrl || !j.connectionId) {
          setErro(connectFailCopy('oauth_nao_iniciou', data.name))
          setFase(p.mode === 'managed' || p.mode === 'none' ? 'repouso' : 'form')
          return
        }
        window.open(j.redirectUrl, '_blank', 'noopener,noreferrer')
        startPolling(j.connectionId)
      } catch {
        setErro(connectFailCopy('sem_rede', data.name))
        setFase(p.mode === 'managed' || p.mode === 'none' ? 'repouso' : 'form')
      }
    },
    [data.slug, data.name, onConectada, startPolling],
  )

  
  const conectarAgora = useCallback(async () => {
    if (decidindo || fase === 'planejando' || fase === 'ativando' || fase === 'aguardando') return
    setErro(null)
    setDecidindo(true)
    
    const dec = await decidir(data.slug, 'aguardando_conexao')
    setDecidindo(false)
    if (!dec.ok) {
      console.warn('[ToolkitCard] conectarAgora: decisão falhou', dec.error)
      setErro({ message: 'Não consegui registrar agora — tenta de novo?' })
      return
    }
    setFase('planejando')
    try {
      const r = await fetch(`/api/config/connections/fields?slug=${encodeURIComponent(data.slug)}`)
      const j = (await r.json().catch(() => null)) as
        | { mode?: 'managed' | 'byo' | 'apikey' | 'none'; fields?: ActivationField[]; error?: string }
        | null
      if (r.status === 409) {
        setFase('composioAusente')
        return
      }
      if (!r.ok || !j || j.error || !j.mode) {
        setErro({ message: j?.error ?? 'Não consegui ler esta ferramenta. Tente de novo.' })
        setFase('repouso')
        return
      }
      
      
      if (j.mode === 'managed' || j.mode === 'none') {
        const p: Plan = { mode: j.mode }
        setPlan(p)
        await ativar(p)
      } else {
        const fields = j.fields ?? []
        const p: Plan = { mode: j.mode, fields }
        setPlan(p)
        setValues(Object.fromEntries(fields.map((f) => [f.name, ''])))
        setFase('form')
      }
    } catch {
      setErro({ message: 'Não consegui ler esta ferramenta. Tente de novo.' })
      setFase('repouso')
    }
  }, [data.slug, decidir, decidindo, fase, ativar])

  const decisaoSimples = useCallback(
    async (decisao: HiringDecisao) => {
      if (decidindo) return
      setErro(null)
      setDecidindo(true)
      stopPoll()
      const r = await decidir(data.slug, decisao)
      setDecidindo(false)
      if (!r.ok) {
        console.warn('[ToolkitCard] decisaoSimples falhou', r.error)
        setErro({ message: 'Não consegui registrar agora — tenta de novo?' })
      } else setFase('repouso')
    },
    [data.slug, decidir, decidindo, stopPoll],
  )

  const requiredMissing =
    plan && plan.mode !== 'managed' && plan.mode !== 'none'
      ? plan.fields.some((f) => f.required && !(values[f.name] ?? '').trim())
      : false

  const emAtivacao = fase === 'planejando' || fase === 'ativando' || fase === 'aguardando'
  const chipsBloqueados = bloqueado || decidindo || emAtivacao
  
  
  
  const dispensaConexao = data.activation?.mode === 'none'
  
  
  const podeConectar =
    !dispensaConexao &&
    (data.status === 'sugerido' || data.status === 'pendente' || data.status === 'dispensado' ||
      data.status === 'aguardando_conexao')
  const mostraDecisoes = data.status === 'sugerido' && !dispensaConexao

  return (
    <div
      style={{
        flex: '1 1 300px',
        minWidth: 260,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '13px 15px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {data.icon && (
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              flexShrink: 0,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              fontSize: 14,
              overflow: 'hidden',
            }}
          >
            {isIconUrl(data.icon) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.icon} alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
            ) : (
              data.icon
            )}
          </span>
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={data.name}
        >
          {data.name}
        </span>
        <StatusPill status={data.status} aguardando={fase === 'aguardando'} />
      </div>

      {}

      {}
      {fase === 'composioAusente' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            Pra conectar ferramentas, configure sua chave do Composio em{' '}
            <Link href="/config" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>
              Configurações
            </Link>
            . Sem pressa — dá pra deixar pra depois e o agente nasce pedindo essa conexão.
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <ChipButton onClick={() => void decisaoSimples('pendente')} disabled={bloqueado || decidindo}>
              Deixar pra depois
            </ChipButton>
          </div>
        </div>
      )}

      {}
      {fase === 'form' && plan && plan.mode !== 'managed' && plan.mode !== 'none' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {plan.mode === 'byo' && (
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
              No seu app OAuth, registre este redirecionamento:{' '}
              <code style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{REDIRECT_URL}</code>
            </p>
          )}
          {plan.mode === 'apikey' && (
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Cole o token abaixo — ele fica no cofre e nunca volta pro navegador.
            </p>
          )}
          {plan.fields.map((f) => {
            const inputId = `tk_${data.slug}_${f.name}`
            return (
              <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  htmlFor={inputId}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 500,
                    letterSpacing: '0.05em',
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
                  type={plan.mode === 'apikey' || f.type === 'password' ? 'password' : 'text'}
                  value={values[f.name] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <ChipButton
              primary
              disabled={requiredMissing}
              onClick={() => void ativar(plan, values)}
            >
              Conectar
            </ChipButton>
            {}
            <ChipButton onClick={() => void decisaoSimples('pendente')} disabled={bloqueado || decidindo}>
              Deixar pra depois
            </ChipButton>
          </div>
        </div>
      )}

      {}
      {fase === 'aguardando' && (
        <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Conclua a autorização na aba que abriu — eu percebo sozinho quando terminar.
        </p>
      )}

      {(fase === 'planejando' || fase === 'ativando') && (
        <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          {fase === 'planejando' ? 'Preparando a conexão…' : 'Iniciando a conexão…'}
        </p>
      )}

      {}
      {fase === 'repouso' && dispensaConexao && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Esta ferramenta não pede conexão: já funciona, e o agente nasce com ela.
        </p>
      )}
      {fase === 'repouso' && !dispensaConexao && data.status === 'conectada' && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          Pronta — o agente nasce com ela funcionando.
        </p>
      )}
      {fase === 'repouso' && !dispensaConexao && data.status === 'pendente' && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Fica pra depois — o agente nasce pedindo esta conexão em Configurações.
        </p>
      )}
      {fase === 'repouso' && data.status === 'indisponivel' && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Ainda não existe integração pronta — o agente segue sem ela.
        </p>
      )}
      {fase === 'repouso' && data.status === 'dispensado' && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          Você dispensou esta ferramenta.
        </p>
      )}
      {fase === 'repouso' && !dispensaConexao && !data.validado && data.status !== 'conectada' && (
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
          Confirmo os detalhes na hora de conectar.
        </p>
      )}

      {erro && (
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--reject)' }}>{erro.message}</p>
          {erro.cta && (
            <Link
              href={erro.cta.href}
              style={{ fontSize: 12, fontWeight: 500, color: 'var(--wave-from)', textDecoration: 'none' }}
            >
              {erro.cta.label} <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      )}

      {}
      {fase === 'repouso' && podeConectar && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <ChipButton
            primary
            onClick={() => void conectarAgora()}
            disabled={chipsBloqueados}
            title={bloqueado ? 'Aguarde a resposta do RH terminar' : undefined}
          >
            Conectar agora
          </ChipButton>
          {mostraDecisoes && (
            <>
              <ChipButton
                onClick={() => void decisaoSimples('pendente')}
                disabled={chipsBloqueados}
                title={bloqueado ? 'Aguarde a resposta do RH terminar' : undefined}
              >
                Deixar pra depois
              </ChipButton>
              <ChipButton
                onClick={() => void decisaoSimples('dispensado')}
                disabled={chipsBloqueados}
                title={bloqueado ? 'Aguarde a resposta do RH terminar' : undefined}
              >
                Não preciso
              </ChipButton>
            </>
          )}
        </div>
      )}
    </div>
  )
}




function StatusPill({ status, aguardando }: { status: string; aguardando: boolean }) {
  const conectada = status === 'conectada'
  const label = aguardando ? 'autorizando…' : getStatusLabel(status)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        fontSize: 11,
        color: conectada ? 'var(--text-secondary)' : 'var(--text-tertiary)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          flexShrink: 0,
          background: conectada
            ? 'linear-gradient(135deg, var(--wave-from), var(--wave-to))'
            : 'transparent',
          border: conectada ? 'none' : '1px solid var(--text-tertiary)',
          boxShadow: conectada ? '0 0 6px rgb(40 224 200 / 0.4)' : 'none',
          animation: aguardando ? 'tkPulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      {label}
    </span>
  )
}

function ChipButton({
  children,
  onClick,
  disabled,
  primary,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '6px 12px',
        borderRadius: 99,
        border: '1px solid var(--border-hairline)',
        background: primary ? 'var(--surface-elevated)' : 'transparent',
        color: primary ? 'var(--text-primary)' : 'var(--text-tertiary)',
        fontSize: 12,
        fontWeight: primary ? 600 : 500,
        fontFamily: 'var(--font-ui)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        transition: 'color 120ms ease, background 120ms ease',
      }}
    >
      {children}
    </button>
  )
}
