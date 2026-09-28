







import type { LinhaHora } from '@/lib/trafego/hora'


export const RAZAO_DE_ALERTA = 0.35

export const MINUTOS_MINIMOS = 12

export const HORAS_DE_REFERENCIA = 3

export type MotivoEntrega = 'ok' | 'quebrou' | 'cedo' | 'sem_referencia'

export interface EntregaInput {
  horas: LinhaHora[]
  
  horaAtual: number
  
  minutoAtual: number
}

export interface EntregaVeredito {
  quebrou: boolean
  motivo: MotivoEntrega
  
  projetado: number
  mediaReferencia: number
  
  razao: number
}


export function avaliarEntrega(input: EntregaInput): EntregaVeredito {
  const { horas, horaAtual, minutoAtual } = input
  const vazio = { projetado: 0, mediaReferencia: 0, razao: 0 }

  const cheias = horas.filter((h) => h.hora < horaAtual)
  const refs = cheias.slice(-HORAS_DE_REFERENCIA)
  if (refs.length < HORAS_DE_REFERENCIA) {
    return { quebrou: false, motivo: 'sem_referencia', ...vazio }
  }

  const mediaReferencia = refs.reduce((s, h) => s + h.spend, 0) / refs.length
  if (mediaReferencia <= 0) {
    return { quebrou: false, motivo: 'sem_referencia', ...vazio }
  }

  const gastoAtual = horas.find((h) => h.hora === horaAtual)?.spend ?? 0
  const projetado = minutoAtual > 0 ? (gastoAtual / minutoAtual) * 60 : 0
  const razao = projetado / mediaReferencia

  if (minutoAtual < MINUTOS_MINIMOS) {
    return { quebrou: false, motivo: 'cedo', projetado, mediaReferencia, razao }
  }
  const quebrou = razao < RAZAO_DE_ALERTA
  return { quebrou, motivo: quebrou ? 'quebrou' : 'ok', projetado, mediaReferencia, razao }
}
