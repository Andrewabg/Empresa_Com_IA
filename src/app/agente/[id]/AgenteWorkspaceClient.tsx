'use client'


import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useReducedMotion } from '@/lib/motion'
import { tituloDoObjetivo } from '@/lib/tarefas/tituloDoObjetivo'
import { useChatStream, type ChatMessage } from '../../conversa/useChatStream'
import { HistoryDrawer } from '../../conversa/HistoryDrawer'
import { ControlesDaSala } from '@/components/conversa/ControlesDaSala'
import type { ThreadItem } from '@/lib/conversas/thread'
import { SecondaryTranscript } from '../../conversa/ConversaClient'
import { KIND_LABEL } from '../../conversa/artifactKinds'
import { relativeTime } from '@/components/cards/LiveFeedItem'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import type { TaskListRow, TaskStatus } from '@/data/tasks'
import type { ArtifactKind } from '@/lib/artifacts'
import type { ApprovalKind } from '@/data/approvals'
import { AVISO_QUEM_CONECTA_E_O_DONO, ROTULO_O_DONO_CONECTA } from '@/lib/agentes/somenteDono'



export interface EntregaView {
  id: string
  kind: ArtifactKind
  title: string
  created_at: string
}

export interface AprovacaoView {
  id: string
  kind: ApprovalKind
  title: string | null
}

export interface IntegracaoView {
  slug: string
  name: string
  connected: boolean
  required: boolean
}


interface IntegracaoLocal extends IntegracaoView {
  ligada: boolean
}

export interface DiretrizView {
  texto: string
  origem: 'operador' | 'reflector'
  at: string
}

interface AgenteWorkspaceClientProps {
  agentId: string
  nome: string
  papel: string
  
  missao: string
  
  ferias: boolean
  gestorNome: string | null
  initialMessages: ChatMessage[]
  initialConversationId: string | null
  
  initialThreads: ThreadItem[]
  tarefas: TaskListRow[]
  entregas: EntregaView[]
  aprovacoes: AprovacaoView[]
  integracoes: IntegracaoView[]
  composioConfigured: boolean
  diretrizes: DiretrizView[]
  
  isDono: boolean
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  queued: 'Na fila',
  running: 'Trabalhando',
  needs_approval: 'Aguardando aprovação',
  needs_children: 'Planejando',
  done: 'Concluída',
  failed: 'Falhou',
  cancelled: 'Cancelada',
}

const APROVACAO_LABEL: Record<ApprovalKind, string> = {
  brain_pr: 'Mudança no cérebro',
  tool_action: 'Ação de risco',
  plan: 'Plano de orquestração',
  directive: 'Nova diretriz',
  custom_tool: 'Tool personalizada',
}


const AMBAR = 'rgb(214 158 46)'

export function AgenteWorkspaceClient({
  agentId,
  nome,
  papel,
  missao,
  ferias,
  gestorNome,
  initialMessages,
  initialConversationId,
  initialThreads,
  tarefas,
  entregas,
  aprovacoes,
  integracoes: integracoesProp,
  composioConfigured,
  diretrizes: diretrizesProp,
  isDono,
}: AgenteWorkspaceClientProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion() ?? false

  const onNeedsConfig = useCallback(() => router.push('/config'), [router])
  
  
  const [conversationId, setConversationId] = useState(initialConversationId)
  const [historyOpen, setHistoryOpen] = useState(false)
  const chat = useChatStream({
    initialMessages,
    initialConversationId,
    onNeedsConfig,
    onConversationId: setConversationId,
    agentId,
  })

  
  
  
  const { startFresh } = chat
  const onNovaConversa = useCallback(() => {
    startFresh()
    setConversationId(null)
    setHistoryOpen(false)
  }, [startFresh])

  
  const onSelectThread = useCallback((id: string) => {
    setHistoryOpen(false)
    router.push(`/agente/${encodeURIComponent(agentId)}?c=${id}`)
  }, [router, agentId])

  
  const now = useMemo(() => Date.now(), [])

  
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const streaming = chat.status === 'streaming'
  
  
  const { send: chatSend } = chat

  
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 120)}px`
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden'
  }, [draft])

  const onSend = useCallback(() => {
    const text = draft.trim()
    if (!text || streaming || ferias) return
    chatSend(text)
    setDraft('')
  }, [draft, streaming, ferias, chatSend])

  
  const lastContent = chat.messages.length ? chat.messages[chat.messages.length - 1].content : ''
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [chat.messages.length, lastContent, reducedMotion])

  const podeEnviar = draft.trim().length > 0 && !streaming && !ferias

  
  
  
  const emptyTitle = `Converse com ${nome}`
  const missaoLimpa = missao.trim().replace(/[.!]+$/, '')
  const emptyHint = missaoLimpa
    ? `${missaoLimpa.charAt(0).toLowerCase()}${missaoLimpa.slice(1)}. É por aqui que você pede o trabalho dele.`
    : 'É por aqui que você conversa e pede o trabalho dele.'

  
  
  
  
  const [integracoes, setIntegracoes] = useState<IntegracaoLocal[]>(() =>
    integracoesProp.map((i) => ({ ...i, ligada: true })),
  )
  
  const [integInFlight, setIntegInFlight] = useState<string | null>(null)
  const [integConfirm, setIntegConfirm] = useState<string | null>(null)
  const [integErro, setIntegErro] = useState<string | null>(null)

  
  
  const toggleIntegracao = useCallback(
    async (slug: string, ligada: boolean) => {
      setIntegConfirm(null)
      setIntegErro(null)
      const anterior = integracoes
      const proximo = anterior.map((i) => (i.slug === slug ? { ...i, ligada } : i))
      setIntegracoes(proximo) 
      setIntegInFlight(slug)

      const ligadas = proximo.filter((i) => i.ligada)
      const composio_toolkits = ligadas.map((i) => i.slug)
      const required_toolkits = ligadas.filter((i) => i.required).map((i) => i.slug)

      try {
        const res = await fetch(
          `/api/agents/${encodeURIComponent(agentId)}/integracoes`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ composio_toolkits, required_toolkits }),
          },
        )
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; tools?: { composio_toolkits?: string[] } }
          | null
        
        const efetivas = data?.tools?.composio_toolkits
        if (Array.isArray(efetivas)) {
          const set = new Set(efetivas)
          setIntegracoes((cur) => cur.map((i) => ({ ...i, ligada: set.has(i.slug) })))
        }
      } catch {
        setIntegracoes(anterior) 
        setIntegErro('Não deu pra atualizar. Tente de novo.')
      } finally {
        setIntegInFlight(null)
      }
    },
    [agentId, integracoes],
  )

  
  
  
  const [diretrizes, setDiretrizes] = useState<DiretrizView[]>(diretrizesProp)
  const [novaDiretriz, setNovaDiretriz] = useState('')
  const [diretrizSalvando, setDiretrizSalvando] = useState(false)
  const [diretrizErro, setDiretrizErro] = useState(false)
  
  
  const [diretrizNota, setDiretrizNota] = useState<string | null>(null)

  const ensinarDiretriz = useCallback(async () => {
    const t = novaDiretriz.trim()
    if (!t || diretrizSalvando) return
    const anterior = diretrizes
    const antesLen = anterior.length
    const next: DiretrizView[] = [
      ...diretrizes,
      { texto: t, origem: 'operador', at: new Date().toISOString() },
    ]
    setDiretrizes(next) 
    setNovaDiretriz('')
    setDiretrizSalvando(true)
    setDiretrizErro(false)
    setDiretrizNota(null)
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/directives`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diretrizes: next.map((d) => ({ texto: d.texto, origem: d.origem, at: d.at })),
        }),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const json = (await res.json().catch(() => null)) as { diretrizes?: DiretrizView[] } | null
      
      const consolidada = Array.isArray(json?.diretrizes) ? json!.diretrizes : next
      setDiretrizes(consolidada)
      
      
      
      
      if (consolidada.length <= antesLen) {
        const entrou = consolidada.some((d) => d.texto.trim() === t)
        setDiretrizNota(
          entrou
            ? 'Chegou no limite de aprendizados — a mais antiga deu lugar a esta.'
            : 'Isso já estava combinado — nada a acrescentar.',
        )
      }
    } catch {
      setDiretrizes(anterior) 
      setDiretrizErro(true)
    } finally {
      setDiretrizSalvando(false)
    }
  }, [agentId, diretrizes, novaDiretriz, diretrizSalvando])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {}
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: 'clamp(16px, 2.5vw, 24px) clamp(18px, 3vw, 30px)',
          borderBottom: '1px solid var(--border-hairline)',
        }}
      >
        <AgentWaveAvatar agentId={agentId} size={64} lit={!ferias} />

        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(19px, 2.2vw, 23px)',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
              {nome}
            </h1>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{papel}</span>
            {ferias && (
              <span
                style={{
                  padding: '2px 9px',
                  borderRadius: 99,
                  border: '1px solid var(--border-hairline)',
                  background: 'rgb(255 255 255 / 0.04)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                }}
              >
                De férias
              </span>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={missao}
          >
            {missao}
          </p>
          {gestorNome && (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Reporta a {gestorNome}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ControlesDaSala
            onHistorico={() => setHistoryOpen(true)}
            onNova={onNovaConversa}
            tituloNova={`Começar uma frente nova com ${nome} (as tarefas e entregas de antes continuam aqui)`}
          />
          {isDono && <Link
            href={`/loja/contratar?agent=${encodeURIComponent(agentId)}`}
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface)',
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Ajustar agente
          </Link>}
          <Link
            href={`/conversa?agent=${encodeURIComponent(agentId)}`}
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface)',
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Conversa completa →
          </Link>
        </div>
      </header>

      {}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>
        {}
        <div
          style={{
            flex: '1.4 1 0%',
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border-hairline)',
          }}
        >
          <SecondaryTranscript
            ref={scrollRef}
            messages={chat.messages}
            streamingId={chat.streamingId}
            isEmpty={chat.messages.length === 0}
            error={chat.error}
            reducedMotion={reducedMotion}
            agentName={nome}
            emptyTitle={emptyTitle}
            emptyHint={emptyHint}
          />

          <div
            style={{
              flexShrink: 0,
              padding: 'clamp(12px, 2vw, 18px) clamp(14px, 2.5vw, 20px) clamp(14px, 2.5vw, 20px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px 8px 8px 14px',
                opacity: ferias ? 0.65 : 1,
              }}
            >
              <label htmlFor={inputId} style={SR_ONLY}>
                Mensagem para {nome}
              </label>
              <textarea
                id={inputId}
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSend()
                  }
                }}
                rows={1}
                disabled={ferias}
                placeholder={
                  ferias
                    ? `${nome} está de férias — reative na página Agentes pra conversar.`
                    : `Mensagem ao ${nome}…`
                }
                style={{
                  flex: 1,
                  resize: 'none',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  minHeight: 44,
                  maxHeight: 120,
                  padding: '10px 0',
                  boxSizing: 'border-box',
                  overflowY: 'hidden',
                }}
              />
              <button
                type="button"
                onClick={onSend}
                disabled={!podeEnviar}
                aria-label="Enviar mensagem"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  background: podeEnviar ? 'var(--text-primary)' : 'var(--surface-elevated)',
                  color: podeEnviar ? 'var(--bg-base)' : 'var(--text-tertiary)',
                  cursor: podeEnviar ? 'pointer' : 'default',
                  transition: 'background 120ms ease, color 120ms ease',
                }}
              >
                <SendGlyph />
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              {ferias ? 'O chat volta quando o agente for reativado.' : 'Enter para enviar'}
            </p>
          </div>
        </div>

        {}
        <div
          className="awave-scroll-fantasma"
          style={{
            width: 'min(400px, 38%)',
            flexShrink: 0,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            padding: 'clamp(16px, 2.5vw, 24px) clamp(16px, 2.5vw, 22px) clamp(20px, 3vw, 28px)',
            background: 'linear-gradient(to right, rgb(255 255 255 / 0.012), transparent)',
          }}
        >
          {}
          <Bloco titulo="Trabalho">
            {tarefas.length === 0 ? (
              <Vazio>Sem tarefas por enquanto.</Vazio>
            ) : (
              tarefas.map((t) => (
                <div
                  key={t.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
                >
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={t.objective}
                  >
                    {tituloDoObjetivo(t.objective)}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      padding: '2px 8px',
                      borderRadius: 99,
                      border: '1px solid var(--border-hairline)',
                      background: 'var(--surface-elevated)',
                      fontSize: 10.5,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      color: t.status === 'failed' ? 'var(--reject)' : 'var(--text-tertiary)',
                    }}
                  >
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>
              ))
            )}
          </Bloco>

          {}
          <Bloco titulo="Entregas">
            {entregas.length === 0 ? (
              <Vazio>Nada entregue ainda — a primeira entrega aparece aqui.</Vazio>
            ) : (
              entregas.map((e) => (
                <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={e.title}
                  >
                    {e.title}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                    {KIND_LABEL[e.kind]} · {relativeTime(new Date(e.created_at).getTime(), now)}
                  </span>
                </div>
              ))
            )}
          </Bloco>

          {}
          <Bloco titulo="Aprovações">
            {aprovacoes.length === 0 ? (
              <Vazio>Nada esperando você.</Vazio>
            ) : (
              <>
                {aprovacoes.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <span
                      aria-hidden
                      style={{ width: 6, height: 6, borderRadius: '50%', background: AMBAR, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={a.title ?? APROVACAO_LABEL[a.kind]}
                    >
                      {a.title ?? APROVACAO_LABEL[a.kind]}
                    </span>
                  </div>
                ))}
                <Link
                  href="/aprovacoes"
                  style={{ fontSize: 12.5, color: AMBAR, textDecoration: 'none', fontWeight: 500 }}
                >
                  Ver em Aprovações →
                </Link>
              </>
            )}
          </Bloco>

          {}
          <Bloco titulo="Integrações">
            {integracoes.length === 0 ? (
              <Vazio>Sem integrações.</Vazio>
            ) : (
              <>
                {!composioConfigured && !isDono && (
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                    {AVISO_QUEM_CONECTA_E_O_DONO}
                  </p>
                )}
                {!composioConfigured && isDono && (
                  <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                    Configure sua chave Composio em{' '}
                    <Link href="/config" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
                      Configurações
                    </Link>{' '}
                    pra ativar as ferramentas.
                  </p>
                )}
                {integErro && (
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--reject)' }}>
                    {integErro}
                  </p>
                )}
                {integracoes.map((i) => {
                  const bloqueada = integInFlight === i.slug
                  
                  
                  
                  const travado = integInFlight !== null
                  const confirmando = integConfirm === i.slug
                  return (
                    <div
                      key={i.slug}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        minWidth: 0,
                        opacity: i.ligada ? (bloqueada ? 0.5 : 1) : 0.45,
                        transition: 'opacity 120ms ease',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background:
                            i.ligada && i.connected
                              ? 'linear-gradient(135deg, var(--wave-from), var(--wave-to))'
                              : 'transparent',
                          border: i.ligada && i.connected ? 'none' : '1px solid var(--text-tertiary)',
                          boxShadow: i.ligada && i.connected ? '0 0 6px rgb(40 224 200 / 0.4)' : 'none',
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {i.name}
                        {i.ligada && i.required && !i.connected && (
                          <span style={{ marginLeft: 7, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                            necessária
                          </span>
                        )}
                        {!i.ligada && (
                          <span style={{ marginLeft: 7, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                            desligada
                          </span>
                        )}
                      </span>

                      {}
                      {!i.ligada ? (
                        <button
                          type="button"
                          onClick={() => toggleIntegracao(i.slug, true)}
                          disabled={travado}
                          style={ACAO_INTEG}
                        >
                          Religar
                        </button>
                      ) : confirmando ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => toggleIntegracao(i.slug, false)}
                            disabled={travado}
                            style={{ ...ACAO_INTEG, color: 'var(--reject)', borderBottomColor: 'var(--reject)' }}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setIntegConfirm(null)}
                            disabled={travado}
                            style={{ ...ACAO_INTEG, borderBottomColor: 'transparent', color: 'var(--text-tertiary)' }}
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <>
                          {!i.connected && !isDono && (
                            <span title={AVISO_QUEM_CONECTA_E_O_DONO} style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-tertiary)' }}>
                              {ROTULO_O_DONO_CONECTA}
                            </span>
                          )}
                          {!i.connected && isDono && (
                            <Link
                              href="/config"
                              style={{
                                flexShrink: 0,
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                textDecoration: 'none',
                                borderBottom: '1px solid var(--border-hairline)',
                              }}
                            >
                              Conectar
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setIntegConfirm(i.slug)}
                            disabled={travado}
                            style={{ ...ACAO_INTEG, borderBottomColor: 'transparent', color: 'var(--text-tertiary)' }}
                          >
                            Desligar
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </>
            )}
            {isDono && <Link
              href="/integracoes"
              style={{
                marginTop: 2,
                fontSize: 12,
                color: 'var(--text-tertiary)',
                textDecoration: 'none',
              }}
            >
              Ver todas as integrações →
            </Link>}
          </Bloco>

          {}
          <Bloco titulo="Aprendizado">
            {diretrizes.length === 0 ? (
              <Vazio>Ainda aprendendo com você.</Vazio>
            ) : (
              diretrizes.map((d, idx) => (
                <div key={`${d.at}-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{d.texto}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {d.origem === 'operador' ? 'ensinada por você' : 'aprendida no trabalho'} ·{' '}
                    {relativeTime(new Date(d.at).getTime(), now)}
                  </span>
                </div>
              ))
            )}

            {}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <input
                type="text"
                value={novaDiretriz}
                onChange={(e) => setNovaDiretriz(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void ensinarDiretriz()
                  }
                }}
                placeholder={`Ensine algo a ${nome}… (ex.: sempre confirme o CNPJ antes de cobrar)`}
                aria-label={`Ensinar algo a ${nome}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13,
                  lineHeight: 1.4,
                  padding: '8px 11px',
                }}
              />
              <button
                type="button"
                onClick={() => void ensinarDiretriz()}
                disabled={diretrizSalvando || novaDiretriz.trim().length === 0}
                style={{
                  flexShrink: 0,
                  padding: '8px 13px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  background:
                    !diretrizSalvando && novaDiretriz.trim().length > 0
                      ? 'var(--text-primary)'
                      : 'var(--surface-elevated)',
                  color:
                    !diretrizSalvando && novaDiretriz.trim().length > 0
                      ? 'var(--bg-base)'
                      : 'var(--text-tertiary)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  cursor:
                    !diretrizSalvando && novaDiretriz.trim().length > 0 ? 'pointer' : 'default',
                  transition: 'background 120ms ease, color 120ms ease',
                }}
              >
                Ensinar
              </button>
            </div>
            {diretrizErro && (
              <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--reject)' }}>
                Não deu pra ensinar. Tente de novo.
              </p>
            )}
            {!diretrizErro && diretrizNota && (
              <p role="status" style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                {diretrizNota}
              </p>
            )}
          </Bloco>
        </div>
      </div>

      {}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        agentId={agentId}
        activeConversationId={conversationId}
        initialThreads={initialThreads}
        onNova={onNovaConversa}
        onSelect={onSelectThread}
      />
    </div>
  )
}




function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {titulo}
      </h2>
      <div
        style={{
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
          padding: '13px 15px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {children}
      </div>
    </section>
  )
}


function Vazio({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{children}</p>
}

function SendGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 8h9M7.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}


const ACAO_INTEG: React.CSSProperties = {
  flexShrink: 0,
  padding: 0,
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--border-hairline)',
  fontSize: 12,
  fontFamily: 'inherit',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
}

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
}
