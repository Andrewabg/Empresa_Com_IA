'use client'



import { useState, useEffect, useCallback } from 'react'
import { Badge, MonoBox } from '../ui'
import { takePrefetched } from '../prefetch'
import { UazapiConnectFlow, UazapiCanalRow } from './UazapiConnectFlow'
import { CanalArquivos } from './CanalArquivos'
import { CanalDisclosure } from './CanalDisclosure'
import { CanalFollowup } from './CanalFollowup'
import { CanalRoteamento } from './CanalRoteamento'
import { alertaPropositoGeral } from '@/lib/canais/alertaCanal'



interface WaStatus {
  whatsapp_access_token: boolean
  whatsapp_app_secret: boolean
  whatsapp_verify_token: boolean
  whatsapp_waba_id: boolean
}

interface AgenteSummary {
  id: string
  name: string
  is_primary: boolean
}

interface NumeroWaba {
  external_id: string
  rotulo: string
  nome: string
}

interface CanalItem {
  id: string
  external_id: string
  rotulo: string
  agent_id: string
  modo: 'supervisionado' | 'autonomo'
  enabled: boolean
  provider: 'whatsapp_cloud' | 'uazapi' | 'instagram'
  conexao_estado: string
  conexao_qr: string | null
  config: Record<string, unknown>
}

interface CanaisData {
  ok: boolean
  status: WaStatus
  canais: CanalItem[]
  webhookUrl: string
  verifyToken: string | null
  agentes: AgenteSummary[]
  
  empresa: string
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




function canaisDesteCartao(canais: CanalItem[]): CanalItem[] {
  return canais.filter((c) => c.provider !== 'instagram')
}

export function CanaisCard() {
  
  const [data, setData] = useState<CanaisData | null>(null)

  
  const [transporte, setTransporte] = useState<'cloud' | 'qr'>('cloud')

  
  const [tokenInput, setTokenInput] = useState('')
  const [appSecretInput, setAppSecretInput] = useState('')
  const [verifyInput, setVerifyInput] = useState('')
  const [wabaInput, setWabaInput] = useState('')

  
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  
  const [numeros, setNumeros] = useState<NumeroWaba[] | null>(null)
  const [listing, setListing] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  
  const [selAgentes, setSelAgentes] = useState<Record<string, string>>({})
  const [selModos, setSelModos] = useState<Record<string, string>>({})
  const [vinculando, setVinculando] = useState<Record<string, boolean>>({})
  const [vincularErros, setVincularErros] = useState<Record<string, string | null>>({})
  
  
  
  const [inscricaoErros, setInscricaoErros] = useState<Record<string, string | null>>({})

  
  const [canalErro, setCanalErro] = useState<string | null>(null)

  
  const load = useCallback(async () => {
    try {
      const res = await (takePrefetched('/api/config/canais') ?? fetch('/api/config/canais'))
      if (res.ok) setData((await res.json()) as CanaisData)
    } catch {
      
    }
  }, [])

  useEffect(() => { void load() }, [load])

  
  const handleSave = async () => {
    setSaveMsg(null)
    const body: Record<string, unknown> = {}
    if (tokenInput.trim()) body.whatsapp_access_token = tokenInput.trim()
    if (appSecretInput.trim()) body.whatsapp_app_secret = appSecretInput.trim()
    if (verifyInput.trim()) body.whatsapp_verify_token = verifyInput.trim()
    if (wabaInput.trim()) body.whatsapp_waba_id = wabaInput.trim()
    
    if (Object.keys(body).length === 0) {
      setSaveMsg({ ok: false, text: 'Preencha ao menos uma chave antes de salvar.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/config/canais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (res.ok && json.ok) {
        setSaveMsg({ ok: true, text: 'Chaves salvas com sucesso.' })
        setTokenInput(''); setAppSecretInput(''); setVerifyInput(''); setWabaInput('')
        await load()
      } else {
        setSaveMsg({ ok: false, text: json.error ?? 'Erro ao salvar.' })
      }
    } catch (err) {
      setSaveMsg({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  
  const handleGerar = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/config/canais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gerar_verify_token: true }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        gerou_verify?: boolean
        error?: string
      }
      if (res.ok && json.ok) {
        
        setSaveMsg(
          json.gerou_verify
            ? { ok: true, text: 'Verify token gerado.' }
            : { ok: true, text: 'Verify token já existia — nada foi gerado.' },
        )
        await load()
      } else {
        setSaveMsg({ ok: false, text: json.error ?? 'Erro ao gerar o verify token.' })
      }
    } catch (err) {
      setSaveMsg({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  
  const handleListar = async () => {
    setListing(true)
    setListError(null)
    setNumeros(null)
    try {
      const res = await fetch('/api/config/canais/numeros')
      const json = (await res.json()) as {
        ok: boolean
        numeros?: NumeroWaba[]
        reason?: string
        detail?: string
      }
      if (json.ok) {
        setNumeros(json.numeros ?? [])
      } else {
        setListError(
          json.reason === 'not_configured'
            ? 'Configure o token permanente e o WABA ID antes de listar.'
            : (json.detail ?? 'Erro ao listar números.'),
        )
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err))
    } finally {
      setListing(false)
    }
  }

  
  const handleVincular = async (num: NumeroWaba) => {
    const agent_id = selAgentes[num.external_id]
    if (!agent_id) return
    const modo = selModos[num.external_id] ?? 'supervisionado'
    setVinculando((v) => ({ ...v, [num.external_id]: true }))
    setVincularErros((e) => ({ ...e, [num.external_id]: null }))
    setInscricaoErros((e) => ({ ...e, [num.external_id]: null }))
    try {
      const res = await fetch('/api/config/canais/numeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_id: num.external_id, rotulo: num.rotulo, agent_id, modo }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean; error?: string; inscricao?: { ok?: boolean; detalhe?: string }
      }
      if (!res.ok || json.ok === false) {
        setVincularErros((e) => ({
          ...e,
          [num.external_id]: json.error ?? 'Erro ao vincular o número.',
        }))
        return
      }
      
      
      
      setInscricaoErros((e) => ({
        ...e,
        [num.external_id]: json.inscricao?.ok === false ? (json.inscricao.detalhe ?? '') : null,
      }))
      await load()
    } catch (err) {
      setVincularErros((e) => ({
        ...e,
        [num.external_id]: err instanceof Error ? err.message : String(err),
      }))
    } finally {
      setVinculando((v) => ({ ...v, [num.external_id]: false }))
    }
  }

  
  const postToggleCanal = async (body: Record<string, unknown>) => {
    setCanalErro(null)
    try {
      const res = await fetch('/api/config/canais/numeros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || json.ok !== true) {
        setCanalErro(json.error ?? 'Erro ao atualizar o canal.')
        return
      }
      await load()
    } catch (err) {
      setCanalErro(err instanceof Error ? err.message : String(err))
    }
  }

  const handleToggleModo = (canal: CanalItem, novoModo: string) =>
    postToggleCanal({ canal_id: canal.id, modo: novoModo })

  const handleToggleEnabled = (canal: CanalItem) =>
    postToggleCanal({ canal_id: canal.id, enabled: !canal.enabled })

  const configurado =
    data !== null &&
    data.status.whatsapp_access_token &&
    data.status.whatsapp_app_secret &&
    data.status.whatsapp_verify_token &&
    data.status.whatsapp_waba_id

  
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
          Canais — WhatsApp
        </h2>
        <Badge ok={configurado} />
      </div>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        Receba e responda mensagens do WhatsApp diretamente pelos agentes — com aprovação
        humana ou de forma autônoma, conforme configurado por número.
      </p>

      {}
      <div
        role="tablist"
        aria-label="Forma de conexão"
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {([
          { key: 'cloud', label: 'Cloud API (oficial)' },
          { key: 'qr', label: 'API Não Oficial' },
        ] as const).map((seg) => {
          const ativo = transporte === seg.key
          return (
            <button
              key={seg.key}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setTransporte(seg.key)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${ativo ? 'var(--wave-to)' : 'transparent'}`,
                background: ativo ? 'rgb(124 92 255 / 0.12)' : 'transparent',
                color: ativo ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontSize: 13,
                fontWeight: ativo ? 600 : 500,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {seg.label}
            </button>
          )
        })}
      </div>

      {}
      {transporte === 'qr' && (
        <UazapiConnectFlow agentes={data?.agentes ?? []} onChange={() => void load()} />
      )}

      {}
      {transporte === 'cloud' && (
        <>
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={LABEL_STYLE}>Token permanente</label>
            <Badge ok={data?.status.whatsapp_access_token ?? false} />
          </div>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder={
              data?.status.whatsapp_access_token
                ? '•••••••••••••••• (deixe em branco para manter)'
                : 'EAAxxxxxx...'
            }
            autoComplete="off"
            style={INPUT_STYLE}
          />
        </div>

        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={LABEL_STYLE}>App Secret</label>
            <Badge ok={data?.status.whatsapp_app_secret ?? false} />
          </div>
          <input
            type="password"
            value={appSecretInput}
            onChange={(e) => setAppSecretInput(e.target.value)}
            placeholder={
              data?.status.whatsapp_app_secret
                ? '•••••••••••••••• (deixe em branco para manter)'
                : 'abc123...'
            }
            autoComplete="off"
            style={INPUT_STYLE}
          />
        </div>

        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={LABEL_STYLE}>Verify token</label>
            <Badge ok={data?.status.whatsapp_verify_token ?? false} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder={
                data?.status.whatsapp_verify_token
                  ? '•••••••••••••••• (deixe em branco para manter)'
                  : 'cole aqui ou clique em gerar →'
              }
              autoComplete="off"
              style={{ ...INPUT_STYLE, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => void handleGerar()}
              disabled={saving}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                cursor: saving ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              gerar
            </button>
          </div>
        </div>

        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={LABEL_STYLE}>WABA ID</label>
            <Badge ok={data?.status.whatsapp_waba_id ?? false} />
          </div>
          <input
            type="password"
            value={wabaInput}
            onChange={(e) => setWabaInput(e.target.value)}
            placeholder={
              data?.status.whatsapp_waba_id
                ? '•••••••••••••••• (deixe em branco para manter)'
                : '123456789012345'
            }
            autoComplete="off"
            style={INPUT_STYLE}
          />
        </div>
      </div>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font-ui)',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Salvando…' : 'Salvar chaves'}
        </button>
        {saveMsg && (
          <p
            role="status"
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.45,
              color: saveMsg.ok ? 'var(--approve)' : 'var(--reject)',
            }}
          >
            {saveMsg.ok ? '✓ ' : '✗ '}
            {saveMsg.text}
          </p>
        )}
      </div>

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
          <ol
            style={{
              margin: '4px 0 0',
              padding: '0 0 0 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <li style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              Crie um app na Meta (developers.facebook.com) e ative o produto WhatsApp.
            </li>
            <li style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              Em Webhooks, cole a URL e o verify token acima e assine o campo{' '}
              <code style={{ fontFamily: 'monospace', fontSize: 12 }}>messages</code>.
            </li>
            <li style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              Cole o token permanente, app secret e WABA ID acima e clique em Salvar chaves.
            </li>
            <li style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              Clique em Vincular no número: é aí que o painel liga a entrada de mensagens na
              sua conta do WhatsApp Business. Sem esse passo o número envia e não recebe.
            </li>
          </ol>
        </div>
      )}

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={() => void handleListar()}
          disabled={listing}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontFamily: 'var(--font-ui)',
            cursor: listing ? 'not-allowed' : 'pointer',
            opacity: listing ? 0.6 : 1,
          }}
        >
          {listing ? 'Buscando…' : 'Testar / Listar números'}
        </button>
        {listError && (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>✗ {listError}</p>
        )}

        {}
        {numeros !== null && numeros.length === 0 && (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            Nenhum número encontrado no WABA.
          </p>
        )}
        {numeros && numeros.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              {numeros.length} número{numeros.length !== 1 ? 's' : ''} encontrado{numeros.length !== 1 ? 's' : ''}
            </p>
            {numeros.map((num) => {
              const jaVinculado = data?.canais.some((c) => c.external_id === num.external_id) ?? false
              const semAgente = !selAgentes[num.external_id]
              const ocupado = vinculando[num.external_id] ?? false
              const erroVinculo = vincularErros[num.external_id] ?? null
              const erroInscricao = inscricaoErros[num.external_id] ?? null
              return (
                <div
                  key={num.external_id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: '12px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {num.rotulo}
                    </span>
                    {num.nome && (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{num.nome}</span>
                    )}
                    {jaVinculado && (
                      <span
                        style={{
                          marginLeft: 'auto',
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
                        ✓ vinculado
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      value={selAgentes[num.external_id] ?? ''}
                      onChange={(e) =>
                        setSelAgentes((a) => ({ ...a, [num.external_id]: e.target.value }))
                      }
                      style={{ ...SELECT_STYLE, flex: 1, minWidth: 120 }}
                    >
                      <option value="">Selecionar agente…</option>
                      {data?.agentes.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selModos[num.external_id] ?? 'supervisionado'}
                      onChange={(e) =>
                        setSelModos((m) => ({ ...m, [num.external_id]: e.target.value }))
                      }
                      style={SELECT_STYLE}
                    >
                      <option value="supervisionado">Supervisionado</option>
                      <option value="autonomo">Autônomo</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleVincular(num)}
                      disabled={ocupado || semAgente}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background:
                          ocupado || semAgente
                            ? 'var(--surface)'
                            : 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                        color: ocupado || semAgente ? 'var(--text-tertiary)' : '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: 'var(--font-ui)',
                        cursor: ocupado || semAgente ? 'not-allowed' : 'pointer',
                        opacity: ocupado ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {ocupado ? 'Vinculando…' : 'Vincular'}
                    </button>
                  </div>
                  {erroInscricao !== null && (
                    <p
                      role="status"
                      style={{
                        margin: 0,
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgb(214 158 46 / 0.3)',
                        background: 'rgb(214 158 46 / 0.06)',
                        color: 'rgb(214 158 46)',
                      }}
                    >
                      Número vinculado, mas não consegui ligar a entrada de mensagens{erroInscricao ? ` (${erroInscricao})` : ''}.
                      Sem isso o número envia e não recebe: confira o token permanente e o
                      WABA ID acima e clique em Vincular outra vez.
                    </p>
                  )}
                  {erroVinculo && (
                    <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>
                      ✗ {erroVinculo}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
        </>
      )}

      {}
      {data && canaisDesteCartao(data.canais).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={LABEL_STYLE}>Canais configurados</label>
          {canalErro && (
            <p role="status" style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>
              ✗ {canalErro}
            </p>
          )}
          {canaisDesteCartao(data.canais).map((canal) => {
            
            if (canal.provider === 'uazapi') {
              return (
                <UazapiCanalRow key={canal.id} canal={canal} empresa={data.empresa} agentes={data.agentes} onChange={() => void load()} />
              )
            }
            const agente = data.agentes.find((a) => a.id === canal.agent_id)
            return (
              <div
                key={canal.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  flexWrap: 'wrap',
                }}
              >
                {}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 500,
                    background: canal.enabled
                      ? 'rgb(63 185 132 / 0.12)'
                      : 'rgb(255 255 255 / 0.05)',
                    color: canal.enabled ? 'var(--approve)' : 'var(--text-tertiary)',
                    border: `1px solid ${canal.enabled ? 'rgb(63 185 132 / 0.2)' : 'rgb(255 255 255 / 0.07)'}`,
                    flexShrink: 0,
                  }}
                >
                  {canal.enabled ? '● ativo' : '○ inativo'}
                </span>

                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    flex: 1,
                    minWidth: 80,
                  }}
                >
                  {canal.rotulo}
                </span>

                {agente && (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {agente.name}
                  </span>
                )}

                <select
                  value={canal.modo}
                  onChange={(e) => void handleToggleModo(canal, e.target.value)}
                  style={{ ...SELECT_STYLE, fontSize: 12, padding: '5px 10px' }}
                >
                  <option value="supervisionado">Supervisionado</option>
                  <option value="autonomo">Autônomo</option>
                </select>

                <button
                  type="button"
                  onClick={() => void handleToggleEnabled(canal)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-hairline)',
                    background: 'transparent',
                    color: canal.enabled ? 'var(--reject)' : 'var(--approve)',
                    fontSize: 12,
                    fontFamily: 'var(--font-ui)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {canal.enabled ? 'Desativar' : 'Ativar'}
                </button>

                {}
                {(() => {
                  const alerta = alertaPropositoGeral({
                    agenteEhPrincipal: Boolean(agente && data.agentes.find((a) => a.id === canal.agent_id)?.is_primary),
                    provider: canal.provider,
                  })
                  return alerta ? (
                    <p
                      role="status"
                      style={{
                        width: '100%', margin: 0, padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgb(214 158 46 / 0.4)',
                        background: 'rgb(214 158 46 / 0.07)',
                        fontSize: 12, lineHeight: 1.5, color: 'rgb(214 158 46)',
                      }}
                    >
                      ⚠ {alerta.texto}
                    </p>
                  ) : null
                })()}

                {}
                <CanalDisclosure
                  canalId={canal.id}
                  atual={typeof canal.config?.disclosure === 'string' ? canal.config.disclosure : ''}
                  empresa={data.empresa}
                />

                {}
                <CanalFollowup canalId={canal.id} config={canal.config} />

                {}
                <CanalRoteamento
                  canalId={canal.id}
                  agentePadrao={canal.agent_id}
                  config={canal.config}
                  agentes={data.agentes}
                />

                {}
                <CanalArquivos canalId={canal.id} />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
