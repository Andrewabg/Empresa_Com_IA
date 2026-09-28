'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { agentName } from '@/lib/brain-nav'
import { useApprovalAction } from '@/app/aprovacoes/useApprovalAction'
import { COPY_FALHA_GENERICA, COPY_SO_DONO_DECIDE } from '@/lib/aprovacoes/falhaPermanente'
import {
  buildDecisionQueue,
  type ApprovalItem,
  type AtendimentoResumo,
  type DecisionItem,
  type TarefaFalhaItem,
} from '@/lib/decisionQueue'
import { GavetaDaTarefa, type AgenteNomeado } from '@/components/tarefas/GavetaDaTarefa'
import { COPY_TAREFAS } from '@/lib/tarefas/copy'
import type { ArvoreDaTarefa } from '@/lib/tarefas/linhaDoTempo'
import type { PrazoView } from '@/lib/juridico/prazosTipos'
import type { Urgencia } from '@/lib/juridico/prazosRadar'
import type { MockApproval } from '@/mock/types'
import { fatiaVisivel, rotuloRestantes, TETO_FILA_DE_DECISAO } from '@/lib/cockpit/verMais'

const KIND_LABEL: Record<MockApproval['kind'], string> = {
  brain_pr: 'Cérebro',
  tool_action: 'Ação',
  plan: 'Plano',
}


const COR_URGENCIA: Record<Urgencia, string> = {
  vencido: 'var(--reject)',
  critico: 'var(--reject)',
  atencao: 'rgb(214 158 46)',
  ok: 'var(--approve)',
}

function CheckGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3.5 9.5l3.5 3.5L14.5 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface DecisionQueueProps {
  approvals: ApprovalItem[]
  
  falhas?: TarefaFalhaItem[]
  
  elenco?: AgenteNomeado[]
  
  podeDecidir?: boolean
  atendimento: AtendimentoResumo | null
  prazos: PrazoView[]
  hoje: string
  
  canaisDesconectados?: number
  
  modoTeste?: boolean
  empty?: boolean
  
  fill?: boolean
}


export function DecisionQueue({
  approvals,
  falhas = [],
  elenco = [],
  podeDecidir = true,
  atendimento,
  prazos,
  hoje,
  canaisDesconectados = 0,
  modoTeste = false,
  empty = false,
  fill = false,
}: DecisionQueueProps) {
  const router = useRouter()
  const { run, busy } = useApprovalAction()
  
  
  const nomesDoElenco = useMemo(
    () => Object.fromEntries(elenco.map((a) => [a.id, a.nome])),
    [elenco],
  )
  
  
  const [caminho, setCaminho] = useState<ArvoreDaTarefa | null>(null)

  async function abrirCaminho(taskId: string) {
    try {
      const res = await fetch(`/api/tarefas/${taskId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('falhou')
      const body = (await res.json()) as { arvore: ArvoreDaTarefa | null }
      if (body.arvore) setCaminho(body.arvore)
      else router.push('/tarefas')
    } catch {
      router.push('/tarefas') 
    }
  }

  
  
  
  const [pendentes, setPendentes] = useState<ApprovalItem[]>(() => (empty ? [] : approvals))
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setItemErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    const { desfecho, mensagem } = await run(id, action)
    if (desfecho === 'ok') {
      setPendentes((prev) => prev.filter((a) => a.id !== id))
      return
    }
    if (desfecho === 'needsConfig') {
      router.push('/config')
      return
    }
    
    
    setItemErrors((prev) => ({ ...prev, [id]: mensagem ?? COPY_FALHA_GENERICA }))
  }

  const items: DecisionItem[] = buildDecisionQueue({
    approvals: pendentes,
    falhas: empty ? [] : falhas,
    atendimento: empty ? null : atendimento,
    prazos: empty ? [] : prazos,
    hoje,
  })
  
  
  
  
  
  const { visiveis, restantes } = fatiaVisivel(items, TETO_FILA_DE_DECISAO)
  const sobra = rotuloRestantes(restantes, ['item esperando', 'itens esperando'])

  return (
    <section
      id="precisa-de-voce"
      aria-label="Precisa de você"
      style={fill ? { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' } : undefined}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          flex: 'none',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Precisa de você
        </span>
        {pendentes.length > 0 && (
          <Link
            href="/aprovacoes"
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Ver todas
            <span aria-hidden>→</span>
          </Link>
        )}
      </header>

      {}
      {!empty && canaisDesconectados > 0 && (
        <Link
          href="/config"
          aria-label="Reconectar WhatsApp em Config › Canais"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgb(229 99 77 / 0.28)',
            background: 'rgb(229 99 77 / 0.08)',
            textDecoration: 'none',
            flex: 'none',
          }}
        >
          <span aria-hidden style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>⚠</span>
          <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-primary)' }}>
            <strong style={{ color: 'var(--reject)', fontWeight: 600 }}>
              {canaisDesconectados} {canaisDesconectados === 1 ? 'canal' : 'canais'} de WhatsApp sem conexão
            </strong>
            {' — o agente parou de responder nesse número.'}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--reject)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Reconectar ›
          </span>
        </Link>
      )}
      {!empty && modoTeste && (
        <p
          role="status"
          style={{
            margin: 0,
            marginBottom: 10,
            fontSize: 12,
            lineHeight: 1.5,
            color: 'rgb(214 158 46)',
            flex: 'none',
          }}
        >
          ⚠ Modo teste ativo em um canal — só responde números da lista de teste
        </p>
      )}

      {items.length === 0 ? (
        <div style={fill ? { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}>
          <EmptyState
            compact
            icon={<CheckGlyph />}
            headline="Tudo em ordem"
            sub="Nada esperando por você. O time avisa quando precisar."
          />
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,

          }}
        >
          {visiveis.map((item) => {
            if (item.kind === 'approval') {
              const a = item.approval
              const isBusy = busy(a.id)
              const err = itemErrors[a.id]
              return (
                <li key={`ap-${a.id}`}>
                  <div
                    className={cn(
                      'border border-[var(--border-hairline)] hover:border-white/15',
                      'transition-colors',
                    )}
                    style={{
                      background: 'var(--surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      padding: '13px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <Link
                        href="/aprovacoes"
                        style={{
                          textDecoration: 'none',
                          fontSize: 13.5,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          lineHeight: 1.4,
                          minWidth: 0,
                          flexGrow: 1,
                        }}
                      >
                        {a.title}
                      </Link>
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 10.5,
                          fontWeight: 500,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: 'var(--text-tertiary)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 7px',
                          marginTop: 1,
                        }}
                      >
                        {KIND_LABEL[a.kind]}
                      </span>
                    </div>
                    <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      Solicitado por {agentName(a.agent ?? 'jarvis', nomesDoElenco)}
                    </span>
                    {err && (
                      <p
                        role="alert"
                        style={{
                          margin: 0,
                          marginTop: 8,
                          padding: '6px 10px',
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-hairline)',
                          borderLeft: '2px solid var(--reject)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {err}
                      </p>
                    )}
                    {!podeDecidir ? (
                      <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                        {COPY_SO_DONO_DECIDE}
                      </p>
                    ) : (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        aria-label={`Aprovar: ${a.title}`}
                        onClick={() => void handleAction(a.id, 'approve')}
                        style={{
                          color: 'var(--approve)',
                          border: '1px solid color-mix(in srgb, var(--approve) 30%, transparent)',
                          opacity: isBusy ? 0.45 : 1,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={isBusy}
                        aria-label={`Rejeitar: ${a.title}`}
                        onClick={() => void handleAction(a.id, 'reject')}
                        style={{ opacity: isBusy ? 0.45 : 1, cursor: isBusy ? 'not-allowed' : 'pointer' }}
                      >
                        Rejeitar
                      </Button>
                    </div>
                    )}
                  </div>
                </li>
              )
            }

            if (item.kind === 'tarefa') {
              return (
                <li key={`tf-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => void abrirCaminho(item.id)}
                    className={cn(
                      'border border-[var(--border-hairline)] hover:border-white/15',
                      'transition-colors',
                    )}
                    style={{
                      display: 'flex',
                      width: '100%',
                      textAlign: 'left',
                      alignItems: 'flex-start',
                      gap: 10,
                      background: 'var(--surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      padding: '13px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--reject)', flexShrink: 0, marginTop: 5 }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {item.objetivo}
                      </span>
                      <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {item.agente} · {COPY_TAREFAS.falhouNoCockpit}
                      </span>
                    </span>
                  </button>
                </li>
              )
            }

            if (item.kind === 'atendimento') {
              return (
                <li key="atendimento">
                  <Link
                    href={item.href}
                    className={cn(
                      'border border-[var(--border-hairline)] hover:border-white/15',
                      'transition-colors',
                    )}
                    style={{
                      display: 'block',
                      background: 'var(--surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      padding: '13px 14px',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {item.label}
                    </span>
                    <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      Atendimento · abrir inbox →
                    </span>
                  </Link>
                </li>
              )
            }

            
            return (
              <li key={`pz-${item.id}`}>
                <Link
                  href={item.href}
                  className={cn(
                    'border border-[var(--border-hairline)] hover:border-white/15',
                    'transition-colors',
                  )}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    background: 'var(--surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    padding: '13px 14px',
                    textDecoration: 'none',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: COR_URGENCIA[item.urgencia],
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.titulo}
                    </span>
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      Prazo · {item.linha} · abrir jurídico →
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {}
      {sobra && (
        <Link href="/aprovacoes" className="cc-vermais cc-vermais--link">
          {sobra}
          <span aria-hidden>→</span>
        </Link>
      )}
      {caminho && (
        <GavetaDaTarefa
          arvore={caminho}
          agentes={elenco}
          ehDono={false}
          aoFechar={() => setCaminho(null)}
        />
      )}
    </section>
  )
}
