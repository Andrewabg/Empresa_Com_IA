'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '../ui'
import { takePrefetched } from '../prefetch'
import { DEFAULT_BRANDING, type Branding } from '@/lib/branding'
import { explicarConflito } from '@/lib/telegram/conflito'



interface TelegramData {
  ok: boolean
  status: { telegram_bot_token: boolean }
  pareado: boolean
  pairing: { code: string; expiresAt: string } | null
  pollLastSeen: string | null
  pollLastError: string | null
  
  pollDesligadoPorConfig?: boolean
  appPublicUrl: string | null
  
  quietHours?: { inicio: string; fim: string } | null
}



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



export function TelegramCard() {
  const [data, setData] = useState<TelegramData | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [appUrlInput, setAppUrlInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  
  const [agora, setAgora] = useState(() => Date.now())

  
  const appUrlFocusedRef = useRef(false)
  const lastServerAppUrlRef = useRef<string>('')
  const appUrlInputRef = useRef<string>('')
  appUrlInputRef.current = appUrlInput

  
  
  const [quietInicio, setQuietInicio] = useState('')
  const [quietFim, setQuietFim] = useState('')
  const lastServerQuietRef = useRef<{ inicio: string; fim: string }>({ inicio: '', fim: '' })
  const quietInputRef = useRef<{ inicio: string; fim: string }>({ inicio: '', fim: '' })
  quietInputRef.current = { inicio: quietInicio, fim: quietFim }

  
  const load = useCallback(async () => {
    try {
      const res = await (takePrefetched('/api/config/telegram') ?? fetch('/api/config/telegram'))
      if (res.ok) {
        const d = (await res.json()) as TelegramData
        setData(d)
        const serverVal = d.appPublicUrl ?? ''
        
        const inputMatchesServer = appUrlInputRef.current === lastServerAppUrlRef.current
        lastServerAppUrlRef.current = serverVal
        if (!appUrlFocusedRef.current || inputMatchesServer) {
          setAppUrlInput(serverVal)
        }
        const serverQuiet = d.quietHours ?? null
        if (serverQuiet) {
          const quietMatchesServer =
            quietInputRef.current.inicio === lastServerQuietRef.current.inicio &&
            quietInputRef.current.fim === lastServerQuietRef.current.fim
          lastServerQuietRef.current = serverQuiet
          if (quietMatchesServer) {
            setQuietInicio(serverQuiet.inicio)
            setQuietFim(serverQuiet.fim)
          }
        }
      }
    } catch {
      
    }
  }, [])

  useEffect(() => { void load() }, [load])

  
  
  const [assistantName, setAssistantName] = useState(DEFAULT_BRANDING.assistantName)
  useEffect(() => {
    let alive = true
    ;(takePrefetched('/api/config/brand') ?? fetch('/api/config/brand'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { branding?: Branding } | null) => {
        if (alive && j?.branding?.assistantName) setAssistantName(j.branding.assistantName)
      })
      .catch(() => {  })
    return () => { alive = false }
  }, [])

  
  useEffect(() => {
    if (!data?.pairing) return
    setAgora(Date.now())
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [data?.pairing])

  
  const pairingAtivo = Boolean(data?.pairing)
  useEffect(() => {
    if (!pairingAtivo) return
    const id = setInterval(() => void load(), 5000)
    return () => clearInterval(id)
  }, [pairingAtivo, load])

  
  
  
  const pareadoRefresh = Boolean(data?.pareado)
  useEffect(() => {
    if (!pareadoRefresh) return
    const id = setInterval(() => {
      if (!document.hidden) void load()
    }, 30_000)
    const onVis = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [pareadoRefresh, load])

  
  const salvar = async (extra?: Record<string, unknown>) => {
    setSaving(true)
    setMsg(null)
    try {
      const body: Record<string, unknown> = { ...extra }
      if (tokenInput.trim()) body.telegram_bot_token = tokenInput.trim()
      if (appUrlInput.trim() !== (data?.appPublicUrl ?? '')) body.app_public_url = appUrlInput.trim()
      
      
      const serverQuiet = data?.quietHours ?? null
      if (
        quietInicio && quietFim &&
        (quietInicio !== (serverQuiet?.inicio ?? '') || quietFim !== (serverQuiet?.fim ?? ''))
      ) {
        body.quietHours = { inicio: quietInicio, fim: quietFim }
      }
      
      if (Object.keys(body).length === 0) {
        setMsg({ ok: false, text: 'Preencha algo antes de salvar.' })
        return
      }
      const res = await fetch('/api/config/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (res.ok && json.ok) {
        if (extra?.gerar_codigo) setMsg(null)
        else if (extra?.desparear) setMsg({ ok: true, text: 'Despareado.' })
        else setMsg({ ok: true, text: 'Salvo.' })
        setTokenInput('')
      } else {
        setMsg({ ok: false, text: json.error ?? 'Falhou.' })
      }
      await load()
    } catch {
      setMsg({ ok: false, text: 'Não consegui falar com o servidor — tenta de novo?' })
    } finally {
      setSaving(false)
    }
  }

  
  const testar = async () => {
    setTesting(true)
    setMsg(null)
    try {
      const res = await fetch('/api/config/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenInput.trim() ? { token: tokenInput.trim() } : {}),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        username?: string
        detail?: string
      }
      setMsg(
        json.ok
          ? { ok: true, text: `Bot @${json.username} respondeu ✓` }
          : { ok: false, text: json.detail ?? 'Token inválido.' },
      )
    } catch {
      setMsg({ ok: false, text: 'Não consegui falar com o servidor — tenta de novo?' })
    } finally {
      setTesting(false)
    }
  }

  const desparear = () => {
    if (!window.confirm('Desparear o Telegram? Você vai precisar gerar um novo código para reconectar.')) return
    void salvar({ desparear: true })
  }

  
  const temToken = data?.status.telegram_bot_token ?? false
  const pareado = data?.pareado ?? false

  
  const restanteMs = data?.pairing ? new Date(data.pairing.expiresAt).getTime() - agora : 0
  const expirado = data?.pairing !== null && data?.pairing !== undefined && restanteMs <= 0
  const restanteMin = Math.floor(Math.max(0, restanteMs) / 60_000)
  const restanteSeg = Math.floor((Math.max(0, restanteMs) % 60_000) / 1000)

  
  const lastSeenMs = data?.pollLastSeen ? new Date(data.pollLastSeen).getTime() : null
  const loopVivo = lastSeenMs !== null && Date.now() - lastSeenMs < 2 * 60_000
  const loopHaSeg = lastSeenMs !== null ? Math.max(0, Math.round((Date.now() - lastSeenMs) / 1000)) : null

  
  
  
  
  
  
  const saudeLoop = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={LABEL_STYLE}>Saúde do loop</label>
      {loopVivo ? (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--approve)' }}>
          ● Loop vivo (há {loopHaSeg}s)
        </p>
      ) : data?.pollDesligadoPorConfig ? (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-tertiary)' }}>
          ☾ O canal do Telegram está <strong>desligado nesta instalação</strong>, então o bot não
          responde nada, nem o <code style={{ fontFamily: 'monospace', fontSize: 12 }}>/start</code>.
          {' '}Isso foi escolhido de propósito quando o aplicativo subiu. Para religar, peça a quem
          instalou para ligar o canal do Telegram e reiniciar o aplicativo.
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--reject)' }}>
          ✗ Não estou conseguindo ler o Telegram{loopHaSeg !== null ? ` (a última leitura foi há ${loopHaSeg}s)` : ' — nenhuma leitura aconteceu ainda'}.
          {' '}Enquanto isso o bot não responde nada, nem o <code style={{ fontFamily: 'monospace', fontSize: 12 }}>/start</code>.
          {' '}Reinicie o aplicativo pelo painel onde você o instalou: a leitura sobe junto com ele.
        </p>
      )}
      {}
      {data?.pollLastError && (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {explicarConflito(data.pollLastError) ? (
            <>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--reject)' }}>
                ✗ {explicarConflito(data.pollLastError)}
              </p>
              <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                {data.pollLastError}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--reject)' }}>
              ✗ {data.pollLastError}
            </p>
          )}
        </div>
      )}
    </div>
  )

  
  const tokenField = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={LABEL_STYLE}>Token do bot</label>
        <Badge ok={temToken} />
      </div>
      <input
        type="password"
        value={tokenInput}
        onChange={(e) => setTokenInput(e.target.value)}
        placeholder={temToken ? '•••••••••••••••• (deixe em branco para manter)' : '123456789:AAxxxxxx...'}
        autoComplete="off"
        style={INPUT_STYLE}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => void testar()}
          disabled={testing || saving}
          style={{
            ...BUTTON_STYLE,
            color: 'var(--text-secondary)',
            cursor: testing || saving ? 'not-allowed' : 'pointer',
            opacity: testing ? 0.6 : 1,
          }}
        >
          {testing ? 'Testando…' : 'Testar'}
        </button>
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={saving || testing}
          style={{
            ...BUTTON_STYLE,
            cursor: saving || testing ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )

  const msgLine = msg && (
    <p
      role="status"
      style={{
        margin: 0,
        fontSize: 12.5,
        lineHeight: 1.45,
        color: msg.ok ? 'var(--approve)' : 'var(--reject)',
      }}
    >
      {msg.ok ? '✓ ' : '✗ '}
      {msg.text}
    </p>
  )

  
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Canal do dono — Telegram
        </h2>
        {pareado ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 500,
              background: 'rgb(63 185 132 / 0.12)',
              color: 'var(--approve)',
              border: '1px solid rgb(63 185 132 / 0.2)',
            }}
          >
            ✓ pareado
          </span>
        ) : (
          <Badge ok={false} />
        )}
      </div>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        Receba briefings, lembretes e aprovações da empresa direto no seu Telegram —
        e responda de lá, sem abrir o painel.
      </p>

      {}
      {!temToken && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Crie um bot no <strong style={{ color: 'var(--text-primary)' }}>@BotFather</strong> (mande{' '}
            <code style={{ fontFamily: 'monospace', fontSize: 12 }}>/newbot</code> no Telegram) e cole
            o token aqui.
          </p>
          {tokenField}
          {msgLine}
        </div>
      )}

      {}
      {temToken && !pareado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!data?.pairing && (
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              Token salvo. Agora gere um código e mande-o para o seu bot no Telegram para parear a
              sua conta.
            </p>
          )}

          <button
            type="button"
            onClick={() => void salvar({ gerar_codigo: true })}
            disabled={saving}
            style={{
              alignSelf: 'flex-start',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: saving
                ? 'var(--surface)'
                : 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
              color: saving ? 'var(--text-tertiary)' : '#fff',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              cursor: saving ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {saving ? 'Gerando…' : data?.pairing ? 'Gerar novo código' : 'Gerar código'}
          </button>

          {data?.pairing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textAlign: 'center',
                  padding: '14px 0',
                  color: expirado ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {data.pairing.code}
              </div>
              {expirado ? (
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>
                  ✗ Código expirado — gere outro.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                  Expira em {restanteMin}:{String(restanteSeg).padStart(2, '0')}
                </p>
              )}
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                No Telegram, abra seu bot e mande:{' '}
                <code style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)' }}>
                  /start {data.pairing.code}
                </code>
              </p>
            </div>
          )}

          {}
          {saudeLoop}

          {}
          {tokenField}
          {msgLine}
        </div>
      )}

      {}
      {pareado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {saudeLoop}

          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={LABEL_STYLE}>Janela de silêncio</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="time"
                value={quietInicio}
                onChange={(e) => setQuietInicio(e.target.value)}
                aria-label="Início do silêncio"
                style={{ ...INPUT_STYLE, width: 'auto' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>até</span>
              <input
                type="time"
                value={quietFim}
                onChange={(e) => setQuietFim(e.target.value)}
                aria-label="Fim do silêncio"
                style={{ ...INPUT_STYLE, width: 'auto' }}
              />
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              Nesse horário as notificações seguram pro briefing (lembretes furam o silêncio) —
              ou peça pro {assistantName}.
            </p>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={saving}
              style={{
                ...BUTTON_STYLE,
                alignSelf: 'flex-start',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>

          {}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={LABEL_STYLE}>URL pública do app</label>
            <input
              type="text"
              value={appUrlInput}
              onChange={(e) => setAppUrlInput(e.target.value)}
              onFocus={() => { appUrlFocusedRef.current = true }}
              onBlur={() => { appUrlFocusedRef.current = false }}
              placeholder="https://sua-empresa.exemplo.com"
              autoComplete="off"
              style={INPUT_STYLE}
            />
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              Usada nos botões “Ver” das notificações.
            </p>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={saving}
              style={{
                ...BUTTON_STYLE,
                alignSelf: 'flex-start',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>

          {msgLine}

          {}
          <button
            type="button"
            onClick={desparear}
            disabled={saving}
            style={{
              alignSelf: 'flex-start',
              padding: '5px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'transparent',
              color: 'var(--reject)',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Desparear
          </button>
        </div>
      )}
    </section>
  )
}
