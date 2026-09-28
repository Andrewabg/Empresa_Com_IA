// src/server/custom/backoff.ts — PURO. Política de retry da fila de webhook (relógio injetado).
export const MAX_TENTATIVAS = 5

export interface ResultadoBackoff { dead: boolean; nextAttemptAt: string | null }

/** attempts = número da tentativa que ACABOU de falhar. */
export function proximaTentativa(attempts: number, agora: Date): ResultadoBackoff {
  if (attempts > MAX_TENTATIVAS) return { dead: true, nextAttemptAt: null }
  const minutos = Math.pow(2, attempts - 1) // 1,2,4,8,16
  const next = new Date(agora.getTime() + minutos * 60_000)
  return { dead: false, nextAttemptAt: next.toISOString() }
}
