'use client'

import { useCallback, useRef, useState } from 'react'

export type ApprovalOutcome = 'ok' | 'needsConfig' | 'error'


export interface ResultadoDaAcao {
  desfecho: ApprovalOutcome
  
  mensagem?: string
}


export function classifyApprovalResponse(status: number, body: unknown): ApprovalOutcome {
  const b = (body ?? {}) as { ok?: unknown; needsConfig?: unknown }
  if (b.needsConfig === true) return 'needsConfig'
  if (status >= 200 && status < 300 && b.ok === true) return 'ok'
  return 'error'
}


export function mensagemDaResposta(body: unknown): string | undefined {
  const texto = (body as { error?: unknown } | null)?.error
  return typeof texto === 'string' && texto.trim().length > 0 ? texto : undefined
}


export function useApprovalAction() {
  const inFlight = useRef<Set<string>>(new Set())
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

  const run = useCallback(
    async (id: string, action: 'approve' | 'reject', correcao?: string): Promise<ResultadoDaAcao> => {
      if (inFlight.current.has(id)) return { desfecho: 'error' }
      inFlight.current.add(id)
      setBusyIds(new Set(inFlight.current))
      try {
        const res = await fetch('/api/approvals', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          
          body: JSON.stringify(correcao ? { id, action, correcao } : { id, action }),
        })
        let body: unknown = null
        try { body = await res.json() } catch {  }
        const desfecho = classifyApprovalResponse(res.status, body)
        return desfecho === 'error'
          ? { desfecho, mensagem: mensagemDaResposta(body) }
          : { desfecho }
      } catch {
        return { desfecho: 'error' }
      } finally {
        inFlight.current.delete(id)
        setBusyIds(new Set(inFlight.current))
      }
    },
    [],
  )

  return { run, busy: (id: string) => busyIds.has(id) }
}
