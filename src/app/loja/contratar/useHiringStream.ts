'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import { readSseParts, type ChatMessage, type ChatStatus } from '../../conversa/useChatStream'
import {
  HIRING_SESSION_DATA_TYPE,
  HIRING_TOOLKIT_DATA_TYPE,
  HIRING_CANDIDATO_DATA_TYPE,
  type ToolkitCardData,
  type CandidatoCardData,
} from '@/server/agent/wireTypes'

import type { FerramentaBrief } from '@/lib/hiring/brief'
import { upsertToolkit } from '@/lib/hiring/toolkit-upsert'

export type HiringDecisao = 'pendente' | 'dispensado' | 'aguardando_conexao'

interface UseHiringStreamArgs {
  
  initialSessionId: string | null
  
  initialMessages: ChatMessage[]
  
  initialToolkits: ToolkitCardData[]
  
  initialCandidato: CandidatoCardData | null
  
  revisaoAgentId?: string | null
  
  onNeedsConfig: () => void
}

interface UseHiringStreamResult {
  messages: ChatMessage[]
  status: ChatStatus
  streamingId: string | null
  error: string | null
  sessionId: string | null
  toolkits: ToolkitCardData[]
  candidato: CandidatoCardData | null
  send: (userText: string) => void
  kickoff: () => void
  
  recomecar: () => void
  
  decidirFerramenta: (slug: string, decisao: HiringDecisao) => Promise<{ ok: boolean; error?: string }>
  
  marcarConectada: (slug: string) => void
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const CALM_ERROR =
  'Não consegui responder agora — pode ter sido uma instabilidade do modelo. ' +
  'Seu texto continua aqui; tente enviar de novo em instantes.'

export function useHiringStream({
  initialSessionId,
  initialMessages,
  initialToolkits,
  initialCandidato,
  revisaoAgentId,
  onNeedsConfig,
}: UseHiringStreamArgs): UseHiringStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId)
  const [toolkits, setToolkits] = useState<ToolkitCardData[]>(initialToolkits)
  const [candidato, setCandidato] = useState<CandidatoCardData | null>(initialCandidato)

  
  
  const sessionIdRef = useRef<string | null>(initialSessionId)
  const inFlightRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const finishedRef = useRef(false)

  useEffect(() => () => { abortRef.current?.abort() }, [])

  const run = useCallback(
    (opts: { userText?: string; kickoff?: boolean; recomecar?: boolean }) => {
      const kickoff = opts.kickoff === true
      const recomecar = opts.recomecar === true
      const text = (opts.userText ?? '').trim()
      if ((!kickoff && !text) || inFlightRef.current) return
      inFlightRef.current = true
      finishedRef.current = false
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      
      
      if (recomecar) {
        sessionIdRef.current = null
        setSessionId(null)
        setToolkits([])
        setCandidato(null)
      }

      const userMsg: ChatMessage | null = kickoff
        ? null
        : { id: makeId('u'), role: 'user', content: text }
      const assistantId = makeId('a')
      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '' }

      const optimistic = userMsg ? [userMsg, assistantMsg] : [assistantMsg]
      setMessages((prev) => (recomecar ? optimistic : [...prev, ...optimistic]))
      setStatus('streaming')
      setStreamingId(assistantId)
      setError(null)

      const appendDelta = (delta: string) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
        )
      }

      const finish = (errored: boolean) => {
        if (finishedRef.current) return
        finishedRef.current = true
        inFlightRef.current = false
        setStreamingId(null)
        setStatus(errored ? 'error' : 'idle')
        if (errored) setError(CALM_ERROR)
      }

      ;(async () => {
        try {
          const sid = recomecar ? null : sessionIdRef.current
          const res = await fetch('/api/loja/contratar/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(sid ? { sessionId: sid } : {}),
              
              
              
              ...(!sid && revisaoAgentId ? { agent: revisaoAgentId } : {}),
              ...(kickoff ? { kickoff: true } : { userText: text }),
              ...(recomecar ? { recomecar: true } : {}),
            }),
            signal: controller.signal,
          })

          
          const contentType = res.headers.get('content-type') ?? ''
          if (contentType.includes('application/json')) {
            const json = (await res.json().catch(() => null)) as { needsConfig?: boolean } | null
            if (json?.needsConfig) {
              
              setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg?.id))
              finishedRef.current = true
              inFlightRef.current = false
              setStreamingId(null)
              setStatus('idle')
              onNeedsConfig()
              return
            }
            
            finish(true)
            return
          }

          if (!res.ok || !res.body) {
            finish(true)
            return
          }

          await readSseParts(res.body, (part) => {
            const type = part.type as string | undefined
            if (type === 'text-delta') {
              const delta = part.delta
              if (typeof delta === 'string' && delta) appendDelta(delta)
            } else if (type === HIRING_SESSION_DATA_TYPE) {
              const id = (part.data as { id?: string } | undefined)?.id
              if (typeof id === 'string' && id) {
                sessionIdRef.current = id
                setSessionId(id)
              }
            } else if (type === HIRING_TOOLKIT_DATA_TYPE) {
              const toolkit = (part.data as { toolkit?: ToolkitCardData } | undefined)?.toolkit
              if (toolkit?.slug) setToolkits((prev) => upsertToolkit(prev, toolkit))
            } else if (type === HIRING_CANDIDATO_DATA_TYPE) {
              const cand = (part.data as { candidato?: CandidatoCardData } | undefined)?.candidato
              if (cand) setCandidato(cand)
            } else if (type === 'error') {
              
              finish(true)
            }
            
          })

          if (inFlightRef.current) finish(false)
        } catch (e) {
          
          if (e instanceof DOMException && e.name === 'AbortError') {
            finishedRef.current = true
            inFlightRef.current = false
            setStreamingId(null)
            setStatus('idle')
            return
          }
          finish(true)
        }
      })()
    },
    [onNeedsConfig, revisaoAgentId],
  )

  const send = useCallback((userText: string) => run({ userText }), [run])
  const kickoff = useCallback(() => run({ kickoff: true }), [run])
  const recomecar = useCallback(() => run({ kickoff: true, recomecar: true }), [run])

  const decidirFerramenta = useCallback(
    async (slug: string, decisao: HiringDecisao): Promise<{ ok: boolean; error?: string }> => {
      const sid = sessionIdRef.current
      if (!sid) return { ok: false, error: 'a entrevista ainda não começou' }
      try {
        const res = await fetch('/api/loja/contratar/ferramenta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid, slug, decisao }),
        })
        const j = (await res.json().catch(() => null)) as
          | { ok?: boolean; ferramentas?: FerramentaBrief[]; error?: string }
          | null
        if (!res.ok || !j?.ok) return { ok: false, error: j?.error ?? `HTTP ${res.status}` }
        
        if (Array.isArray(j.ferramentas)) {
          setToolkits((prev) => {
            let next = prev
            for (const f of j.ferramentas!) {
              next = upsertToolkit(next, { slug: f.slug, name: f.name, status: f.status, validado: true })
            }
            return next
          })
        }
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'falha de rede' }
      }
    },
    [],
  )

  const marcarConectada = useCallback((slug: string) => {
    setToolkits((prev) =>
      prev.map((t) => (t.slug === slug ? { ...t, status: 'conectada' as const } : t)),
    )
  }, [])

  return {
    messages,
    status,
    streamingId,
    error,
    sessionId,
    toolkits,
    candidato,
    send,
    kickoff,
    recomecar,
    decidirFerramenta,
    marcarConectada,
  }
}
