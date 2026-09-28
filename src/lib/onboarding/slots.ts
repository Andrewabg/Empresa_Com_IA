import { pisoProfundidade } from './profundidade'
import {
  LIMIAR_SUFICIENTE,
  TETO_LADDER,
  TETO_REESPELHOS,
  type OnboardingSession,
  type Slot,
  type ExtracaoTurno,
} from './types'


const ACIONAVEL: Slot['status'][] = ['vazio', 'aguardando_confirmacao']


const RESPONDIDO: Slot['status'][] = ['coberto', 'pendente_commit']


export function slotSuficiente(slot: Pick<Slot, 'profundidade' | 'ladder'>): boolean {
  return slot.profundidade >= LIMIAR_SUFICIENTE || slot.ladder >= TETO_LADDER
}


function pedeAprofundamento(s: Slot): boolean {
  return s.nucleo && RESPONDIDO.includes(s.status) && !slotSuficiente(s)
}


export function proximoSlot(session: OnboardingSession): Slot | null {
  const porPrioridade = (a: Slot, b: Slot) => a.prioridade - b.prioridade

  
  
  
  
  if (session.perguntaEmJogo) {
    const desviado = session.slots.find(
      (s) => s.id === session.perguntaEmJogo && ACIONAVEL.includes(s.status),
    )
    if (desviado) return desviado
  }

  
  
  
  
  const novos = session.slots.filter((s) => ACIONAVEL.includes(s.status))
  if (novos.length > 0) return [...novos].sort(porPrioridade)[0]

  const rasos = session.slots.filter(pedeAprofundamento)
  if (rasos.length > 0) return [...rasos].sort(porPrioridade)[0]

  return null
}


function primeiroNaoVazio(...valores: (string | undefined)[]): string | undefined {
  return valores.find((v) => (v ?? '').trim() !== '')
}


export function aplicarExtracao(session: OnboardingSession, ext: ExtracaoTurno): OnboardingSession {
  const slots = session.slots.map((s) => {
    if (s.id !== ext.topicId) return s
    
    
    
    const profundidade = Math.min(
      ext.profundidade,
      pisoProfundidade(ext.falaDoDono ?? ext.valor),
    ) as Slot['profundidade']
    const status: Slot['status'] = ext.precisaConfirmar
      ? 'aguardando_confirmacao'
      : ext.persistido ? 'coberto' : 'pendente_commit'
    const { conteudoPendente: guardado, ...base } = s
    const pendente = status === 'coberto' ? undefined : primeiroNaoVazio(ext.conteudo, guardado)
    const proximo: Slot = { ...base, valor: ext.valor, profundidade, status }
    return pendente === undefined ? proximo : { ...proximo, conteudoPendente: pendente }
  })
  return { ...session, slots }
}


export function trocarStatus(
  session: OnboardingSession,
  topicId: string,
  status: Slot['status'],
  limparCorpo: boolean,
): OnboardingSession {
  return {
    ...session,
    slots: session.slots.map((s) => {
      if (s.id !== topicId) return s
      const { conteudoPendente: guardado, ...base } = s
      return limparCorpo ? { ...base, status } : { ...base, status, conteudoPendente: guardado }
    }),
  }
}


const TERMINAIS: Slot['status'][] = ['coberto', 'adiado', 'pendente_commit']


export function entrevistaConcluida(session: OnboardingSession): boolean {
  const nucleo = session.slots.filter((s) => s.nucleo)
  return (
    nucleo.length > 0 &&
    nucleo.every((s) => TERMINAIS.includes(s.status)) &&
    !nucleo.some(pedeAprofundamento)
  )
}


const RESPONDIDOS: Slot['status'][] = ['coberto', 'pendente_commit']


export function progressoNucleo(session: OnboardingSession): { cobertos: number; total: number } {
  const nucleo = session.slots.filter((s) => s.nucleo)
  return { cobertos: nucleo.filter((s) => RESPONDIDOS.includes(s.status)).length, total: nucleo.length }
}

export function deveLadder(slot: Pick<Slot, 'profundidade' | 'ladder'>): boolean {
  return slot.profundidade < LIMIAR_SUFICIENTE && slot.ladder < TETO_LADDER
}


export function contarLadder(session: OnboardingSession, slotId: string): OnboardingSession {
  return {
    ...session,
    slots: session.slots.map((s) =>
      s.id === slotId ? { ...s, ladder: Math.min(s.ladder + 1, TETO_LADDER) } : s,
    ),
  }
}


export function podeEspelhar(slot: Pick<Slot, 'status' | 'valor'>): boolean {
  return slot.status === 'aguardando_confirmacao' && (slot.valor ?? '').trim() !== ''
}


export function atingiuTetoEspelho(slot: Pick<Slot, 'reespelhos'>): boolean {
  return slot.reespelhos >= TETO_REESPELHOS
}


export function contarEspelho(session: OnboardingSession, slotId: string): OnboardingSession {
  return {
    ...session,
    slots: session.slots.map((s) =>
      s.id === slotId ? { ...s, reespelhos: Math.min(s.reespelhos + 1, TETO_REESPELHOS) } : s,
    ),
  }
}
