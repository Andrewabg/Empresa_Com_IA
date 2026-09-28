'use client'



import { useEffect, useRef, useState } from 'react'
import { SectionHeader } from '../SectionHeader'
import { podeRebaixar, podeRevogar, statusConvite, diasParaExpirar, erroDaSenha, type Papel } from '@/lib/equipe'


function sugerirSenha(): string {
  const alfabeto = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(14)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('')
}

type Membro = {
  user_id: string
  papel: Papel
  email: string | null
  convidado_por: string | null
  created_at: string
}

type ConvitePendente = {
  id: string
  papel: Papel
  rotulo: string | null
  created_at: string
  expira_em: string
}

type EquipeResposta = {
  ok: boolean
  membros: Membro[]
  donoCount: number
  voceId: string
}

const HINT_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--text-tertiary)',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
}

const BUTTON_STYLE: React.CSSProperties = {
  padding: '9px 16px',
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

const GHOST_BUTTON_STYLE: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hairline)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-lg)',
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

function disabledStyle(base: React.CSSProperties, disabled: boolean): React.CSSProperties {
  return { ...base, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }
}

function formatarData(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function PapelChip({ papel }: { papel: Papel }) {
  const dono = papel === 'dono'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        border: '1px solid var(--border-hairline)',
        background: dono ? 'rgb(40 224 200 / 0.07)' : 'var(--surface-elevated)',
        color: dono ? 'var(--wave-from)' : 'var(--text-secondary)',
      }}
    >
      {dono ? 'Dono' : 'Membro'}
    </span>
  )
}

export function EquipeSection() {
  const [dados, setDados] = useState<EquipeResposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  
  const [papelConvite, setPapelConvite] = useState<Papel>('membro')
  const [rotulo, setRotulo] = useState('')
  const [gerando, setGerando] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [conviteErro, setConviteErro] = useState<string | null>(null)

  
  const [pendentes, setPendentes] = useState<ConvitePendente[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null) 
  const [ocupadoConvite, setOcupadoConvite] = useState<string | null>(null)
  const [noticeConvite, setNoticeConvite] = useState<string | null>(null) 

  
  const [ocupado, setOcupado] = useState<string | null>(null) 
  const [confirmarRevogar, setConfirmarRevogar] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null) 

  
  const [senhaPara, setSenhaPara] = useState<string | null>(null) 
  const [senhaValor, setSenhaValor] = useState('')
  const [senhaErro, setSenhaErro] = useState<string | null>(null)
  const [senhaPronta, setSenhaPronta] = useState<string | null>(null) 
  const [senhaCopiada, setSenhaCopiada] = useState(false)

  const aliveRef = useRef(true)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])

  async function carregar() {
    try {
      const res = await fetch('/api/config/equipe')
      const j = (await res.json().catch(() => null)) as EquipeResposta | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok) {
        setDados(j)
        setErro(false)
      } else {
        setErro(true)
      }
    } catch {
      if (aliveRef.current) setErro(true)
    } finally {
      if (aliveRef.current) setCarregando(false)
    }
  }

  async function carregarPendentes() {
    const j = await fetch('/api/config/equipe/convites')
      .then((r) => r.json() as Promise<{ ok?: boolean; convites?: ConvitePendente[] }>)
      .catch(() => null)
    if (!aliveRef.current) return
    setPendentes(j?.convites ?? [])
  }

  useEffect(() => {
    void carregar()
    void carregarPendentes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function gerarConvite() {
    setGerando(true)
    setLink(null)
    setCopiado(false)
    setConviteErro(null)
    try {
      const res = await fetch('/api/config/equipe/convite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papel: papelConvite, rotulo: rotulo.trim() || undefined }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; link?: string; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok && j.link) {
        setLink(j.link)
        setRotulo('')
        void carregarPendentes()
      } else {
        setConviteErro(j?.error ?? 'Não foi possível gerar o convite. Tente de novo.')
      }
    } catch {
      if (aliveRef.current) setConviteErro('Não foi possível gerar o convite. Tente de novo.')
    } finally {
      if (aliveRef.current) setGerando(false)
    }
  }

  async function copiarLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      if (!aliveRef.current) return
      setCopiado(true)
      setTimeout(() => { if (aliveRef.current) setCopiado(false) }, 2000)
    } catch {
      
    }
  }

  async function mudarPapel(userId: string, novo: Papel) {
    setOcupado(userId)
    setNotice(null)
    try {
      const res = await fetch('/api/config/equipe/papel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, papel: novo }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok) {
        await carregar()
      } else {
        setNotice(j?.error ?? 'Não foi possível mudar o papel. Tente de novo.')
      }
    } catch {
      if (aliveRef.current) setNotice('Não foi possível mudar o papel. Tente de novo.')
    } finally {
      if (aliveRef.current) setOcupado(null)
    }
  }

  async function revogar(userId: string) {
    setOcupado(userId)
    setNotice(null)
    try {
      const res = await fetch('/api/config/equipe/revogar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok) {
        setConfirmarRevogar(null)
        await carregar()
      } else {
        setNotice(j?.error ?? 'Não foi possível revogar o acesso. Tente de novo.')
      }
    } catch {
      if (aliveRef.current) setNotice('Não foi possível revogar o acesso. Tente de novo.')
    } finally {
      if (aliveRef.current) setOcupado(null)
    }
  }

  function abrirSenha(userId: string) {
    setSenhaPara(userId)
    setSenhaValor(sugerirSenha()) 
    setSenhaErro(null)
    setSenhaPronta(null)
    setSenhaCopiada(false)
    setConfirmarRevogar(null)
  }

  function fecharSenha() {
    setSenhaPara(null)
    setSenhaValor('')
    setSenhaErro(null)
  }

  async function definirSenha(userId: string) {
    
    const invalida = erroDaSenha(senhaValor)
    if (invalida) { setSenhaErro(invalida); return }
    setOcupado(userId)
    setSenhaErro(null)
    try {
      const res = await fetch('/api/config/equipe/senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, senha: senhaValor }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok) {
        setSenhaPara(null)
        setSenhaPronta(userId) 
      } else {
        setSenhaErro(j?.error ?? 'Não foi possível definir a senha. Tente de novo.')
      }
    } catch {
      if (aliveRef.current) setSenhaErro('Não foi possível definir a senha. Tente de novo.')
    } finally {
      if (aliveRef.current) setOcupado(null)
    }
  }

  async function copiarSenha() {
    try {
      await navigator.clipboard.writeText(senhaValor)
      if (!aliveRef.current) return
      setSenhaCopiada(true)
      setTimeout(() => { if (aliveRef.current) setSenhaCopiada(false) }, 2000)
    } catch {
      
    }
  }

  async function cancelarConvite(conviteId: string) {
    setOcupadoConvite(conviteId)
    setNoticeConvite(null)
    try {
      const res = await fetch('/api/config/equipe/convite/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conviteId }),
      })
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!aliveRef.current) return
      if (res.ok && j?.ok) {
        setCancelId(null)
        await carregarPendentes()
      } else {
        setNoticeConvite(j?.error ?? 'Não foi possível cancelar o convite. Tente de novo.')
      }
    } catch {
      if (aliveRef.current) setNoticeConvite('Não foi possível cancelar o convite. Tente de novo.')
    } finally {
      if (aliveRef.current) setOcupadoConvite(null)
    }
  }

  const donoCount = dados?.donoCount ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Equipe"
        description="Quem entra na sua empresa e o que cada um pode fazer. Donos configuram tudo; membros usam o dia a dia sem acessar as chaves."
      />

      {}
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Convidar
          </span>
          <p style={HINT_STYLE}>
            Gere um link de convite. A pessoa cria a própria senha e entra com o papel que você escolher. O link vale 7 dias.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 220px' }}>
            <label htmlFor="equipe-rotulo-convite" style={LABEL_STYLE}>Para quem é? (opcional)</label>
            <input
              id="equipe-rotulo-convite"
              type="text"
              maxLength={80}
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              placeholder="Ex.: Ana do financeiro"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
                padding: '9px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="equipe-papel-convite" style={LABEL_STYLE}>Papel</label>
            <select
              id="equipe-papel-convite"
              value={papelConvite}
              onChange={(e) => setPapelConvite(e.target.value as Papel)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
                padding: '9px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)',
                fontSize: 14,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="membro">Membro</option>
              <option value="dono">Dono</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => void gerarConvite()}
            disabled={gerando}
            style={disabledStyle(BUTTON_STYLE, gerando)}
          >
            {gerando ? 'Gerando…' : 'Gerar convite'}
          </button>
        </div>

        {link && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Link do convite"
                style={{
                  flex: '1 1 260px',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <button type="button" onClick={() => void copiarLink()} style={BUTTON_STYLE}>
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p style={HINT_STYLE}>
              Mande esse link para a pessoa. Ela cria a própria senha e entra. O link vale uma vez, e some quando você sai desta tela.
            </p>
          </div>
        )}

        {conviteErro && (
          <p role="status" style={{ ...HINT_STYLE, color: 'var(--reject)' }}>{conviteErro}</p>
        )}
      </div>

      {}
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Convites pendentes
          </span>
          <p style={HINT_STYLE}>Convites gerados que ainda não foram aceitos.</p>
        </div>

        {pendentes.length === 0 ? (
          <p style={HINT_STYLE}>Nenhum convite pendente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendentes.map((c) => {
              const emAcao = ocupadoConvite === c.id
              const exp = new Date(c.expira_em).getTime()
              const expirado = statusConvite(Date.now(), exp) === 'expirado'
              const criado = formatarData(c.created_at)
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface-elevated)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: '1 1 180px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 14,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.rotulo || 'Sem identificação'}
                      </span>
                      <PapelChip papel={c.papel} />
                    </span>
                    {criado && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Criado em {criado}</span>}
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: expirado ? 'var(--reject)' : 'var(--text-tertiary)',
                    }}
                  >
                    {expirado ? 'Expirado' : `Expira em ${diasParaExpirar(Date.now(), exp)} dias`}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {cancelId === c.id ? (
                      <>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Cancelar este convite?</span>
                        <button
                          type="button"
                          onClick={() => void cancelarConvite(c.id)}
                          disabled={emAcao}
                          style={disabledStyle({ ...GHOST_BUTTON_STYLE, color: 'var(--reject)' }, emAcao)}
                        >
                          {emAcao ? 'Cancelando…' : 'Confirmar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelId(null)}
                          disabled={emAcao}
                          style={GHOST_BUTTON_STYLE}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCancelId(c.id)}
                        disabled={emAcao}
                        style={disabledStyle({ ...GHOST_BUTTON_STYLE, color: 'var(--reject)' }, emAcao)}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {noticeConvite && (
          <p role="status" style={{ ...HINT_STYLE, color: 'var(--reject)' }}>{noticeConvite}</p>
        )}
      </div>

      {}
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Pessoas com acesso
          </span>
          <p style={HINT_STYLE}>
            Promova, rebaixe ou remova quem quiser. O último Dono não pode ser rebaixado nem removido.
            Se alguém perdeu a senha, use <strong>Definir senha</strong> e devolva o acesso na hora, sem sair daqui.
          </p>
        </div>

        {carregando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                aria-hidden
                style={{
                  height: 52,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-elevated)',
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        ) : erro || !dados ? (
          <p style={HINT_STYLE}>Não foi possível carregar a equipe agora. Recarregue a página para tentar de novo.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dados.membros.map((m) => {
              const souEu = m.user_id === dados.voceId
              const emAcao = ocupado === m.user_id
              const podeRebaixarEste = podeRebaixar(donoCount, m.papel)
              const podeRevogarEste = podeRevogar(donoCount, m.papel)
              const data = formatarData(m.created_at)
              return (
                <div
                  key={m.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface-elevated)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: '1 1 180px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 14,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.email ?? 'Sem e-mail'}
                      </span>
                      <PapelChip papel={m.papel} />
                      {souEu && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>(você)</span>}
                    </span>
                    {data && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Entrou em {data}</span>}
                  </div>

                  {}
                  {senhaPara === m.user_id && (
                    <div style={{ order: 9, flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          autoComplete="off"
                          spellCheck={false}
                          value={senhaValor}
                          onChange={(e) => { setSenhaValor(e.target.value); setSenhaErro(null) }}
                          onFocus={(e) => e.currentTarget.select()}
                          aria-label={`Senha nova para ${m.email ?? 'a pessoa'}`}
                          style={{
                            flex: '1 1 220px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border-hairline)',
                            borderRadius: 'var(--radius-md)',
                            padding: '9px 12px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 13,
                            outline: 'none',
                          }}
                        />
                        <button type="button" onClick={() => setSenhaValor(sugerirSenha())} disabled={emAcao} style={disabledStyle(GHOST_BUTTON_STYLE, emAcao)}>
                          Sortear outra
                        </button>
                        <button
                          type="button"
                          onClick={() => void definirSenha(m.user_id)}
                          disabled={emAcao}
                          style={disabledStyle(BUTTON_STYLE, emAcao)}
                        >
                          {emAcao ? 'Definindo…' : 'Definir senha'}
                        </button>
                        <button type="button" onClick={fecharSenha} disabled={emAcao} style={GHOST_BUTTON_STYLE}>
                          Cancelar
                        </button>
                      </div>
                      <p style={HINT_STYLE}>
                        A senha vale na hora. Copie e mande para a pessoa por onde vocês já conversam, e peça para ela trocar depois.
                      </p>
                      {senhaErro && <p role="status" style={{ ...HINT_STYLE, color: 'var(--reject)' }}>{senhaErro}</p>}
                    </div>
                  )}

                  {}
                  {senhaPronta === m.user_id && (
                    <div style={{ order: 9, flex: '1 1 100%', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--approve, var(--wave-from))' }}>Senha definida.</span>
                      <code
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-hairline)',
                          background: 'var(--surface)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: 13,
                          userSelect: 'all',
                        }}
                      >
                        {senhaValor}
                      </code>
                      <button type="button" onClick={() => void copiarSenha()} style={GHOST_BUTTON_STYLE}>
                        {senhaCopiada ? 'Copiada' : 'Copiar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSenhaPronta(null); setSenhaValor('') }}
                        style={GHOST_BUTTON_STYLE}
                      >
                        Pronto
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {confirmarRevogar === m.user_id ? (
                      <>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Remover o acesso?</span>
                        <button
                          type="button"
                          onClick={() => void revogar(m.user_id)}
                          disabled={emAcao}
                          style={disabledStyle({ ...GHOST_BUTTON_STYLE, color: 'var(--reject)' }, emAcao)}
                        >
                          {emAcao ? 'Removendo…' : 'Confirmar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmarRevogar(null)}
                          disabled={emAcao}
                          style={GHOST_BUTTON_STYLE}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        {m.papel === 'membro' ? (
                          <button
                            type="button"
                            onClick={() => void mudarPapel(m.user_id, 'dono')}
                            disabled={emAcao}
                            style={disabledStyle(GHOST_BUTTON_STYLE, emAcao)}
                          >
                            Promover a Dono
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void mudarPapel(m.user_id, 'membro')}
                            disabled={emAcao || !podeRebaixarEste}
                            title={!podeRebaixarEste ? 'O último Dono não pode ser rebaixado.' : undefined}
                            style={disabledStyle(GHOST_BUTTON_STYLE, emAcao || !podeRebaixarEste)}
                          >
                            Rebaixar a Membro
                          </button>
                        )}
                        {}
                        {!souEu && senhaPara !== m.user_id && (
                          <button
                            type="button"
                            onClick={() => abrirSenha(m.user_id)}
                            disabled={emAcao}
                            title="Use quando a pessoa perdeu a senha e não consegue mais entrar."
                            style={disabledStyle(GHOST_BUTTON_STYLE, emAcao)}
                          >
                            Definir senha
                          </button>
                        )}
                        {!souEu && (
                          <button
                            type="button"
                            onClick={() => setConfirmarRevogar(m.user_id)}
                            disabled={emAcao || !podeRevogarEste}
                            title={!podeRevogarEste ? 'O último Dono não pode ser removido.' : undefined}
                            style={disabledStyle({ ...GHOST_BUTTON_STYLE, color: 'var(--reject)' }, emAcao || !podeRevogarEste)}
                          >
                            Revogar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {notice && (
          <p role="status" style={{ ...HINT_STYLE, color: 'var(--reject)' }}>{notice}</p>
        )}
      </div>
    </div>
  )
}
