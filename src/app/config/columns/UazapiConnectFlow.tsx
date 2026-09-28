'use client'



import { useState, useEffect, useCallback } from 'react'
import { CanalArquivos } from './CanalArquivos'
import { CanalDisclosure } from './CanalDisclosure'
import { CanalFollowup } from './CanalFollowup'
import { CanalRoteamento } from './CanalRoteamento'



interface AgenteSummary {
  id: string
  name: string
}


export interface UazapiCanal {
  id: string
  rotulo: string
  agent_id: string
  provider: string
  conexao_estado: string
  conexao_qr: string | null
  config: Record<string, unknown>
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

const SELECT_STYLE: React.CSSProperties = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 13,
  cursor: 'pointer',
}

const PRIMARY_BUTTON_STYLE = (disabled: boolean): React.CSSProperties => ({
  padding: '10px 18px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  background: disabled ? 'var(--surface)' : 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
  color: disabled ? 'var(--text-tertiary)' : '#fff',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-ui)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
})

const GHOST_BUTTON_STYLE: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-secondary)',
  fontSize: 13,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}



type UazapiResp = {
  ok?: boolean
  erro?: string
  error?: string
  canalId?: string
  qrBase64?: string
  estado?: string
}

async function postUazapi(body: Record<string, unknown>): Promise<UazapiResp> {
  try {
    const res = await fetch('/api/config/canais/uazapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await res.json().catch(() => ({}))) as UazapiResp
    if (!res.ok && json.ok === undefined) json.ok = false
    return json
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) }
  }
}


function erroDe(resp: UazapiResp, fallback: string): string {
  return resp.erro ?? resp.error ?? fallback
}




function QrPairing({
  canalId,
  qrBase64,
  onPareado,
}: {
  canalId: string
  qrBase64: string
  onPareado: () => void
}) {
  const [qr, setQr] = useState(qrBase64)
  const [pareado, setPareado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  
  useEffect(() => {
    setQr(qrBase64)
    setPareado(false)
  }, [qrBase64, canalId])

  useEffect(() => {
    if (pareado) return
    const t = setInterval(() => {
      void (async () => {
        const resp = await postUazapi({ acao: 'status', canal_id: canalId })
        if (resp.ok === false) {
          setAviso(erroDe(resp, 'Erro ao consultar status.'))
          return
        }
        setAviso(null)
        if (resp.estado === 'pareado') {
          setPareado(true) 
          onPareado()
        } else if (resp.estado === 'aguardando_qr' && resp.qrBase64) {
          setQr(resp.qrBase64) 
        }
      })()
    }, 3000)
    return () => clearInterval(t)
  }, [canalId, pareado, onPareado])

  if (pareado) {
    return (
      <p role="status" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--approve)' }}>
        ✓ Conectado
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- QR é data-URI base64, não um asset */}
      <img
        src={qr}
        alt="QR code para parear o WhatsApp"
        style={{ width: 320, height: 320, background: '#fff', padding: 12, borderRadius: 'var(--radius-md)' }}
      />
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)', maxWidth: 340 }}>
        Escaneie: WhatsApp &gt; Aparelhos conectados &gt; Conectar aparelho — o QR expira em ~2 min.
      </p>
      {aviso && <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>✗ {aviso}</p>}
    </div>
  )
}



export function UazapiConnectFlow({
  agentes,
  onChange,
}: {
  agentes: AgenteSummary[]
  onChange: () => void
}) {
  const [serverUrl, setServerUrl] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [agentId, setAgentId] = useState('')
  const [modo, setModo] = useState<'supervisionado' | 'autonomo'>('supervisionado')
  
  const [modoTeste, setModoTeste] = useState(false)
  const [numerosTexto, setNumerosTexto] = useState('')

  const [conectando, setConectando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  
  const [pairing, setPairing] = useState<{ canalId: string; qrBase64: string } | null>(null)

  const handleConectar = async () => {
    setErro(null)
    if (!serverUrl.trim() || !adminToken.trim() || !agentId) {
      setErro('Preencha a URL do servidor, o token de admin e o agente.')
      return
    }
    setConectando(true)
    try {
      const resp = await postUazapi({
        acao: 'conectar',
        server_url: serverUrl.trim(),
        admin_token: adminToken.trim(),
        agent_id: agentId,
        modo,
        modo_teste: modoTeste,
        numeros_teste: modoTeste
          ? numerosTexto.split('\n').map((n) => n.trim()).filter((n) => n.length > 0)
          : [],
      })
      if (resp.ok && resp.canalId && resp.qrBase64) {
        setPairing({ canalId: resp.canalId, qrBase64: resp.qrBase64 })
      } else {
        setErro(erroDe(resp, 'Erro ao conectar. Confira a URL e o token de admin.'))
      }
    } finally {
      setConectando(false)
    }
  }

  const handlePareado = useCallback(() => {
    onChange() 
  }, [onChange])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        Conecte um número lendo um QR code — sem app na Meta. Você precisa de um servidor
        UAZAPI (BYO) e o token de admin dele. Crie o seu em{' '}
        <a
          href="https://uazapi.dev"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--wave-to)', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 500 }}
        >
          uazapi.dev
        </a>{' '}
        — é um serviço pago; o servidor de teste grátis expira em ~1h.
      </p>

      {}
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
        Usa API não-oficial do WhatsApp. A Meta pode banir números que automatizam por esse
        caminho — recomendamos um número dedicado. Para blindagem total, use a Cloud API oficial.
      </p>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={LABEL_STYLE}>URL do servidor UAZAPI</label>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="https://free.uazapi.com"
          autoComplete="off"
          style={INPUT_STYLE}
        />
      </div>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={LABEL_STYLE}>Token de admin</label>
        <input
          type="password"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          placeholder="token de administrador do servidor"
          autoComplete="off"
          style={INPUT_STYLE}
        />
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'var(--text-tertiary)' }}>
          É o token de <strong style={{ fontWeight: 600 }}>admin do servidor</strong> (o do topo do painel
          UAZAPI) — não o token de uma instância. A gente cria a instância pra você.
        </p>
      </div>

      {}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 160 }}>
          <label style={LABEL_STYLE}>Agente</label>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={{ ...SELECT_STYLE, width: '100%' }}>
            <option value="">Selecionar agente…</option>
            {agentes.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
          <label style={LABEL_STYLE}>Modo</label>
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value as 'supervisionado' | 'autonomo')}
            style={SELECT_STYLE}
          >
            <option value="supervisionado">Supervisionado</option>
            <option value="autonomo">Autônomo</option>
          </select>
        </div>
      </div>

      {}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          paddingTop: 12,
          borderTop: '1px solid var(--border-hairline)',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={modoTeste}
            onChange={(e) => setModoTeste(e.target.checked)}
            style={{ accentColor: 'var(--wave-to)', width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            Começar em modo teste
          </span>
        </label>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Recomendado no 1º teste: o canal já pareia respondendo <strong style={{ fontWeight: 600 }}>só os
          números da lista</strong> (um por linha). Os outros clientes caem no inbox, mas ficam sem
          resposta até você desligar — dá pra mexer nisso depois no canal.
        </p>
        {modoTeste && (
          <>
            <textarea
              value={numerosTexto}
              onChange={(e) => setNumerosTexto(e.target.value)}
              placeholder={'5527996425557\n5511888888888'}
              rows={3}
              style={{ ...INPUT_STYLE, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', minHeight: 64 }}
            />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 11.5,
                fontWeight: 600,
                background: 'rgb(224 168 46 / 0.14)',
                color: '#E0A82E',
                border: '1px solid rgb(224 168 46 / 0.3)',
              }}
            >
              ⚠ Nasce em modo teste — só responde os números da lista
            </span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleConectar()}
        disabled={conectando}
        style={{ ...PRIMARY_BUTTON_STYLE(conectando), alignSelf: 'flex-start' }}
      >
        {conectando ? 'Conectando…' : 'Conectar'}
      </button>

      {erro && <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>✗ {erro}</p>}

      {pairing && (
        <QrPairing canalId={pairing.canalId} qrBase64={pairing.qrBase64} onPareado={handlePareado} />
      )}
    </div>
  )
}



const ESTADO_CHIP: Record<string, { label: string; bg: string; fg: string; border: string } | null> = {
  pareado: {
    label: '● conectado',
    bg: 'rgb(63 185 132 / 0.12)',
    fg: 'var(--approve)',
    border: 'rgb(63 185 132 / 0.2)',
  },
  aguardando_qr: {
    label: 'aguardando leitura',
    bg: 'rgb(255 255 255 / 0.05)',
    fg: 'var(--text-tertiary)',
    border: 'rgb(255 255 255 / 0.07)',
  },
  desconectado: {
    label: '○ desconectado',
    bg: 'rgb(229 99 77 / 0.1)',
    fg: 'var(--reject)',
    border: 'rgb(229 99 77 / 0.22)',
  },
  nao_aplica: null, 
}

export function UazapiCanalRow({
  canal,
  onChange,
  empresa = '',
  agentes = [],
}: {
  canal: UazapiCanal
  onChange: () => void
  
  empresa?: string
  
  agentes?: AgenteSummary[]
}) {
  const chip = ESTADO_CHIP[canal.conexao_estado] ?? null

  
  const [reconectando, setReconectando] = useState(false)
  const [reconectarErro, setReconectarErro] = useState<string | null>(null)
  const [pairing, setPairing] = useState<{ qrBase64: string } | null>(null)

  const handleReconectar = async () => {
    setReconectarErro(null)
    setReconectando(true)
    try {
      const resp = await postUazapi({ acao: 'reconectar', canal_id: canal.id })
      if (resp.ok && resp.qrBase64) {
        setPairing({ qrBase64: resp.qrBase64 })
      } else {
        setReconectarErro(erroDe(resp, 'Erro ao reconectar.'))
      }
    } finally {
      setReconectando(false)
    }
  }

  const handleReconectado = useCallback(() => {
    setPairing(null)
    onChange()
  }, [onChange])

  
  const configModoTeste = canal.config?.modo_teste === true
  const configNumeros = Array.isArray(canal.config?.numeros_teste)
    ? (canal.config.numeros_teste as unknown[]).map((n) => String(n))
    : []
  const [modoTeste, setModoTeste] = useState(configModoTeste)
  const [numerosTexto, setNumerosTexto] = useState(configNumeros.join('\n'))
  const [salvandoTeste, setSalvandoTeste] = useState(false)
  const [testeMsg, setTesteMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleSalvarTeste = async () => {
    setTesteMsg(null)
    setSalvandoTeste(true)
    try {
      const numeros_teste = numerosTexto
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
      const resp = await postUazapi({
        acao: 'modo_teste',
        canal_id: canal.id,
        modo_teste: modoTeste,
        numeros_teste,
      })
      if (resp.ok) {
        setTesteMsg({ ok: true, text: 'Modo teste salvo.' })
        onChange()
      } else {
        setTesteMsg({ ok: false, text: erroDe(resp, 'Erro ao salvar o modo teste.') })
      }
    } finally {
      setSalvandoTeste(false)
    }
  }

  
  const [desconectando, setDesconectando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [acaoErro, setAcaoErro] = useState<string | null>(null)

  const handleDesconectar = async () => {
    setAcaoErro(null)
    setDesconectando(true)
    try {
      const resp = await postUazapi({ acao: 'desconectar', canal_id: canal.id })
      if (resp.ok) onChange()
      else setAcaoErro(erroDe(resp, 'Erro ao desconectar.'))
    } finally {
      setDesconectando(false)
    }
  }

  const handleRemover = async () => {
    if (!window.confirm(`Remover o canal "${canal.rotulo}"? Isso apaga o número, as conversas e o histórico. Não dá pra desfazer.`)) return
    setAcaoErro(null)
    setRemovendo(true)
    try {
      const resp = await postUazapi({ acao: 'remover', canal_id: canal.id })
      if (resp.ok) onChange()
      else setAcaoErro(erroDe(resp, 'Erro ao remover o canal.'))
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {chip && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 500,
              background: chip.bg,
              color: chip.fg,
              border: `1px solid ${chip.border}`,
              flexShrink: 0,
            }}
          >
            {chip.label}
          </span>
        )}
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1, minWidth: 80 }}>
          {canal.rotulo}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            flexShrink: 0,
          }}
        >
          QR
        </span>
      </div>

      {}
      {canal.conexao_estado === 'desconectado' && !pairing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
          <button
            type="button"
            onClick={() => void handleReconectar()}
            disabled={reconectando}
            style={{ ...GHOST_BUTTON_STYLE, opacity: reconectando ? 0.6 : 1, cursor: reconectando ? 'not-allowed' : 'pointer' }}
          >
            {reconectando ? 'Gerando QR…' : 'Reconectar'}
          </button>
          {reconectarErro && (
            <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>
              ✗ {reconectarErro}
            </p>
          )}
        </div>
      )}

      {}
      {pairing && (
        <QrPairing canalId={canal.id} qrBase64={pairing.qrBase64} onPareado={handleReconectado} />
      )}

      {}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          paddingTop: 10,
          borderTop: '1px solid var(--border-hairline)',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={modoTeste}
            onChange={(e) => setModoTeste(e.target.checked)}
            style={{ accentColor: 'var(--wave-to)', width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Modo teste</span>
        </label>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Quando ativo, o agente só responde os números da lista abaixo (um por linha).
        </p>
        <textarea
          value={numerosTexto}
          onChange={(e) => setNumerosTexto(e.target.value)}
          placeholder={'5511999999999\n5511888888888'}
          rows={3}
          style={{ ...INPUT_STYLE, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', minHeight: 64 }}
        />
        {modoTeste && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              padding: '4px 10px',
              borderRadius: 99,
              fontSize: 11.5,
              fontWeight: 600,
              background: 'rgb(224 168 46 / 0.14)',
              color: '#E0A82E',
              border: '1px solid rgb(224 168 46 / 0.3)',
            }}
          >
            ⚠ Modo teste ativo — só responde os números da lista
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void handleSalvarTeste()}
            disabled={salvandoTeste}
            style={{ ...GHOST_BUTTON_STYLE, opacity: salvandoTeste ? 0.6 : 1, cursor: salvandoTeste ? 'not-allowed' : 'pointer' }}
          >
            {salvandoTeste ? 'Salvando…' : 'Salvar'}
          </button>
          {testeMsg && (
            <p
              role="status"
              style={{ margin: 0, fontSize: 12.5, color: testeMsg.ok ? 'var(--approve)' : 'var(--reject)' }}
            >
              {testeMsg.ok ? '✓ ' : '✗ '}
              {testeMsg.text}
            </p>
          )}
        </div>
      </div>

      {}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          paddingTop: 10,
          borderTop: '1px solid var(--border-hairline)',
        }}
      >
        {canal.conexao_estado === 'pareado' && (
          <button
            type="button"
            onClick={() => void handleDesconectar()}
            disabled={desconectando}
            style={{ ...GHOST_BUTTON_STYLE, opacity: desconectando ? 0.6 : 1, cursor: desconectando ? 'not-allowed' : 'pointer' }}
          >
            {desconectando ? 'Desconectando…' : 'Desconectar'}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleRemover()}
          disabled={removendo}
          style={{ ...GHOST_BUTTON_STYLE, color: 'var(--reject)', opacity: removendo ? 0.6 : 1, cursor: removendo ? 'not-allowed' : 'pointer' }}
        >
          {removendo ? 'Removendo…' : 'Remover canal'}
        </button>
        {acaoErro && (
          <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>
            ✗ {acaoErro}
          </p>
        )}
      </div>

      {}
      <CanalDisclosure
        canalId={canal.id}
        atual={typeof canal.config?.disclosure === 'string' ? canal.config.disclosure : ''}
        empresa={empresa}
      />
      <CanalFollowup canalId={canal.id} config={canal.config} />
      <CanalRoteamento
        canalId={canal.id}
        agentePadrao={canal.agent_id}
        config={canal.config}
        agentes={agentes}
      />
      <CanalArquivos canalId={canal.id} />
    </div>
  )
}
