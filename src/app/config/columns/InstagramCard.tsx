'use client'



import { useState, useEffect, useCallback } from 'react'
import { MonoBox } from '../ui'
import { TEXTOS_CONEXAO_IG } from '@/lib/instagram/copyConexao'



interface ConexaoIgData {
  conectado?: boolean
  igUserId?: string | null
  
  canalId?: string | null
  canalHabilitado?: boolean
  recebe: boolean | null
  
  temAppSecret?: boolean
  verifyToken?: string | null
  webhookUrl: string
  titulo: string
  passo: string
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



export function InstagramCard() {
  const [data, setData] = useState<ConexaoIgData | null>(null)

  const [igUserIdInput, setIgUserIdInput] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  
  
  const [appSecretInput, setAppSecretInput] = useState('')

  const [connecting, setConnecting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [alternando, setAlternando] = useState(false)
  
  
  const [msg, setMsg] = useState<{ ok: boolean; text: string; aviso?: boolean } | null>(null)

  
  
  
  
  
  
  
  
  
  
  const load = useCallback(async (reinscrever = false) => {
    try {
      const url = reinscrever ? '/api/instagram/conexao?reinscrever=1' : '/api/instagram/conexao'
      const res = await fetch(url)
      if (res.ok) {
        setData((await res.json()) as ConexaoIgData)
        return
      }
      setMsg({
        ok: false,
        text: res.status === 403 ? TEXTOS_CONEXAO_IG.somenteDono : TEXTOS_CONEXAO_IG.falhaLeitura,
      })
    } catch {
      setMsg({ ok: false, text: TEXTOS_CONEXAO_IG.falhaLeitura })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  
  const handleConectar = async () => {
    setMsg(null)
    if (!tokenInput.trim() || !igUserIdInput.trim()) {
      setMsg({ ok: false, text: TEXTOS_CONEXAO_IG.camposObrigatorios })
      return
    }
    setConnecting(true)
    try {
      const res = await fetch('/api/instagram/conexao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenInput.trim(),
          igUserId: igUserIdInput.trim(),
          appSecret: appSecretInput.trim(),
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; aviso?: string }
      if (res.ok) {
        setTokenInput('')
        setAppSecretInput('')
        
        
        
        
        setMsg(json.aviso
          ? { ok: true, text: json.aviso, aviso: true }
          : { ok: true, text: TEXTOS_CONEXAO_IG.conectadoAgora })
        await load()
      } else {
        setMsg({ ok: false, text: json.error ?? TEXTOS_CONEXAO_IG.erroAoConectar })
      }
    } catch {
      
      
      setMsg({ ok: false, text: TEXTOS_CONEXAO_IG.falhaConexao })
    } finally {
      setConnecting(false)
    }
  }

  
  
  
  
  
  
  
  const alternarCanal = async () => {
    if (!data?.canalId) return
    setAlternando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/config/canais/numeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal_id: data.canalId, enabled: !data.canalHabilitado }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || json.ok !== true) {
        
        
        
        
        if (json.error) console.warn('[instagram/cartao] o interruptor do canal falhou:', json.error)
        setMsg({ ok: false, text: TEXTOS_CONEXAO_IG.falhaAoAlternarCanal })
        return
      }
      await load()
    } catch {
      setMsg({ ok: false, text: TEXTOS_CONEXAO_IG.falhaAoAlternarCanal })
    } finally {
      setAlternando(false)
    }
  }

  
  const handleConferir = async () => {
    setChecking(true)
    setMsg(null)
    try {
      await load(true)
    } finally {
      setChecking(false)
    }
  }

  
  
  
  const recebendo = data?.titulo === TEXTOS_CONEXAO_IG.conectado

  
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
          Canais — Instagram
        </h2>
      </div>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        {TEXTOS_CONEXAO_IG.oQueEstaTelaFaz}
      </p>

      {}
      {data?.canalId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
              borderRadius: 99, fontSize: 11, fontWeight: 500,
              background: data.canalHabilitado ? 'rgb(63 185 132 / 0.12)' : 'rgb(255 255 255 / 0.05)',
              color: data.canalHabilitado ? 'var(--approve)' : 'var(--text-tertiary)',
              border: `1px solid ${data.canalHabilitado ? 'rgb(63 185 132 / 0.2)' : 'rgb(255 255 255 / 0.07)'}`,
            }}
          >
            {data.canalHabilitado ? TEXTOS_CONEXAO_IG.canalAtivo : TEXTOS_CONEXAO_IG.canalInativo}
          </span>
          <button
            type="button"
            onClick={() => void alternarCanal()}
            disabled={alternando}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)', background: 'transparent',
              color: data.canalHabilitado ? 'var(--reject)' : 'var(--approve)',
              fontSize: 12, fontFamily: 'var(--font-ui)',
              cursor: alternando ? 'not-allowed' : 'pointer', opacity: alternando ? 0.6 : 1,
            }}
          >
            {data.canalHabilitado ? TEXTOS_CONEXAO_IG.desligarCanal : TEXTOS_CONEXAO_IG.ligarCanal}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexBasis: '100%' }}>
            {TEXTOS_CONEXAO_IG.canalNaLista}
          </span>
        </div>
      )}

      {}
      {data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              background: recebendo ? 'var(--approve)' : 'var(--text-tertiary)',
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {data.titulo}
          </span>
        </div>
      )}

      {}
      {data && data.passo && (
        <p
          role="status"
          style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}
        >
          {data.passo}
        </p>
      )}

      {}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={LABEL_STYLE}>URL do webhook (Meta)</label>
            <MonoBox value={data.webhookUrl} />
          </div>
          {data.verifyToken && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={LABEL_STYLE}>Verify token</label>
              <MonoBox value={data.verifyToken} />
            </div>
          )}
        </div>
      )}

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={LABEL_STYLE}>Id da conta do Instagram</label>
          <input
            type="text"
            value={igUserIdInput}
            onChange={(e) => setIgUserIdInput(e.target.value)}
            placeholder={data?.igUserId ? data.igUserId : '178414...'}
            autoComplete="off"
            style={INPUT_STYLE}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={LABEL_STYLE}>Token da página</label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="EAAxxxxxx..."
            autoComplete="off"
            style={INPUT_STYLE}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={LABEL_STYLE}>Chave secreta do aplicativo (opcional)</label>
          <input
            type="password"
            value={appSecretInput}
            onChange={(e) => setAppSecretInput(e.target.value)}
            placeholder={data?.temAppSecret ? 'Já existe uma salva' : 'Cole a chave secreta do aplicativo'}
            autoComplete="off"
            style={INPUT_STYLE}
          />
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            Só preencha se o aplicativo da Meta do seu Instagram for diferente do que você usa
            no WhatsApp. Em branco, a chave que já estiver salva continua valendo.
          </p>
        </div>

        {data?.conectado && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            {TEXTOS_CONEXAO_IG.credencialJaSalva}
            {' '}
            {TEXTOS_CONEXAO_IG.avisoAntesDeTrocar}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          onClick={() => void handleConectar()}
          disabled={connecting}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: connecting ? 'not-allowed' : 'pointer',
            opacity: connecting ? 0.6 : 1,
          }}
        >
          {connecting ? 'Conectando…' : 'Conectar'}
        </button>

        {}
        <button
          type="button"
          onClick={() => void handleConferir()}
          disabled={checking}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontFamily: 'var(--font-ui)',
            cursor: checking ? 'not-allowed' : 'pointer',
            opacity: checking ? 0.6 : 1,
          }}
        >
          {checking ? 'Conferindo…' : 'Conferir'}
        </button>
      </div>

      {msg && (
        <p
          role="status"
          style={{
            margin: 0,
            fontSize: 12.5,
            lineHeight: 1.45,
            color: msg.aviso ? 'var(--text-secondary)' : msg.ok ? 'var(--approve)' : 'var(--reject)',
          }}
        >
          {msg.aviso ? '' : msg.ok ? '✓ ' : '✗ '}
          {msg.text}
        </p>
      )}
    </section>
  )
}
