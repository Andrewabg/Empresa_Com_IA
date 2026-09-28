'use client'


import { useEffect, useState } from 'react'
import Link from 'next/link'

export interface GoogleAdsConexaoProps {
  conectado: boolean
  
  customerId: string | null
  
  customerIdLabel: string | null
  fonte: 'local' | 'hub' | null
  premium: boolean
}

interface Conta {
  id: string
  resourceName: string
}


function fmtId(id: string): string {
  return /^\d{10}$/.test(id) ? `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}` : id
}


const CARD: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  width: '100%',
  padding: 'clamp(18px, 2vw, 26px)',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-lg)',
  marginBottom: 'clamp(20px, 2.5vw, 28px)',
}
const CTA: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid transparent',
  background: 'linear-gradient(110deg, var(--wave-from), var(--wave-to))',
  color: 'var(--bg-base)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
const BTN_SEC: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-secondary)',
  fontSize: 12.5,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}


function AdsGlyph() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        color: 'var(--text-secondary)',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="5" y1="19" x2="5" y2="13" />
        <line x1="12" y1="19" x2="12" y2="8" />
        <line x1="19" y1="19" x2="19" y2="4" />
      </svg>
    </span>
  )
}

export function GoogleAdsConexao({
  conectado,
  customerId,
  customerIdLabel,
  fonte,
  premium,
}: GoogleAdsConexaoProps) {
  const [modo, setModo] = useState<'idle' | 'selecionando' | 'erro'>('idle')
  const [contas, setContas] = useState<Conta[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [msgErro, setMsgErro] = useState<string | null>(null)

  
  
  useEffect(() => {
    if (conectado) return
    const g = new URLSearchParams(window.location.search).get('google')
    if (g === 'connected') {
      setModo('selecionando')
      void carregarContas()
    } else if (g === 'error') {
      setModo('erro')
      setMsgErro('A autorização no Google não foi concluída. Tente de novo.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciar() {
    if (busy) return
    setBusy(true)
    setMsgErro(null)
    try {
      const r = await fetch('/api/google-ads/connect/start', { method: 'POST' })
      const j = (await r.json().catch(() => null)) as { url?: string; error?: { message?: string } } | null
      if (r.ok && j?.url) {
        window.location.href = j.url
        return
      }
      setMsgErro(j?.error?.message ?? 'Não consegui iniciar a conexão com o Google.')
    } catch {
      setMsgErro('Não consegui iniciar a conexão com o Google.')
    } finally {
      setBusy(false)
    }
  }

  async function carregarContas() {
    setBusy(true)
    setMsgErro(null)
    try {
      const r = await fetch('/api/google-ads/connect/accounts', { method: 'POST' })
      const j = (await r.json().catch(() => null)) as { accounts?: Conta[]; error?: { message?: string } } | null
      if (r.ok && Array.isArray(j?.accounts)) {
        setContas(j.accounts)
        
        if (j.accounts.length === 1) {
          await escolher(j.accounts[0].id)
        }
      } else {
        setModo('erro')
        setMsgErro(j?.error?.message ?? 'Não consegui listar suas contas do Google Ads.')
      }
    } catch {
      setModo('erro')
      setMsgErro('Não consegui listar suas contas do Google Ads.')
    } finally {
      setBusy(false)
    }
  }

  async function escolher(id: string) {
    if (busy) return
    setBusy(true)
    setMsgErro(null)
    try {
      const r = await fetch('/api/google-ads/connect/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: id }),
      })
      const j = (await r.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null
      if (r.ok && j?.ok) {
        
        window.location.href = '/integracoes'
        return
      }
      setMsgErro(j?.error?.message ?? 'Não consegui salvar a conta escolhida.')
    } catch {
      setMsgErro('Não consegui salvar a conta escolhida.')
    } finally {
      setBusy(false)
    }
  }

  async function desconectar() {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/google-ads/connect/disconnect', { method: 'POST' })
    } catch {
      
    }
    window.location.href = '/integracoes'
  }

  const statusConectado = conectado

  return (
    <section
      style={{
        ...CARD,
        border: `1px solid ${statusConectado ? 'rgb(124 92 255 / 0.24)' : 'var(--border-hairline)'}`,
      }}
    >
      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <AdsGlyph />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
              Google Ads
            </span>
            {statusConectado && (
              <span
                aria-hidden
                title="Conectado"
                style={{
                  width: 7,
                  height: 7,
                  flexShrink: 0,
                  borderRadius: 99,
                  background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                  boxShadow: '0 0 6px rgb(40 224 200 / 0.6)',
                }}
              />
            )}
          </div>
          <span style={{ fontSize: 11.5, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Gael · gestor de tráfego
          </span>
        </div>
      </div>

      {}
      {!premium ? (
        <BlocoOrientacao
          texto="Recurso premium. Ative sua licença ou Club pra plugar o Google Ads e liberar o Gael."
          acao={
            <Link href="/config#licenca" style={{ ...BTN_SEC, textDecoration: 'none', display: 'inline-block' }}>
              Ver licença
            </Link>
          }
        />
      ) : statusConectado ? (
        <Conectado
          label={customerIdLabel ?? (customerId ? fmtId(customerId) : null)}
          fonte={fonte}
          busy={busy}
          confirmando={confirmando}
          onPedirConfirm={() => setConfirmando(true)}
          onCancelar={() => setConfirmando(false)}
          onDesconectar={desconectar}
        />
      ) : modo === 'selecionando' ? (
        <Seletor contas={contas} busy={busy} msgErro={msgErro} onEscolher={escolher} />
      ) : modo === 'erro' ? (
        <BlocoOrientacao
          texto={msgErro ?? 'Algo não saiu como esperado na conexão.'}
          tom="erro"
          acao={
            <button type="button" style={CTA} onClick={iniciar} disabled={busy}>
              {busy ? 'Abrindo…' : 'Tentar de novo'}
            </button>
          }
        />
      ) : (
        <BlocoOrientacao
          texto="Conecte a conta do seu Google Ads pra o Gael analisar de verdade e agir com a sua aprovação. Você autoriza uma vez na tela do Google; nada de token no seu servidor."
          acao={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {msgErro && <span style={{ fontSize: 11.5, color: 'var(--reject)' }}>{msgErro}</span>}
              <button type="button" style={CTA} onClick={iniciar} disabled={busy}>
                {busy ? 'Abrindo…' : 'Conectar Google Ads'}
              </button>
            </span>
          }
        />
      )}
    </section>
  )
}



function BlocoOrientacao({
  texto,
  acao,
  tom = 'calmo',
}: {
  texto: string
  acao: React.ReactNode
  tom?: 'calmo' | 'erro'
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.5,
          color: tom === 'erro' ? 'var(--reject)' : 'var(--text-secondary)',
          maxWidth: 560,
        }}
      >
        {texto}
      </p>
      {acao}
    </div>
  )
}

function Conectado({
  label,
  fonte,
  busy,
  confirmando,
  onPedirConfirm,
  onCancelar,
  onDesconectar,
}: {
  label: string | null
  fonte: 'local' | 'hub' | null
  busy: boolean
  confirmando: boolean
  onPedirConfirm: () => void
  onCancelar: () => void
  onDesconectar: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--approve)' }}>✓ Conectado</span>
        {label ? <> · conta <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{label}</span></> : null}
        {fonte === 'local' && (
          <span style={{ color: 'var(--text-tertiary)' }}> · credenciais locais (gerenciadas nas configurações)</span>
        )}
      </p>

      {}
      {fonte === 'hub' &&
        (confirmando ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', maxWidth: 260, textAlign: 'right' }}>
              Desconectar remove o acesso do Gael à sua conta.
            </span>
            <button
              type="button"
              onClick={onDesconectar}
              disabled={busy}
              style={{ ...BTN_SEC, color: 'var(--reject)', cursor: busy ? 'wait' : 'pointer' }}
            >
              {busy ? 'Desconectando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              disabled={busy}
              style={{ padding: '7px 8px', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 12.5, fontFamily: 'var(--font-ui)', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </span>
        ) : (
          <button type="button" onClick={onPedirConfirm} style={BTN_SEC}>
            Desconectar
          </button>
        ))}
    </div>
  )
}

function Seletor({
  contas,
  busy,
  msgErro,
  onEscolher,
}: {
  contas: Conta[] | null
  busy: boolean
  msgErro: string | null
  onEscolher: (id: string) => void
}) {
  if (contas === null) {
    return (
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        Carregando suas contas do Google Ads…
      </p>
    )
  }
  if (contas.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--reject)' }}>
        {msgErro ?? 'Nenhuma conta de Google Ads acessível por essa autorização.'}
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        Escolha a conta que o Gael vai cuidar:
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {contas.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onEscolher(c.id)}
            disabled={busy}
            style={{
              ...BTN_SEC,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {fmtId(c.id)}
          </button>
        ))}
      </div>
      {msgErro && <span style={{ fontSize: 11.5, color: 'var(--reject)' }}>{msgErro}</span>}
    </div>
  )
}
