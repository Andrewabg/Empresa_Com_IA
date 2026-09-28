









export const ESPERA_PADRAO_MS = 4 * 60 * 60 * 1000

export const TETO_TOQUES = 1

export const MARGEM_JANELA_MS = 30 * 60 * 1000
const JANELA_MS = 24 * 60 * 60 * 1000

export const ACAO_FOLLOWUP = 'followup'


export const HORAS_MIN = 1
export const HORAS_MAX = 24

export interface EstadoFollowup {
  status: 'aberta' | 'aguardando_humano' | 'assumida' | 'fechada'
  ultimaMsgInAt: string | null
  ultimaMsgAt: string | null
  proximaAcao: string | null
  proximaAcaoEm: string | null
  toques: number
  
  ligado: boolean
  janela24h: boolean
}

export type MotivoCancelamento =
  | 'respondeu' | 'assumida' | 'fechada' | 'janela_fechada' | 'teto' | 'devendo_resposta'

export type DecisaoFollowup =
  | { acao: 'nada' }
  | { acao: 'agendar'; em: string; rotulo: string }
  | { acao: 'tocar' }
  | { acao: 'cancelar'; motivo: MotivoCancelamento }

const ms = (iso: string | null): number | null => {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}


export function decidirFollowup(
  e: EstadoFollowup,
  agoraIso: string,
  cfg: { esperaMs?: number; teto?: number } = {},
): DecisaoFollowup {
  const agora = ms(agoraIso)
  if (agora === null) return { acao: 'nada' }
  const espera = cfg.esperaMs ?? ESPERA_PADRAO_MS
  const teto = cfg.teto ?? TETO_TOQUES
  const temAgendamento = e.proximaAcao === ACAO_FOLLOWUP

  
  if (e.status === 'assumida' || e.status === 'aguardando_humano') {
    return temAgendamento ? { acao: 'cancelar', motivo: 'assumida' } : { acao: 'nada' }
  }
  if (e.status === 'fechada') {
    return temAgendamento ? { acao: 'cancelar', motivo: 'fechada' } : { acao: 'nada' }
  }
  if (!e.ligado) return temAgendamento ? { acao: 'cancelar', motivo: 'teto' } : { acao: 'nada' }

  const entrou = ms(e.ultimaMsgInAt)
  if (entrou === null) return { acao: 'nada' } 

  
  
  
  
  
  
  
  
  
  const silencio = agora - entrou
  if (silencio < espera) {
    return temAgendamento ? { acao: 'cancelar', motivo: 'respondeu' } : { acao: 'nada' }
  }

  
  
  
  
  
  const saiu = ms(e.ultimaMsgAt)
  if (saiu === null || saiu <= entrou) {
    return temAgendamento ? { acao: 'cancelar', motivo: 'devendo_resposta' } : { acao: 'nada' }
  }

  if (e.toques >= teto) return temAgendamento ? { acao: 'cancelar', motivo: 'teto' } : { acao: 'nada' }
  const agendadoEm = ms(e.proximaAcaoEm)

  
  
  if (e.janela24h) {
    const fecha = entrou + JANELA_MS
    if (agora >= fecha - MARGEM_JANELA_MS) {
      return temAgendamento ? { acao: 'cancelar', motivo: 'janela_fechada' } : { acao: 'nada' }
    }
  }

  
  
  
  if (!temAgendamento) {
    let em = entrou + espera
    if (e.janela24h) em = Math.min(em, entrou + JANELA_MS - MARGEM_JANELA_MS)
    return { acao: 'agendar', em: new Date(em).toISOString(), rotulo: ACAO_FOLLOWUP }
  }

  
  if (agendadoEm !== null && agora >= agendadoEm) return { acao: 'tocar' }
  return { acao: 'nada' }
}


export function configFollowup(config: unknown): { ligado: boolean; esperaMs: number; horas: number } {
  const raw = (config as { followup?: unknown } | null)?.followup
  const obj = (raw && typeof raw === 'object' ? raw : {}) as { ligado?: unknown; horas?: unknown }
  const horasNum = typeof obj.horas === 'number' && Number.isFinite(obj.horas) ? Math.round(obj.horas) : 4
  const horas = Math.min(HORAS_MAX, Math.max(HORAS_MIN, horasNum))
  return { ligado: obj.ligado === true, esperaMs: horas * 60 * 60 * 1000, horas }
}


export function silencioLegivel(ms: number): string {
  const horas = Math.max(1, Math.round(ms / 3_600_000))
  if (horas < 24) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`
  const dias = Math.round(horas / 24)
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`
}


export function notaFollowup(silencioMs: number): string {
  return [
    '[NOTA DO SISTEMA — o cliente NÃO enviou esta mensagem. Não responda a ela, não a cite.]',
    `Faz ${silencioLegivel(silencioMs)} que o cliente não responde e a conversa parou.`,
    'Mande UMA mensagem curta retomando de onde vocês pararam: ofereça o próximo passo concreto',
    'ou tire a dúvida que ficou no ar. Não cobre resposta, não pergunte "ainda está aí?",',
    'não peça desculpas por insistir e não repita o que você já disse.',
    'NÃO escale para um humano por causa deste toque: ninguém está esperando resposta e',
    'sumiço de cliente não é tarefa para uma pessoa.',
    'Se não houver nada de útil a acrescentar, responda com uma linha em branco e nada será enviado.',
  ].join(' ')
}
