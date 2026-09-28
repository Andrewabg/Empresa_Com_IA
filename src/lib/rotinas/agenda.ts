













import { DIAS_UTEIS, proximoDiaDaLista } from '@/lib/rotinas/diasUteis'


export const FREQUENCIAS = ['diaria', 'dias_uteis', 'semanal', 'mensal'] as const

export type Frequencia = (typeof FREQUENCIAS)[number]

export interface AgendaSpec {
  frequencia: Frequencia
  
  hora: string
  
  diaSemana?: number | null
  
  diasSemana?: number[] | null
  
  diaMes?: number | null
  
  terminaEm?: string | null
}

const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/


const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/


export const SEM_EXECUCAO_ATE_O_TERMINO =
  'Com essa data de término não sobra nenhuma execução. Escolha uma data mais para frente.'


export const DATA_DE_TERMINO_INVALIDA =
  'Não entendi a data de término. Me diga dia, mês e ano (por exemplo 31/12/2026).'


const DIAS = [
  { nome: 'domingo', artigo: 'Todo' },
  { nome: 'segunda', artigo: 'Toda' },
  { nome: 'terça', artigo: 'Toda' },
  { nome: 'quarta', artigo: 'Toda' },
  { nome: 'quinta', artigo: 'Toda' },
  { nome: 'sexta', artigo: 'Toda' },
  { nome: 'sábado', artigo: 'Todo' },
] as const

export function validarAgenda(spec: AgendaSpec): { ok: true } | { ok: false; erro: string } {
  if (!RE_HORA.test(spec.hora)) return { ok: false, erro: 'Horário inválido, use HH:MM (ex.: 08:00).' }
  if (spec.frequencia === 'semanal') {
    const lista = spec.diasSemana
    if (lista && lista.length) {
      const ok = lista.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      if (!ok) return { ok: false, erro: 'Escolha dias da semana válidos.' }
    } else {
      const d = spec.diaSemana
      if (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > 6) {
        return { ok: false, erro: 'Escolha o dia da semana.' }
      }
    }
  }
  if (spec.frequencia === 'mensal') {
    const d = spec.diaMes
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || d > 31) {
      return { ok: false, erro: 'Escolha o dia do mês (1 a 31).' }
    }
  }
  if (!(FREQUENCIAS as readonly string[]).includes(spec.frequencia)) {
    return { ok: false, erro: 'Frequência inválida.' }
  }
  
  
  if (spec.terminaEm != null && spec.terminaEm !== '' && !ehDataDeParede(spec.terminaEm)) {
    return { ok: false, erro: DATA_DE_TERMINO_INVALIDA }
  }
  return { ok: true }
}


export function ehDataDeParede(valor: string): boolean {
  const m = RE_DATA.exec(valor)
  if (!m) return false
  const ano = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])
  if (mes < 1 || mes > 12 || dia < 1) return false
  return dia <= ultimoDia(ano, mes)
}


export function alternarDiaSemana(lista: readonly number[], dia: number): number[] {
  const atual = [...new Set(lista)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) return atual.sort((a, b) => a - b)
  const semEle = atual.filter((d) => d !== dia)
  if (semEle.length === atual.length) return [...atual, dia].sort((a, b) => a - b)
  return semEle.length ? semEle.sort((a, b) => a - b) : atual.sort((a, b) => a - b)
}


function nomesJuntados(dias: number[]): string {
  const nomes = dias.map((d) => DIAS[d].nome)
  if (nomes.length === 1) return nomes[0]
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}


function sufixoDoTermino(terminaEm: string | null | undefined): string {
  if (!terminaEm || !ehDataDeParede(terminaEm)) return ''
  const [ano, mes, dia] = terminaEm.split('-')
  return `, até ${dia}/${mes}/${ano}`
}


export function descreverAgenda(spec: AgendaSpec): string {
  return `${descreverRitmo(spec)}${sufixoDoTermino(spec.terminaEm)}`
}


function descreverRitmo(spec: AgendaSpec): string {
  if (spec.frequencia === 'diaria') return `Todo dia às ${spec.hora}`
  
  
  if (spec.frequencia === 'dias_uteis') return `Todo dia útil (segunda a sexta, sem feriado) às ${spec.hora}`
  if (spec.frequencia === 'semanal') {
    const lista = [...new Set(spec.diasSemana ?? [])]
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      .sort((a, b) => a - b)
    if (lista.length) {
      const artigo = DIAS[lista[0]].artigo
      return `${artigo} ${nomesJuntados(lista)} às ${spec.hora}`
    }
    const d = DIAS[spec.diaSemana ?? 0] ?? DIAS[0]
    return `${d.artigo} ${d.nome} às ${spec.hora}`
  }
  const dia = spec.diaMes ?? 1
  
  const ressalva = dia >= 29 ? ' (ou no último dia, nos meses mais curtos)' : ''
  return `Todo dia ${dia} às ${spec.hora}${ressalva}`
}

interface PartesLocais { ano: number; mes: number; dia: number }


function offsetMinutos(tz: string, instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instante)
  const p: Record<string, string> = {}
  for (const parte of partes) if (parte.type !== 'literal') p[parte.type] = parte.value
  const comoUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
  
  return (comoUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60_000
}


function partesLocais(tz: string, instante: Date): PartesLocais {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instante)
  const p: Record<string, string> = {}
  for (const parte of partes) if (parte.type !== 'literal') p[parte.type] = parte.value
  return { ano: Number(p.year), mes: Number(p.month), dia: Number(p.day) }
}


export function partesLocaisComHora(tz: string, instante: Date): PartesLocais & { hora: number; minuto: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(instante)
  const p: Record<string, string> = {}
  for (const parte of partes) if (parte.type !== 'literal') p[parte.type] = parte.value
  return { ano: Number(p.year), mes: Number(p.month), dia: Number(p.day), hora: Number(p.hour), minuto: Number(p.minute) }
}


export function instanteDe(ano: number, mes: number, dia: number, hora: number, minuto: number, tz: string): Date {
  const paredeComoUtc = Date.UTC(ano, mes - 1, dia, hora, minuto, 0, 0)
  const chute = new Date(paredeComoUtc - offsetMinutos(tz, new Date(paredeComoUtc)) * 60_000)
  
  return new Date(paredeComoUtc - offsetMinutos(tz, chute) * 60_000)
}


function ultimoDia(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}


export function diaDaSemana(ano: number, mes: number, dia: number): number {
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
}


export function somarDias(p: PartesLocais, dias: number): PartesLocais {
  const d = new Date(Date.UTC(p.ano, p.mes - 1, p.dia + dias))
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() }
}


function mesComDia(ano: number, mes: number, diaPedido: number): PartesLocais {
  const norm = new Date(Date.UTC(ano, mes - 1, 1))
  const a = norm.getUTCFullYear()
  const m = norm.getUTCMonth() + 1
  return { ano: a, mes: m, dia: Math.min(diaPedido, ultimoDia(a, m)) }
}


export function proximaExecucao(spec: AgendaSpec, aPartirDeIso: string, tz: string): string {
  const de = new Date(aPartirDeIso)
  const m = RE_HORA.exec(spec.hora)
  if (!m) throw new Error(`proximaExecucao: horário inválido (${spec.hora})`)
  const hora = Number(m[1])
  const minuto = Number(m[2])
  const hoje = partesLocais(tz, de)

  const emQue = (p: PartesLocais): Date => instanteDe(p.ano, p.mes, p.dia, hora, minuto, tz)
  const passou = (d: Date): boolean => d.getTime() <= de.getTime()

  if (spec.frequencia === 'diaria') {
    const cand = emQue(hoje)
    return (passou(cand) ? emQue(somarDias(hoje, 1)) : cand).toISOString()
  }

  if (spec.frequencia === 'dias_uteis' || spec.frequencia === 'semanal') {
    
    
    
    const lista: number[] = spec.frequencia === 'dias_uteis'
      ? [...DIAS_UTEIS]
      : (spec.diasSemana && spec.diasSemana.length ? spec.diasSemana : [spec.diaSemana ?? 0])
    const dowHoje = diaDaSemana(hoje.ano, hoje.mes, hoje.dia)
    const delta = proximoDiaDaLista(dowHoje, lista)
    const cand = emQue(somarDias(hoje, delta))
    if (!passou(cand)) return cand.toISOString()
    
    const deltaSeguinte = 1 + proximoDiaDaLista((dowHoje + 1) % 7, lista)
    return emQue(somarDias(hoje, deltaSeguinte)).toISOString()
  }

  const diaPedido = spec.diaMes ?? 1
  const desteMes = mesComDia(hoje.ano, hoje.mes, diaPedido)
  const cand = emQue(desteMes)
  if (!passou(cand)) return cand.toISOString()
  
  return emQue(mesComDia(hoje.ano, hoje.mes + 1, diaPedido)).toISOString()
}


export function dataLocalDe(instanteIso: string, tz: string): string {
  const p = partesLocais(tz, new Date(instanteIso))
  return `${String(p.ano).padStart(4, '0')}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`
}


export function passouDoTermino(instanteIso: string, terminaEm: string | null | undefined, tz: string): boolean {
  if (!terminaEm) return false
  return dataLocalDe(instanteIso, tz) > terminaEm
}


export function proximaExecucaoAte(spec: AgendaSpec, aPartirDeIso: string, tz: string): string | null {
  const prox = proximaExecucao(spec, aPartirDeIso, tz)
  return passouDoTermino(prox, spec.terminaEm, tz) ? null : prox
}


export function estadoDaAgenda(
  spec: AgendaSpec,
  ativa: boolean,
  agoraIso: string,
  tz: string,
): 'ativa' | 'pausada' | 'encerrada' {
  if (ativa) return 'ativa'
  if (!spec.terminaEm) return 'pausada'
  
  
  
  
  try {
    return proximaExecucaoAte(spec, agoraIso, tz) === null ? 'encerrada' : 'pausada'
  } catch {
    return 'pausada'
  }
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']


export function rotuloDaRotina(
  spec: AgendaSpec,
  ativa: boolean,
  proximaIso: string,
  agoraIso: string,
  tz: string,
): string {
  const estado = estadoDaAgenda(spec, ativa, agoraIso, tz)
  if (estado === 'ativa') return descreverProxima(proximaIso, agoraIso, tz)
  return estado === 'encerrada' ? 'encerrada' : 'pausada'
}


export function descreverProxima(proximaIso: string, agoraIso: string, tz: string): string {
  const alvo = partesLocais(tz, new Date(proximaIso))
  const hoje = partesLocais(tz, new Date(agoraIso))
  const amanha = somarDias(hoje, 1)
  const hora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(proximaIso))
  const mesmoDia = (a: PartesLocais, b: PartesLocais) => a.ano === b.ano && a.mes === b.mes && a.dia === b.dia
  if (mesmoDia(alvo, hoje)) return `hoje às ${hora}`
  if (mesmoDia(alvo, amanha)) return `amanhã às ${hora}`
  const dia = String(alvo.dia).padStart(2, '0')
  return `${dia} de ${MESES[alvo.mes - 1]} às ${hora}`
}
