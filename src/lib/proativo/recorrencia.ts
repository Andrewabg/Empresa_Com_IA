












import { partesLocaisComHora, instanteDe, diaDaSemana, somarDias, passouDoTermino } from '@/lib/rotinas/agenda'
import { ehDiaUtil } from '@/lib/rotinas/diasUteis'
import { TZ_DEFAULT } from '@/lib/tempo/fusoDoDono'


export const RECORRENCIAS = ['diaria', 'dias_uteis', 'semanal', 'mensal'] as const

export type Recorrencia = (typeof RECORRENCIAS)[number]


export function diaAncoraDe(dueAtIso: string): number {
  return new Date(dueAtIso).getUTCDate()
}


export function rotuloRecorrencia(rec: Recorrencia): string {
  return rec === 'dias_uteis' ? 'dias úteis' : rec
}


export function fraseDaRecorrencia(rec: Recorrencia): string {
  if (rec === 'diaria') return 'todo dia'
  if (rec === 'dias_uteis') return 'todo dia útil, de segunda a sexta'
  if (rec === 'semanal') return 'toda semana'
  return 'todo mês'
}


export function proximaOcorrencia(dueAtIso: string, rec: Recorrencia, diaAncora?: number | null, tz: string = TZ_DEFAULT): string {
  const d = new Date(dueAtIso)
  
  
  const local = partesLocaisComHora(tz, d)
  
  const restoMs = d.getUTCSeconds() * 1000 + d.getUTCMilliseconds()
  
  const naParede = (p: { ano: number; mes: number; dia: number }): string =>
    new Date(instanteDe(p.ano, p.mes, p.dia, local.hora, local.minuto, tz).getTime() + restoMs).toISOString()

  if (rec === 'diaria') return naParede(somarDias(local, 1))
  if (rec === 'dias_uteis') {
    
    let dia = somarDias(local, 1)
    while (!ehDiaUtil(diaDaSemana(dia.ano, dia.mes, dia.dia))) dia = somarDias(dia, 1)
    return naParede(dia)
  }
  if (rec === 'semanal') return naParede(somarDias(local, 7))
  
  
  
  
  const alvo = diaAncora == null ? d.getUTCDate() : Math.min(Math.max(1, Math.trunc(diaAncora)), 31)
  const alvoMes = d.getUTCMonth() + 1
  const ultimoDia = new Date(Date.UTC(d.getUTCFullYear(), alvoMes + 1, 0)).getUTCDate()
  const dia = Math.min(alvo, ultimoDia)
  const proxUtc = new Date(Date.UTC(d.getUTCFullYear(), alvoMes, dia, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()))
  const proxLocal = partesLocaisComHora(tz, proxUtc)
  return naParede(proxLocal)
}


export function proximaOcorrenciaAte(
  dueAtIso: string,
  rec: Recorrencia,
  diaAncora: number | null | undefined,
  tz: string,
  terminaEm: string | null | undefined,
  agoraIso: string,
): string | null {
  let novo = proximaOcorrencia(dueAtIso, rec, diaAncora, tz)
  
  
  
  
  while (novo <= agoraIso && !passouDoTermino(novo, terminaEm, tz)) {
    novo = proximaOcorrencia(novo, rec, diaAncora, tz)
  }
  return passouDoTermino(novo, terminaEm, tz) ? null : novo
}
