
import {
  orcamentoDeEspera,
  TIMEOUT_MAX_MS,
  type ControleDePrazo,
  type PrazoDoTurno,
} from '../../lib/conversa/orcamentoDeEspera'

export { orcamentoDeEspera, TIMEOUT_MAX_MS }
export type { ControleDePrazo, PrazoDoTurno }


export const INATIVIDADE_MS_PADRAO = 120_000

export const INATIVIDADE_TOOL_MS_PADRAO = 300_000

export const TURNO_MAX_MS_PADRAO = 600_000


export const EXPIROU = Symbol('prazo vencido')


export async function correrContraORelogio<T>(promessa: Promise<T>, prazoMs: number): Promise<T | typeof EXPIROU> {
  
  let timer!: ReturnType<typeof setTimeout>
  const expiracao = new Promise<typeof EXPIROU>((resolve) => {
    timer = setTimeout(() => resolve(EXPIROU), Math.min(prazoMs, TIMEOUT_MAX_MS))
  })
  try {
    return await Promise.race([promessa, expiracao])
  } finally {
    clearTimeout(timer)
  }
}


export async function* iterateChunks(
  fullStream: unknown,
  prazo: PrazoDoTurno,
  controle: ControleDePrazo,
  
  aoExpirar?: () => void,
): AsyncGenerator<unknown> {
  const stream = fullStream as ReadableStream<unknown>
  const reader = stream.getReader()
  let avisado = false
  const expirar = () => {
    controle.expirou = true
    if (avisado) return
    avisado = true
    try { aoExpirar?.() } catch (e) { console.warn('[relogioDoTurno] corte do trabalho falhou (não-fatal):', e) }
  }
  try {
    for (;;) {
      const restante = orcamentoDeEspera(prazo, controle, Date.now())
      if (restante <= 0) { expirar(); return }
      const lido = await correrContraORelogio(reader.read(), restante)
      if (lido === EXPIROU) { expirar(); return }
      if (lido.done) break
      yield lido.value
    }
  } finally {
    
    
    
    
    
    
    reader.releaseLock()
    
    
    
    if (controle.expirou) void stream.cancel().catch(() => {  })
  }
}
