'use client'

import { useEffect, useState, useId, useRef } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { CORRECAO_UI, LIMITE_CORRECAO, temCorrecao } from '@/lib/aprovacoes/correcaoDoPlano'
import { COPY_SO_DONO_DECIDE } from '@/lib/aprovacoes/falhaPermanente'
import { Diff } from '@/components/ui/Diff'
import { Markdown } from '@/components/markdown/Markdown'
import { ehDiffUnificado } from '@/lib/diff'
import { paragrafosDoMotivo } from '@/lib/aprovacoes/motivo'
import { bus } from '@/mock/bus'
import { relativeTime } from '@/components/cards/LiveFeedItem'
import { agentName } from '@/lib/brain-nav'
import { parsePlanoMarkdown } from '@/lib/maestro-view'
import { CTAS_VALIDOS, rotuloCta } from '@/lib/trafego/lancamentoCriativo'
import type { CampoHumano } from '@/lib/aprovacoes/humanizarAto'
import type { MockApproval } from '@/mock/types'


type LaunchFields = { message: string; headline?: string; cta: string; link: string }


const LABEL_MENSAGEM = 'Mensagem'
const LABEL_BOTAO = 'Botão'
const LABEL_LINK = 'Link'
const LABEL_HEADLINE = 'Headline'
const EDITAVEIS = new Set<string>([LABEL_MENSAGEM, LABEL_BOTAO, LABEL_LINK, LABEL_HEADLINE])

export const KIND_LABEL: Record<MockApproval['kind'], string> = {
  brain_pr: 'Mudança no cérebro',
  tool_action: 'Ação de risco',
  plan: 'Plano de orquestração',
}



export type ApprovalDecision = 'approve' | 'reject'


export function readbackSentence(approval: MockApproval): string {
  if (approval.kind === 'tool_action' && approval.action) {
    return `Confirma: ${lowerFirst(approval.action.sentence)}?`
  }
  if (approval.kind === 'plan') {
    return `Confirma executar o plano: ${lowerFirst(approval.title)}?`
  }
  return `Confirma aplicar no cérebro: ${lowerFirst(approval.title)}?`
}

function lowerFirst(s: string): string {
  return s.length ? s[0].toLowerCase() + s.slice(1) : s
}



function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8.5l3 3L13 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CrossGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MicGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect
        x="6.25"
        y="2"
        width="5.5"
        height="9"
        rx="2.75"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M4 8.2a5 5 0 0 0 10 0M9 13.2V16M6.4 16h5.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11.2 2.6l2.2 2.2M2.5 13.5l.7-3 7.3-7.3a1.1 1.1 0 0 1 1.6 0l1.2 1.2a1.1 1.1 0 0 1 0 1.6l-7.3 7.3-3 .7z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PrGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="4" cy="4" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="12" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M4 5.6v4.8M5.6 12h4.8M12 5.6V10.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M12 2.5v3.1M10.5 4h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function PlanGlyph() {
  
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="3.5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="3.5" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.5 5.5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M7 4h6M7 8h6M7 12h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}


export function KindGlyph({ kind }: { kind: MockApproval['kind'] }) {
  if (kind === 'brain_pr') return <PrGlyph />
  if (kind === 'plan') return <PlanGlyph />
  return <MicGlyph />
}



interface ApprovalCardProps {
  approval: MockApproval
  
  now: number
  
  
  onResolved: (id: string, decision: ApprovalDecision, correcao?: string) => void
  
  onEditLaunch?: (
    id: string,
    fields: { message: string; headline?: string; cta: string; link: string },
  ) => Promise<boolean>
  
  podeDecidir?: boolean
  
  nomesDeAgente?: Record<string, string>
}


export function ApprovalCard({ approval, now, onResolved, onEditLaunch, podeDecidir = true, nomesDeAgente }: ApprovalCardProps) {
  const reducedMotion = useReducedMotion() ?? false
  const [leaving, setLeaving] = useState<ApprovalDecision | null>(null)
  
  const [readback, setReadback] = useState(false)
  
  const [corrigindo, setCorrigindo] = useState(false)
  
  
  const [editing, setEditing] = useState(false)
  const podeEditar = !!approval.launchArgs && !!onEditLaunch
  const titleId = useId()

  
  
  
  const [fields, setFields] = useState<LaunchFields>(() => launchInicial(approval.launchArgs))
  const [salvando, setSalvando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [erroEdit, setErroEdit] = useState<string | null>(null)

  function entrarEdicao() {
    setFields(launchInicial(approval.launchArgs))
    setErroEdit(null)
    setEditing(true)
  }
  function cancelarEdicao() {
    setFields(launchInicial(approval.launchArgs))
    setErroEdit(null)
    setGerando(false)
    setEditing(false)
  }
  async function salvarEdicao() {
    if (salvando || gerando || !onEditLaunch) return
    if (!fields.message.trim()) {
      setErroEdit('A mensagem não pode ficar vazia.')
      return
    }
    if (!linkClienteValido(fields.link)) {
      setErroEdit('Informe um link de destino válido (http ou https).')
      return
    }
    setErroEdit(null)
    setSalvando(true)
    const headline = (fields.headline ?? '').trim()
    const ok = await onEditLaunch(approval.id, {
      message: fields.message.trim(),
      ...(headline ? { headline } : {}),
      cta: fields.cta,
      link: fields.link.trim(),
    })
    setSalvando(false)
    if (ok) setEditing(false)
    else setErroEdit('Não consegui salvar. Tente de novo.')
  }
  
  
  async function gerarComLia() {
    const artifactId = approval.launchArgs?.artifactId?.trim()
    if (gerando || salvando || !artifactId) return
    if (!linkClienteValido(fields.link)) {
      setErroEdit('Pra gerar com a Lia preciso de um link de destino válido (http ou https).')
      return
    }
    setErroEdit(null)
    setGerando(true)
    try {
      const res = await fetch('/api/trafego/gerar-copy-lancamento', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ artifactId, link: fields.link.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        message?: string; headline?: string; cta?: string; error?: string
      }
      if (!res.ok) {
        setErroEdit(data.error ?? 'A Lia não conseguiu gerar a copy agora. Tente de novo.')
        return
      }
      setFields((f) => ({
        ...f,
        message: typeof data.message === 'string' ? data.message : f.message,
        headline: typeof data.headline === 'string' ? data.headline : f.headline,
        cta: normalizarCtaCliente(data.cta) ?? f.cta,
      }))
    } catch {
      setErroEdit('A Lia não conseguiu gerar a copy agora. Tente de novo.')
    } finally {
      setGerando(false)
    }
  }

  
  const motivo = paragrafosDoMotivo(approval.reason)

  
  
  
  
  
  const resolvedRef = useRef(false)
  
  
  const correcaoRef = useRef<string | undefined>(undefined)

  
  function commit(decision: ApprovalDecision, correcao?: string) {
    if (leaving) return
    correcaoRef.current = correcao
    const label =
      decision === 'approve'
        ? `Aprovado: ${approval.title}`
        : `Rejeitado: ${approval.title}`
    bus.emit('live', {
      id: `apr-${approval.id}-${decision}`,
      type: 'action',
      label,
      at: Date.now(),
    })
    setReadback(false)
    setLeaving(decision)
    
    if (reducedMotion) {
      if (!resolvedRef.current) {
        resolvedRef.current = true
        onResolved(approval.id, decision, correcaoRef.current)
      }
    }
  }

  return (
    <motion.article
      aria-labelledby={titleId}
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={
        leaving
          ? {
              opacity: 0,
              
              x: reducedMotion ? 0 : leaving === 'approve' ? 40 : -40,
              scale: reducedMotion ? 1 : 0.98,
            }
          : { opacity: 1, y: 0, x: 0, scale: 1 }
      }
      transition={reducedMotion ? { duration: 0 } : springPreset}
      onAnimationComplete={() => {
        if (leaving && !reducedMotion && !resolvedRef.current) {
          resolvedRef.current = true
          onResolved(approval.id, leaving, correcaoRef.current)
        }
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(20px, 2.4vw, 28px)',
        boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.03)',
      }}
    >
      {}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}><KindGlyph kind={approval.kind} /></span>
          {KIND_LABEL[approval.kind]}
        </span>
        <span
          style={{
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}
        >
          {relativeTime(Date.parse(approval.createdAt), now)}
        </span>
      </header>

      {}
      {approval.origem && (
        <p
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'var(--text-tertiary)',
          }}
        >
          {approval.origem}
        </p>
      )}

      {}
      <h2
        id={titleId}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(17px, 1.9vw, 20px)',
          fontWeight: 600,
          lineHeight: 1.2,
          letterSpacing: '-0.015em',
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: 16,
        }}
      >
        {approval.title}
      </h2>

      {}
      {approval.kind === 'brain_pr' ? (
        <BrainPrBody approval={approval} />
      ) : approval.kind === 'plan' ? (
        <PlanBody approval={approval} />
      ) : (
        <ToolActionBody
          approval={approval}
          edit={
            podeEditar
              ? {
                  editing,
                  values: fields,
                  onChange: (patch) => setFields((f) => ({ ...f, ...patch })),
                  disabled: salvando || gerando,
                  gerando,
                  onGerarLia: approval.launchArgs?.artifactId ? gerarComLia : undefined,
                }
              : undefined
          }
        />
      )}

      {}
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px solid var(--border-hairline)',
        }}
      >
        {}
        {motivo.length > 0 && (
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Por que estão pedindo
          </p>
        )}
        {motivo.map((par, i) => (
          <p
            key={i}
            style={{
              margin: 0,
              marginTop: i === 0 ? 8 : 10,
              fontSize: 13.5,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
            }}
          >
            {par}
          </p>
        ))}
        <p
          style={{
            margin: 0,
            marginTop: 12,
            fontSize: 12,
            color: 'var(--text-tertiary)',
          }}
        >
          Solicitado por {agentName(approval.agent, nomesDeAgente)}
        </p>
      </div>

      {}
      <div style={{ marginTop: 18 }}>
        {editing && podeEditar ? (
          <LaunchEditControls
            salvando={salvando}
            gerando={gerando}
            erro={erroEdit}
            onSave={salvarEdicao}
            onCancel={cancelarEdicao}
          />
        ) : readback ? (
          <Readback
            sentence={readbackSentence(approval)}
            reducedMotion={reducedMotion}
            onConfirm={() => commit('approve')}
            onCancel={() => setReadback(false)}
          />
        ) : corrigindo ? (
          <CorrecaoDePlano
            disabled={!!leaving}
            onCorrigir={(texto) => commit('reject', texto)}
            onCancelarObjetivo={() => commit('reject')}
            onVoltar={() => setCorrigindo(false)}
          />
        ) : podeDecidir === false ? (
          
          
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            {COPY_SO_DONO_DECIDE}
          </p>
        ) : (
          <Controls
            disabled={!!leaving}
            onVoice={() => setReadback(true)}
            onApprove={() => commit('approve')}
            
            
            
            onReject={() => (approval.kind === 'plan' ? setCorrigindo(true) : commit('reject'))}
            onEdit={podeEditar ? entrarEdicao : undefined}
          />
        )}
      </div>
    </motion.article>
  )
}



function BrainPrBody({ approval }: { approval: MockApproval }) {
  
  
  const path = approval.path ?? extractPath(approval.diff ?? '')
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 10,
        }}
      >
        {path && (
          <code
            style={{
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              fontSize: 12,
              color: 'var(--text-secondary)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px 8px',
            }}
          >
            {path}
          </code>
        )}
        {}
        {approval.prUrl && (
        <a
          href={approval.prUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Ver o pull request no GitHub"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px 9px',
            cursor: 'pointer',
          }}
        >
          ver PR
          <span aria-hidden style={{ opacity: 0.7 }}>↗</span>
        </a>
        )}
      </div>
      <CorpoDaMudanca fonte={approval.diff ?? ''} rotulo={path || approval.title} />
    </div>
  )
}


const ALTURA_DOBRA = 420


function CorpoDaMudanca({ fonte, rotulo }: { fonte: string; rotulo: string }) {
  const [aberto, setAberto] = useState(false)
  const corpoRef = useRef<HTMLDivElement | null>(null)
  
  
  const [transborda, setTransborda] = useState(false)

  useEffect(() => {
    const el = corpoRef.current
    if (!el) return
    setTransborda(el.scrollHeight > ALTURA_DOBRA + 24)
  }, [fonte])

  if (ehDiffUnificado(fonte)) {
    return <Diff source={fonte} label={`Diff de ${rotulo}`} />
  }

  return (
    <div>
      <div
        style={{
          position: 'relative',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-base)',
          padding: '14px 18px',
        }}
      >
        <div
          ref={corpoRef}
          style={{
            maxHeight: aberto ? 'none' : ALTURA_DOBRA,
            overflow: 'hidden',
          }}
        >
          <Markdown>{fonte}</Markdown>
        </div>
        {}
        {!aberto && transborda && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 1,
              right: 1,
              bottom: 1,
              height: 84,
              borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              background: 'linear-gradient(to bottom, transparent, var(--bg-base))',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {transborda && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          style={{
            marginTop: 8,
            font: 'inherit',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 11px',
            cursor: 'pointer',
          }}
        >
          {aberto ? 'Mostrar menos' : 'Ver o conteúdo inteiro'}
        </button>
      )}
    </div>
  )
}


function extractPath(diff: string): string | null {
  const plus = diff.match(/^\+\+\+\s+b\/(.+)$/m)
  if (plus) return plus[1].trim()
  const minus = diff.match(/^---\s+a\/(.+)$/m)
  if (minus) return minus[1].trim()
  return null
}




function PlanBody({ approval }: { approval: MockApproval }) {
  const { passos, orcamento } = parsePlanoMarkdown(approval.diff ?? '')

  if (passos.length === 0) {
    return (
      <pre
        style={{
          margin: 0,
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          fontSize: 12.5,
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {approval.diff ?? ''}
      </pre>
    )
  }

  return (
    <div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {passos.map((p) => (
          <li
            key={p.ordinal}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: '11px 14px',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-elevated)',
            }}
          >
            {}
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: 7,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: '#08110f',
                background: 'linear-gradient(135deg, var(--wave-from), var(--wave-to))',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {p.ordinal}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {p.role}
                </span>
                {p.depende_de.length > 0 && (
                  <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                    depende de {p.depende_de.join(', ')}
                  </span>
                )}
                {}
                {p.contratacao && (
                  <span
                    style={{
                      fontSize: 11.5,
                      color: p.contratacao === 'CONTRATA NOVO' ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                      fontWeight: p.contratacao === 'CONTRATA NOVO' ? 600 : 400,
                    }}
                  >
                    → {p.contratacao === 'CONTRATA NOVO' ? 'contrata novo' : p.contratacao}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, marginTop: 3, fontSize: 13.5, lineHeight: 1.45, color: 'var(--text-primary)' }}>
                {p.sub_objective}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {orcamento && (
        <p
          style={{
            margin: 0,
            marginTop: 12,
            fontSize: 12.5,
            color: 'var(--text-tertiary)',
          }}
        >
          Orçamento estimado: <span style={{ color: 'var(--text-secondary)' }}>{orcamento}</span>
        </p>
      )}
    </div>
  )
}




interface EditState {
  editing: boolean
  values: LaunchFields
  onChange: (patch: Partial<LaunchFields>) => void
  disabled: boolean
  gerando: boolean
  
  onGerarLia?: () => void
}

function ToolActionBody({ approval, edit }: { approval: MockApproval; edit?: EditState }) {
  const action = approval.action
  const [verDetalhes, setVerDetalhes] = useState(false)
  if (!action) return null
  const { principais, detalhes } = action

  
  const mostrarFrase = action.sentence.trim() !== approval.title.trim()
  const editando = !!edit?.editing
  const artifactId = approval.launchArgs?.artifactId
  
  const arteNome = principais.find((c) => c.label === 'Arte')?.valor

  return (
    <div>
      {mostrarFrase && (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--text-primary)' }}>
          {action.sentence}
        </p>
      )}

      {}
      {principais.length > 0 && (
        <CampoLista
          campos={principais}
          edit={
            editando && edit
              ? { values: edit.values, onChange: edit.onChange, disabled: edit.disabled, editableLabels: EDITAVEIS }
              : undefined
          }
        />
      )}

      {}
      {editando && edit?.onGerarLia && (
        <GerarLiaButton gerando={edit.gerando} disabled={edit.disabled} onClick={edit.onGerarLia} />
      )}

      {}
      {artifactId && <VerArte artifactId={artifactId} alt={arteNome ?? 'Arte do anúncio'} />}

      {}
      {detalhes.length > 0 && (
        <div style={{ marginTop: principais.length > 0 ? 10 : 14 }}>
          <button
            type="button"
            onClick={() => setVerDetalhes((v) => !v)}
            aria-expanded={verDetalhes}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-ui)',
              fontSize: 12.5,
              color: 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              padding: '2px 0',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden style={{ fontSize: 10 }}>{verDetalhes ? '▾' : '▸'}</span>
            {verDetalhes ? 'ocultar detalhes técnicos' : `ver detalhes técnicos (${detalhes.length})`}
          </button>
          {verDetalhes && <CampoLista campos={detalhes} muted />}
        </div>
      )}

      {}
      <AvisosRui avisos={approval.avisos} />
    </div>
  )
}




const AMBAR_AVISO = 'rgb(214 158 46)'


function AvisosRui({ avisos }: { avisos?: { tipo: string; texto: string }[] }) {
  if (!avisos || avisos.length === 0) return null
  return (
    <div
      role="note"
      style={{
        marginTop: 14,
        border: `1px solid rgb(214 158 46 / 0.28)`,
        borderRadius: 'var(--radius-md)',
        background: 'rgb(214 158 46 / 0.06)',
        padding: '11px 14px',
      }}
    >
      <p
        style={{
          margin: 0,
          marginBottom: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: '-0.005em',
          color: AMBAR_AVISO,
        }}
      >
        <span aria-hidden style={{ fontSize: 12 }}>⚠</span>
        O que o Rui observou
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {avisos.map((a, i) => (
          <li
            key={a.tipo + i}
            style={{
              display: 'flex',
              gap: 9,
              alignItems: 'flex-start',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}
          >
            <span
              aria-hidden
              style={{ flexShrink: 0, marginTop: 1, fontSize: 11, color: AMBAR_AVISO }}
            >
              ⚠
            </span>
            <span>{a.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}


interface CampoListaEdit {
  values: LaunchFields
  onChange: (patch: Partial<LaunchFields>) => void
  disabled: boolean
  editableLabels: Set<string>
}


function CampoLista({
  campos,
  muted,
  edit,
}: {
  campos: CampoHumano[]
  muted?: boolean
  edit?: CampoListaEdit
}) {
  return (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(88px, max-content) 1fr',
        columnGap: 16,
        rowGap: 0,
        margin: 0,
        marginTop: muted ? 8 : 14,
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        background: muted ? 'transparent' : 'var(--surface-elevated)',
        padding: '4px 14px',
      }}
    >
      {campos.map((c, i) => {
        const editavel = edit?.editableLabels.has(c.label) ?? false
        return (
          <FieldRow
            key={c.label + i}
            label={c.label}
            value={c.valor}
            divider={i > 0}
            muted={muted}
            edit={editavel ? edit : undefined}
          />
        )
      })}
    </dl>
  )
}

function FieldRow({
  label,
  value,
  divider,
  muted,
  edit,
}: {
  label: string
  value: string
  divider: boolean
  muted?: boolean
  
  edit?: CampoListaEdit
}) {
  const border = divider ? '1px solid var(--border-hairline)' : 'none'
  return (
    <>
      <dt
        style={{
          gridColumn: 1,
          padding: '9px 0',
          borderTop: border,
          fontSize: 12.5,
          color: 'var(--text-tertiary)',
          alignSelf: 'start',
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          gridColumn: 2,
          margin: 0,
          padding: '9px 0',
          borderTop: border,
          fontSize: 13,
          lineHeight: 1.45,
          color: muted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        }}
      >
        {edit ? <CampoEditavel label={label} edit={edit} /> : value}
      </dd>
    </>
  )
}


function CampoEditavel({ label, edit }: { label: string; edit: CampoListaEdit }) {
  const base: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-ui)',
    fontSize: 13,
    lineHeight: 1.45,
    color: 'var(--text-primary)',
    background: 'var(--surface)',
    border: '1px solid var(--border-hairline)',
    borderRadius: 'var(--radius-sm)',
    padding: '7px 10px',
    outline: 'none',
    margin: '2px 0',
    opacity: edit.disabled ? 0.6 : 1,
  }
  const v = edit.values

  if (label === LABEL_MENSAGEM) {
    return (
      <textarea
        aria-label={LABEL_MENSAGEM}
        value={v.message}
        disabled={edit.disabled}
        onChange={(e) => edit.onChange({ message: e.target.value })}
        rows={3}
        style={{ ...base, resize: 'vertical', minHeight: 60 }}
      />
    )
  }
  if (label === LABEL_BOTAO) {
    return (
      <select
        aria-label={LABEL_BOTAO}
        value={v.cta}
        disabled={edit.disabled}
        onChange={(e) => edit.onChange({ cta: e.target.value })}
        style={{ ...base, cursor: edit.disabled ? 'default' : 'pointer' }}
      >
        {[...CTAS_VALIDOS].map((c) => (
          <option key={c} value={c}>{rotuloCta(c)}</option>
        ))}
      </select>
    )
  }
  if (label === LABEL_LINK) {
    return (
      <input
        aria-label={LABEL_LINK}
        type="url"
        value={v.link}
        disabled={edit.disabled}
        onChange={(e) => edit.onChange({ link: e.target.value })}
        placeholder="https://"
        style={base}
      />
    )
  }
  
  return (
    <input
      aria-label={LABEL_HEADLINE}
      type="text"
      value={v.headline ?? ''}
      disabled={edit.disabled}
      onChange={(e) => edit.onChange({ headline: e.target.value })}
      style={base}
    />
  )
}




function VerArte({ artifactId, alt }: { artifactId: string; alt: string }) {
  const [aberto, setAberto] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function abrir() {
    
    if (url) {
      setAberto(true)
      return
    }
    if (carregando) return
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/url`)
      const data = (await res.json().catch(() => ({}))) as { url?: string }
      if (!res.ok || !data.url) {
        setErro('Não consegui carregar a arte.')
        return
      }
      setUrl(data.url)
      setAberto(true)
    } catch {
      setErro('Não consegui carregar a arte.')
    } finally {
      setCarregando(false)
    }
  }

  const linkStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-ui)',
    fontSize: 12.5,
    color: 'var(--text-tertiary)',
    background: 'transparent',
    border: 'none',
    padding: '2px 0',
    cursor: carregando ? 'default' : 'pointer',
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrir())}
        aria-expanded={aberto}
        disabled={carregando}
        style={linkStyle}
      >
        <span aria-hidden style={{ fontSize: 10 }}>{aberto ? '▾' : '▸'}</span>
        {carregando ? 'carregando…' : aberto ? 'ocultar arte' : 'ver arte'}
      </button>

      {erro && (
        <p role="alert" style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--reject)' }}>
          {erro}
        </p>
      )}

      {aberto && url && (
        <div
          style={{
            marginTop: 10,
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-elevated)',
            padding: 8,
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL efêmera (Storage privado); next/image não cabe */}
          <img
            src={url}
            alt={alt}
            style={{
              display: 'block',
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 'var(--radius-sm)',
            }}
          />
        </div>
      )}
    </div>
  )
}



function GerarLiaButton({
  gerando,
  disabled,
  onClick,
}: {
  gerando: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label="Gerar a copy com a Lia"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          background: 'transparent',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          padding: '7px 12px',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <SparkGlyph />
        {gerando ? 'gerando…' : 'gerar com a Lia'}
      </button>
    </div>
  )
}

function SparkGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5l1.4 3.7L13 6.6l-3.6 1.4L8 11.7 6.6 8 3 6.6l3.6-1.4L8 1.5z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M12.5 10.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6.6-1.5z" fill="currentColor" opacity="0.7" />
    </svg>
  )
}




function CorrecaoDePlano({
  disabled,
  onCorrigir,
  onCancelarObjetivo,
  onVoltar,
}: {
  disabled: boolean
  onCorrigir: (texto: string) => void
  onCancelarObjetivo: () => void
  onVoltar: () => void
}) {
  const [texto, setTexto] = useState('')
  const podeEnviar = temCorrecao(texto) && !disabled

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label
        htmlFor="correcao-do-plano"
        style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}
      >
        {CORRECAO_UI.titulo}
      </label>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        {CORRECAO_UI.ajuda}
      </p>
      <textarea
        id="correcao-do-plano"
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_CORRECAO))}
        maxLength={LIMITE_CORRECAO}
        rows={3}
        placeholder={CORRECAO_UI.placeholder}
        disabled={disabled}
        autoFocus
        style={{
          width: '100%',
          resize: 'vertical',
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface-raised, var(--surface))',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <DecisionButton kind="approve" disabled={!podeEnviar} onClick={() => onCorrigir(texto)}>
          {CORRECAO_UI.enviar}
        </DecisionButton>
        <DecisionButton kind="reject" disabled={disabled} onClick={onCancelarObjetivo}>
          <CrossGlyph />
          {CORRECAO_UI.cancelarObjetivo}
        </DecisionButton>
        <button
          type="button"
          onClick={onVoltar}
          disabled={disabled}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            color: 'var(--text-tertiary)',
            background: 'none',
            border: 'none',
            cursor: disabled ? 'default' : 'pointer',
            padding: '7px 4px',
          }}
        >
          {CORRECAO_UI.voltar}
        </button>
      </div>
    </div>
  )
}

function Controls({
  disabled,
  onVoice,
  onApprove,
  onReject,
  onEdit,
}: {
  disabled: boolean
  onVoice: () => void
  onApprove: () => void
  onReject: () => void
  
  onEdit?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <DecisionButton kind="approve" disabled={disabled} onClick={onApprove}>
        <CheckGlyph />
        Aprovar
      </DecisionButton>
      <DecisionButton kind="reject" disabled={disabled} onClick={onReject}>
        <CrossGlyph />
        Rejeitar
      </DecisionButton>

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          aria-label="Editar antes de aprovar"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '7px 12px',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <EditGlyph />
          Editar
        </button>
      )}

      <span style={{ flex: 1 }} />

      {}
      <button
        type="button"
        onClick={onVoice}
        disabled={disabled}
        aria-label="Aprovar por voz (com confirmação)"
        title="Aprovar por voz"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          background: 'transparent',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          padding: '7px 12px',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <MicGlyph />
        Aprovar por voz
      </button>
    </div>
  )
}


function DecisionButton({
  kind,
  disabled,
  onClick,
  children,
}: {
  kind: ApprovalDecision
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const token = kind === 'approve' ? 'var(--approve)' : 'var(--reject)'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1,
        color: token,
        background: `color-mix(in srgb, ${token} 13%, transparent)`,
        border: `1px solid color-mix(in srgb, ${token} 42%, transparent)`,
        borderRadius: 'var(--radius-sm)',
        padding: '8px 15px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
    >
      {children}
    </button>
  )
}



function Readback({
  sentence,
  reducedMotion,
  onConfirm,
  onCancel,
}: {
  sentence: string
  reducedMotion: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : springPreset}
      role="group"
      aria-label="Confirmação por voz"
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-elevated)',
        padding: '14px 16px',
        overflow: 'hidden',
      }}
    >
      {}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: 'linear-gradient(to bottom, var(--wave-from), var(--wave-to))',
          opacity: 0.8,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>
          <MicGlyph />
        </span>
        Nathan confirma
      </div>

      {}
      <p
        aria-live="polite"
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.45,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.01em',
        }}
      >
        “{sentence}”
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 14,
        }}
      >
        <DecisionButton kind="approve" disabled={false} onClick={onConfirm}>
          <CheckGlyph />
          Sim, confirmar
        </DecisionButton>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar confirmação por voz"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 15px',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  )
}




function linkClienteValido(link: string): boolean {
  const s = link.trim()
  if (!s) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}


function launchInicial(la?: MockApproval['launchArgs']): LaunchFields {
  const cta = (la?.cta ?? '').toUpperCase()
  return {
    message: la?.message ?? '',
    headline: la?.headline ?? '',
    cta: CTAS_VALIDOS.has(cta) ? cta : 'LEARN_MORE',
    link: la?.link ?? '',
  }
}


function normalizarCtaCliente(cta?: string): string | undefined {
  const c = (cta ?? '').trim().toUpperCase()
  return CTAS_VALIDOS.has(c) ? c : undefined
}


function LaunchEditControls({
  salvando,
  gerando,
  erro,
  onSave,
  onCancel,
}: {
  salvando: boolean
  gerando: boolean
  erro: string | null
  onSave: () => void
  onCancel: () => void
}) {
  const ocupado = salvando || gerando
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {erro && (
        <p
          role="alert"
          style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--reject)' }}
        >
          {erro}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <DecisionButton kind="approve" disabled={ocupado} onClick={onSave}>
          <CheckGlyph />
          {salvando ? 'Salvando…' : 'Salvar'}
        </DecisionButton>
        <button
          type="button"
          onClick={onCancel}
          disabled={ocupado}
          aria-label="Cancelar edição"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 15px',
            cursor: ocupado ? 'default' : 'pointer',
            opacity: ocupado ? 0.5 : 1,
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
