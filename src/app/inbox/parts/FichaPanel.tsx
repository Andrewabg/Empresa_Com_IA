'use client'



import { useEffect, useState } from 'react'
import type { DossieHandoff } from '@/lib/canais/dossie'
import { ACAO_FOLLOWUP } from '@/lib/canais/followup'
import { lerSaudeConfig, QUALIDADE_LABEL, conselhoQualidade, entradaMuda, AVISO_ENTRADA_MUDA } from '@/lib/canais/saudeNumero'
import { agenteDaConversa } from '@/lib/canais/agenteDaConversa'
import Link from 'next/link'
import { Card } from '@/app/agentes/parts'
import type { CanalRow } from '@/data/canais'
import type { ContatoRow } from '@/data/contatos'
import type { ConversaStatus } from '@/data/conversasExternas'
import type { AcaoResultado, AgenteRef, ConversaInbox } from '../InboxClient'
import { textoAviso } from './Thread'
import { TEXTOS_EXCLUIR_CONVERSA } from '@/lib/inbox/copyExcluirConversa'

const STATUS_LABEL: Record<ConversaStatus, string> = {
  aberta: 'Com o agente',
  aguardando_humano: 'Aguardando você',
  assumida: 'Assumida por você',
  fechada: 'Fechada',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'block',
        marginBottom: 4,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
      }}
    >
      {children}
    </span>
  )
}

function StatusChip({ status }: { status: ConversaStatus }) {
  const aguardando = status === 'aguardando_humano'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        width: 'fit-content',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11.5,
        border: `1px solid ${aguardando ? 'rgb(214 158 46 / 0.45)' : 'var(--border-hairline)'}`,
        background: aguardando ? 'rgb(214 158 46 / 0.08)' : 'var(--surface-elevated)',
        color: aguardando ? 'rgb(214 158 46)' : 'var(--text-secondary)',
      }}
    >
      {aguardando && (
        <span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(214 158 46)', flexShrink: 0 }}
        />
      )}
      {STATUS_LABEL[status]}
    </span>
  )
}

const btnAcao: React.CSSProperties = {
  padding: '6px 13px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  border: '1px solid rgb(255 255 255 / 0.14)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 12.5,
  fontWeight: 550,
}

const btnGhost: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  border: '1px solid var(--border-hairline)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 12.5,
}


const btnPerigo: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  border: '1px solid rgb(229 99 77 / 0.4)',
  background: 'transparent',
  color: 'var(--reject)',
  fontSize: 12.5,
}


const COR_QUALIDADE: Record<string, string> = {
  GREEN: 'var(--approve)',
  YELLOW: 'rgb(214 158 46)',
  RED: 'var(--reject)',
  UNKNOWN: 'var(--text-tertiary)',
}


function quandoToque(iso: string | null, agoraMs: number | null): string {
  if (!iso || agoraMs === null) return ''
  const delta = Date.parse(iso) - agoraMs
  if (!Number.isFinite(delta)) return ''
  if (delta <= 0) return 'a qualquer momento'
  const min = Math.round(delta / 60_000)
  if (min < 60) return `em ${Math.max(1, min)}min`
  const h = Math.round(min / 60)
  return h < 24 ? `em ${h}h` : `em ${Math.round(h / 24)}d`
}



const SENTIMENTO_CHIP: Record<string, { texto: string; cor: string; fundo: string }> = {
  irritado: { texto: 'cliente irritado', cor: 'var(--reject)', fundo: 'rgb(232 93 93 / 0.12)' },
  insatisfeito: { texto: 'cliente insatisfeito', cor: 'rgb(214 158 46)', fundo: 'rgb(214 158 46 / 0.12)' },
  neutro: { texto: 'tom neutro', cor: 'var(--text-tertiary)', fundo: 'rgb(255 255 255 / 0.05)' },
}


function DossiePanel({ dossie }: { dossie: DossieHandoff }) {
  const chip = SENTIMENTO_CHIP[dossie.sentimento] ?? SENTIMENTO_CHIP.neutro
  return (
    <Card label="Passando para você" className="inbox-dossie" style={{ flex: '0 0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-primary)', fontWeight: 500 }}>
          {dossie.resumo}
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-flex', padding: '2px 9px', borderRadius: 99, fontSize: 11,
              fontWeight: 500, background: chip.fundo, color: chip.cor,
            }}
          >
            {chip.texto}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
            {dossie.tentativas} {dossie.tentativas === 1 ? 'tentativa' : 'tentativas'} do agente
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{dossie.motivo}</p>

        {dossie.sabemos.length > 0 && (
          <div>
            <SectionLabel>O que já sabemos</SectionLabel>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {dossie.sabemos.map((s, i) => (
                <li key={`s-${i}`} style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {dossie.falta.length > 0 && (
          <div>
            <SectionLabel>O que falta</SectionLabel>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {dossie.falta.map((s, i) => (
                <li key={`f-${i}`} style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

export function FichaPanel({
  conversa,
  canal,
  agentes,
  contato,
  busy,
  onAcao,
  onExcluir,
  isDono,
}: {
  conversa: ConversaInbox | null
  canal: CanalRow | undefined
  agentes: AgenteRef[]
  contato: ContatoRow | null
  busy: boolean
  onAcao: (acao: 'assumir' | 'devolver' | 'fechar' | 'cancelar_followup') => Promise<AcaoResultado>
  
  onExcluir: () => Promise<AcaoResultado>
  isDono: boolean
}) {
  const [confirmaFechar, setConfirmaFechar] = useState(false)
  const [confirmaExcluir, setConfirmaExcluir] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  
  
  const [toqueCancelado, setToqueCancelado] = useState(false)
  const [agoraMs, setAgoraMs] = useState<number | null>(null)
  useEffect(() => {
    setAgoraMs(Date.now())
    const timer = setInterval(() => setAgoraMs(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  if (!conversa) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
        <Card label="Cliente" style={{ flex: '1 1 0' }}>
          <p style={{ margin: '10px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-tertiary)' }}>
            Nenhuma conversa selecionada.
          </p>
        </Card>
      </div>
    )
  }

  const nome = contato?.nome?.trim() || conversa.contato?.nome?.trim() || conversa.contato?.external_id || 'Contato'
  const numero = contato?.external_id ?? conversa.contato?.external_id ?? ''
  const ficha = contato?.ficha ?? null
  const temObservacoes = !!ficha?.perfil?.observacoes
  const aprendizados = ficha?.aprendizados ?? []
  
  
  const agenteDono = canal
    ? agentes.find((a) => a.id === agenteDaConversa(conversa.agent_id, canal.agent_id))
    : undefined

  async function acao(a: 'assumir' | 'devolver' | 'fechar') {
    setAviso(null)
    const res = await onAcao(a)
    if (!res.ok) setAviso(textoAviso(res.reason))
    if (a === 'fechar') setConfirmaFechar(false)
  }

  
  
  async function excluir() {
    setAviso(null)
    const res = await onExcluir()
    if (!res.ok) {
      setAviso(textoAviso(res.reason))
      setConfirmaExcluir(false)
    }
  }

  async function cancelarToque() {
    setAviso(null)
    setToqueCancelado(true)
    const res = await onAcao('cancelar_followup')
    
    
    if (!res.ok) { setToqueCancelado(false); setAviso(textoAviso(res.reason)) }
  }

  
  
  const dossie = conversa.status === 'aguardando_humano' ? conversa.dossie : null
  const saude = canal ? lerSaudeConfig(canal.config) : null
  const mudo = entradaMuda(saude)

  return (
    
    
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12, overflowY: 'auto' }}>
      {dossie && <DossiePanel dossie={dossie} />}
      {}
      {mudo && (
        <div
          role="status"
          style={{
            flexShrink: 0,
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgb(214 158 46 / 0.3)',
            background: 'rgb(214 158 46 / 0.06)',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'rgb(214 158 46)',
          }}
        >
          {AVISO_ENTRADA_MUDA}
        </div>
      )}
      {}
      <Card label="Cliente" style={{ flex: '1 1 auto', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
                overflowWrap: 'anywhere',
              }}
            >
              {nome}
            </p>
            {numero && (
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-tertiary)' }}>+{numero.replace(/^\+/, '')}</p>
            )}
          </div>

          {temObservacoes && (
            <div>
              <SectionLabel>Observações</SectionLabel>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                {ficha?.perfil?.observacoes}
              </p>
            </div>
          )}

          {aprendizados.length > 0 && (
            <div>
              <SectionLabel>Aprendizados</SectionLabel>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {aprendizados.map((f, i) => (
                  <li key={`${f.at}-${i}`} style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                    {f.texto}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!temObservacoes && aprendizados.length === 0 && (
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-tertiary)' }}>
              O agente ainda não anotou nada sobre este cliente — a ficha cresce conforme as conversas.
            </p>
          )}
        </div>
      </Card>

      {}
      <Card label="Conversa" className="inbox-conversa" style={{ flex: '0 0 auto' }} bodyScroll={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <StatusChip status={conversa.status} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {(conversa.status === 'aberta' || conversa.status === 'aguardando_humano') && (
              <button
                type="button"
                style={{ ...btnAcao, opacity: busy ? 0.6 : 1 }}
                disabled={busy}
                onClick={() => void acao('assumir')}
              >
                Assumir
              </button>
            )}
            {conversa.status === 'assumida' && (
              <button
                type="button"
                style={{ ...btnAcao, opacity: busy ? 0.6 : 1 }}
                disabled={busy}
                onClick={() => void acao('devolver')}
              >
                Devolver ao agente
              </button>
            )}
            {conversa.status !== 'fechada' &&
              (confirmaFechar ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Fechar mesmo?
                  <button
                    type="button"
                    style={{ ...btnGhost, padding: '4px 10px', opacity: busy ? 0.6 : 1 }}
                    disabled={busy}
                    onClick={() => void acao('fechar')}
                  >
                    Sim, fechar
                  </button>
                  <button
                    type="button"
                    style={{ ...btnGhost, padding: '4px 10px', border: 'none' }}
                    onClick={() => setConfirmaFechar(false)}
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button type="button" style={btnGhost} disabled={busy} onClick={() => setConfirmaFechar(true)}>
                  Fechar conversa
                </button>
              ))}
            {}
            {conversa.status === 'fechada' && isDono &&
              (confirmaExcluir ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {TEXTOS_EXCLUIR_CONVERSA.confirmarPergunta}
                  <button
                    type="button"
                    style={{ ...btnPerigo, padding: '4px 10px', opacity: busy ? 0.6 : 1 }}
                    disabled={busy}
                    onClick={() => void excluir()}
                  >
                    {TEXTOS_EXCLUIR_CONVERSA.confirmarBotao}
                  </button>
                  <button
                    type="button"
                    style={{ ...btnGhost, padding: '4px 10px', border: 'none' }}
                    onClick={() => setConfirmaExcluir(false)}
                  >
                    {TEXTOS_EXCLUIR_CONVERSA.cancelarBotao}
                  </button>
                </span>
              ) : (
                <button type="button" style={btnPerigo} disabled={busy} onClick={() => setConfirmaExcluir(true)}>
                  {TEXTOS_EXCLUIR_CONVERSA.botao}
                </button>
              ))}
          </div>
          {conversa.status === 'fechada' && isDono && confirmaExcluir && (
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              {TEXTOS_EXCLUIR_CONVERSA.confirmarAviso}
            </p>
          )}

          {}
          {conversa.proxima_acao === ACAO_FOLLOWUP && !toqueCancelado && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
              }}
            >
              <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                O agente vai dar um toque {quandoToque(conversa.proxima_acao_em, agoraMs)} se o cliente não responder.
              </span>
              <button
                type="button"
                style={{ ...btnGhost, padding: '3px 9px', fontSize: 11.5, marginLeft: 'auto', opacity: busy ? 0.6 : 1 }}
                disabled={busy}
                onClick={() => void cancelarToque()}
              >
                cancelar
              </button>
            </div>
          )}

          {aviso && <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--reject)' }}>{aviso}</p>}

          {canal && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
                paddingTop: 8,
                borderTop: '1px solid var(--border-hairline)',
                fontSize: 11.5,
                color: 'var(--text-tertiary)',
              }}
            >
              <span
                style={{
                  padding: '2px 9px',
                  borderRadius: 999,
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface-elevated)',
                  color: 'var(--text-secondary)',
                }}
              >
                {canal.modo === 'autonomo' ? 'Autônomo' : 'Supervisionado'}
              </span>
              <span>
                {agenteDono?.name ?? 'O agente'}{' '}
                {canal.modo === 'autonomo' ? 'responde sozinho' : 'responde com sua aprovação'}
              </span>
              <Link
                href="/config"
                style={{ marginLeft: 'auto', color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                ajustar
              </Link>
            </div>
          )}

          {}
          {saude && saude.qualidade !== 'UNKNOWN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                <span
                  aria-hidden
                  style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: COR_QUALIDADE[saude.qualidade] }}
                />
                Qualidade do número: {QUALIDADE_LABEL[saude.qualidade]}
                {saude.limite ? ` · limite ${saude.limite}` : ''}
              </span>
              {conselhoQualidade(saude.qualidade) && (
                <span style={{ fontSize: 11.5, lineHeight: 1.5, color: COR_QUALIDADE[saude.qualidade] }}>
                  {conselhoQualidade(saude.qualidade)}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
