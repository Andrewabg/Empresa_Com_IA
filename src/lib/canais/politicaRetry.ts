



import type { AcaoFalha } from './erroMeta'


export const RETRY_PADRAO_MS = 30_000


const PERMANENTES: ReadonlySet<AcaoFalha> = new Set<AcaoFalha>([
  'dead', 'exige_template', 'contato_inalcancavel', 'avisar_dono',
])

export type DecisaoRetry =
  | { tipo: 'dead'; motivo: string }
  | { tipo: 'requeue'; naoAntesIso: string; attempts: number; motivo: string }

export function decidirRetry(input: {
  
  acao?: AcaoFalha | null
  retryAfterMs?: number | null
  
  attempts: number
  maxAttempts: number
  agoraMs: number
}): DecisaoRetry {
  const { acao, retryAfterMs, attempts, maxAttempts, agoraMs } = input

  if (acao && PERMANENTES.has(acao)) {
    return { tipo: 'dead', motivo: `falha permanente no envio (${acao}) — re-tentar não resolve` }
  }
  if (attempts >= maxAttempts) {
    return { tipo: 'dead', motivo: 'processarConversa falhou repetidamente' }
  }

  const pedido = typeof retryAfterMs === 'number' && retryAfterMs > 0 ? retryAfterMs : null
  const espera = acao === 'backoff' && pedido !== null ? pedido : RETRY_PADRAO_MS
  return {
    tipo: 'requeue',
    naoAntesIso: new Date(agoraMs + espera).toISOString(),
    attempts,
    motivo: acao === 'backoff' ? `limite do provider — aguardando ${Math.round(espera / 1000)}s` : 'erro no processamento',
  }
}






export const ESPERA_PARADA_GERAL_MS = 5 * 60_000


export const TETO_PARADA_GERAL_MS = 24 * 60 * 60_000

export const MOTIVO_PARADA_GERAL = 'a conta da OpenAI não está respondendo; aguardando o dono resolver'
export const MOTIVO_PARADA_GERAL_LONGA = 'a conta da OpenAI seguiu sem responder por mais de um dia'


export function decidirParadaGeral(input: {
  
  idadeDoJobMs: number
  
  attempts: number
  agoraMs: number
}): DecisaoRetry {
  const { idadeDoJobMs, attempts, agoraMs } = input
  if (idadeDoJobMs > TETO_PARADA_GERAL_MS) {
    return { tipo: 'dead', motivo: MOTIVO_PARADA_GERAL_LONGA }
  }
  return {
    tipo: 'requeue',
    naoAntesIso: new Date(agoraMs + ESPERA_PARADA_GERAL_MS).toISOString(),
    attempts,
    motivo: MOTIVO_PARADA_GERAL,
  }
}
