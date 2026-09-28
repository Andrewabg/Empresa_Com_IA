'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CanalRow } from '@/data/canais'
import type { ConversaInboxRow } from '@/data/conversasExternas'
import type { MensagemExternaRow } from '@/data/mensagensExternas'
import type { ContatoRow } from '@/data/contatos'
import type { FerramentaView } from '@/lib/inbox/ferramentas'
import { useInboxRealtime } from './useInboxRealtime'
import { eventoTocaConversaAberta } from '@/lib/inbox/eventoDoRealtime'
import { ConversaList } from './parts/ConversaList'
import { Thread } from './parts/Thread'
import { FichaPanel } from './parts/FichaPanel'
import { BaseTab } from './parts/BaseTab'
import FerramentasTab from './parts/FerramentasTab'




export type ConversaInbox = ConversaInboxRow


export type MensagemInbox = MensagemExternaRow & { midiaUrl?: string }


export interface AcaoResultado {
  ok: boolean
  reason?: string
  
  detalhe?: string
  
  aviso?: string
}

export interface AgenteRef {
  id: string
  name: string
}


export interface AtendenteFerramentas {
  agentId: string
  agentName: string
  ferramentas: FerramentaView[]
}

const MODO_LABEL: Record<CanalRow['modo'], string> = {
  supervisionado: 'Supervisionado',
  autonomo: 'Autônomo',
}



export default function InboxClient({
  canais,
  initialConversas,
  initialTemMais,
  agentes,
  atendentes,
  composioConfigured,
  iconePorSlug,
  isDono,
}: {
  canais: CanalRow[]
  initialConversas: ConversaInbox[]
  initialTemMais: boolean
  agentes: AgenteRef[]
  atendentes: AtendenteFerramentas[]
  composioConfigured: boolean
  iconePorSlug: Record<string, string | undefined>
  
  isDono: boolean
}) {
  const router = useRouter()

  const [aba, setAba] = useState<'conversas' | 'base' | 'ferramentas'>('conversas')
  const [selecionadaId, setSelecionadaId] = useState<string | null>(
    initialConversas[0]?.id ?? null,
  )
  const [mensagens, setMensagens] = useState<MensagemInbox[]>([])
  const [contato, setContato] = useState<ContatoRow | null>(null)
  const [threadCarregando, setThreadCarregando] = useState(false)
  const [acaoBusy, setAcaoBusy] = useState(false)
  
  
  
  const [lidoAte, setLidoAte] = useState<Map<string, string>>(() => new Map())

  
  
  
  const [conversasNaTela, setConversasNaTela] = useState<ConversaInbox[]>(initialConversas)
  const selecionada = conversasNaTela.find((c) => c.id === selecionadaId)
    ?? initialConversas.find((c) => c.id === selecionadaId)
    ?? null
  const canalDaSelecionada = selecionada
    ? canais.find((k) => k.id === selecionada.canal_id)
    : undefined

  
  
  const selecionadaIdRef = useRef(selecionadaId)
  selecionadaIdRef.current = selecionadaId

  
  const carregarThread = useCallback(
    async (conversaId: string, opts?: { silencioso?: boolean }) => {
      if (!opts?.silencioso) setThreadCarregando(true)
      try {
        const res = await fetch(`/api/inbox/mensagens?conversa=${encodeURIComponent(conversaId)}`)
        const j = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          mensagens?: MensagemInbox[]
          contato?: ContatoRow | null
        }
        
        if (selecionadaIdRef.current !== conversaId) return
        if (j.ok && Array.isArray(j.mensagens)) {
          setMensagens(j.mensagens)
          setContato(j.contato ?? null)
        }
      } catch (err) {
        console.warn('[inbox] carregarThread falhou:', err)
      } finally {
        if (selecionadaIdRef.current === conversaId) setThreadCarregando(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!selecionadaId) {
      setMensagens([])
      setContato(null)
      return
    }
    void carregarThread(selecionadaId)
  }, [selecionadaId, carregarThread])

  
  
  const ultimaInDaSelecionada = selecionada?.ultima_msg_in_at ?? ''
  useEffect(() => {
    if (!selecionadaId) return
    setLidoAte((prev) => {
      if (prev.get(selecionadaId) === ultimaInDaSelecionada) return prev
      const next = new Map(prev)
      next.set(selecionadaId, ultimaInDaSelecionada)
      return next
    })
  }, [selecionadaId, ultimaInDaSelecionada])

  
  
  
  
  
  
  
  
  
  
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const threadSujaRef = useRef(false)
  const onRealtimeChange = useCallback((conversaId: string | null) => {
    if (eventoTocaConversaAberta(conversaId, selecionadaIdRef.current)) threadSujaRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      router.refresh()
      const id = selecionadaIdRef.current
      const recarregarThread = threadSujaRef.current
      threadSujaRef.current = false
      if (id && recarregarThread) void carregarThread(id, { silencioso: true })
    }, 500)
  }, [router, carregarThread])

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  const { online } = useInboxRealtime({ onChange: onRealtimeChange })

  
  const postAcao = useCallback(
    async (url: string, body: Record<string, unknown>): Promise<AcaoResultado> => {
      setAcaoBusy(true)
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const j = (await res.json().catch(() => ({}))) as {
          ok?: boolean; reason?: string; detalhe?: string; aviso?: string
        }
        
        
        const out: AcaoResultado = {
          ok: j.ok === true,
          ...(j.reason ? { reason: j.reason } : {}),
          ...(j.detalhe !== undefined ? { detalhe: j.detalhe } : {}),
          ...(j.aviso ? { aviso: j.aviso } : {}),
        }
        if (out.ok) {
          router.refresh()
          const id = selecionadaIdRef.current
          if (id) await carregarThread(id, { silencioso: true })
        }
        return out
      } catch {
        return { ok: false, reason: 'erro' }
      } finally {
        setAcaoBusy(false)
      }
    },
    [router, carregarThread],
  )

  const aprovarRascunho = useCallback(
    (mensagemId: string, texto: string) =>
      postAcao('/api/inbox/rascunho', { mensagemId, acao: 'aprovar', texto }),
    [postAcao],
  )
  const descartarRascunho = useCallback(
    (mensagemId: string) => postAcao('/api/inbox/rascunho', { mensagemId, acao: 'descartar' }),
    [postAcao],
  )
  const enviarMensagem = useCallback(
    (texto: string, storagePath?: string): Promise<AcaoResultado> => {
      const id = selecionadaIdRef.current
      if (!id) return Promise.resolve({ ok: false, reason: 'erro' })
      
      return postAcao('/api/inbox/enviar', { conversaId: id, texto, ...(storagePath ? { storagePath } : {}) })
    },
    [postAcao],
  )
  const acaoConversa = useCallback(
    (acao: 'assumir' | 'devolver' | 'fechar' | 'cancelar_followup'): Promise<AcaoResultado> => {
      const id = selecionadaIdRef.current
      if (!id) return Promise.resolve({ ok: false, reason: 'erro' })
      return postAcao('/api/inbox/conversa', { conversaId: id, acao })
    },
    [postAcao],
  )

  
  
  
  const excluirConversa = useCallback(async (): Promise<AcaoResultado> => {
    const id = selecionadaIdRef.current
    if (!id) return { ok: false, reason: 'erro' }
    setAcaoBusy(true)
    try {
      const res = await fetch('/api/inbox/conversa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversaId: id, acao: 'excluir' }),
      })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string }
      if (j.ok) {
        setConversasNaTela((prev) => prev.filter((c) => c.id !== id))
        if (selecionadaIdRef.current === id) setSelecionadaId(null)
        router.refresh()
        return { ok: true }
      }
      return { ok: false, ...(j.reason ? { reason: j.reason } : {}) }
    } catch {
      return { ok: false, reason: 'erro' }
    } finally {
      setAcaoBusy(false)
    }
  }, [router])

  
  if (canais.length === 0) {
    return (
      <div className="inbox-page" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            maxWidth: 460,
            textAlign: 'center',
            padding: '38px 34px',
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
            }}
          >
            Nenhum canal conectado ainda
          </h1>
          <p
            style={{
              margin: '10px 0 18px',
              fontSize: 13.5,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
            }}
          >
            Conecte o WhatsApp da empresa no /config e as conversas aparecem aqui.
          </p>
          <Link
            href="/config"
            style={{
              display: 'inline-block',
              padding: '7px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            Abrir configurações →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="inbox-page">
      {}
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Inbox
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          · Conversas com clientes nos canais da empresa
        </span>
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {canais.map((k) => (
            <span
              key={k.id}
              title={`${k.rotulo} — modo ${MODO_LABEL[k.modo].toLowerCase()}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 999,
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface)',
                fontSize: 11.5,
                color: 'var(--text-secondary)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: online ? 'var(--wave-from)' : 'var(--text-tertiary)',
                  flexShrink: 0,
                }}
              />
              {k.rotulo}
              <span style={{ color: 'var(--text-tertiary)' }}>· {MODO_LABEL[k.modo]}</span>
            </span>
          ))}
        </span>
      </div>

      {}
      <div
        style={{
          flex: '0 0 auto',
          display: 'inline-flex',
          gap: 2,
          padding: '3px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface-elevated)',
          alignSelf: 'flex-start',
        }}
      >
        {(['conversas', 'base', 'ferramentas'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setAba(t)}
            style={{
              padding: '5px 14px',
              borderRadius: 'calc(var(--radius-sm) - 2px)',
              border: 'none',
              background: aba === t ? 'var(--surface)' : 'transparent',
              color: aba === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontSize: 13,
              fontWeight: aba === t ? 500 : 400,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {{ conversas: 'Conversas', base: 'Base de conhecimento', ferramentas: 'Ferramentas' }[t]}
          </button>
        ))}
      </div>

      {aba === 'base' ? (
        <BaseTab canais={canais} agentes={agentes} />
      ) : aba === 'ferramentas' ? (
        <FerramentasTab
          atendentes={atendentes}
          composioConfigured={composioConfigured}
          iconePorSlug={iconePorSlug}
          apenasLeitura
        />
      ) : (
      <div className="inbox-grid">
        {}
        <ConversaList
          conversas={initialConversas}
          temMais={initialTemMais}
          onListaMudou={setConversasNaTela}
          canais={canais}
          agentes={agentes}
          selecionadaId={selecionadaId}
          lidoAte={lidoAte}
          onSelect={setSelecionadaId}
        />

        {}
        <Thread
          conversa={selecionada}
          canal={canalDaSelecionada}
          agentes={agentes}
          mensagens={mensagens}
          carregando={threadCarregando}
          onAprovar={aprovarRascunho}
          onDescartar={descartarRascunho}
          onEnviar={enviarMensagem}
        />

        {}
        <FichaPanel
          key={selecionada?.id ?? 'vazio'}
          conversa={selecionada}
          canal={canalDaSelecionada}
          agentes={agentes}
          contato={contato}
          busy={acaoBusy}
          onAcao={acaoConversa}
          onExcluir={excluirConversa}
          isDono={isDono}
        />
      </div>
      )}
    </div>
  )
}
