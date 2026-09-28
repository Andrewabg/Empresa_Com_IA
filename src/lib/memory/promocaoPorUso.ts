


export const MIN_SINAIS = 3

export const MIN_CONSULTAS = 3

export const MIN_DIAS = 3

export const IDADE_MAXIMA_DIAS = 30

export const TETO_POR_VARREDURA = 10

export const MEIA_VIDA_DIAS = 14


export interface MedidaDeUso {
  
  alvoId: string
  
  sinais: number
  
  consultasUnicas: number
  
  diasDistintos: number
  
  idadeDias: number
  
  diasDesdeUltimoUso: number
}


export interface AgregadoDeUso {
  alvo_id: string
  sinais: number
  consultas_unicas: number
  dias_distintos: number
  
  ultimo_dia: string
  
  criado_em: string
  resumo: string
}


export function diasEntreDias(de: string, ate: string): number {
  const a = Date.parse(`${de}T00:00:00Z`)
  const b = Date.parse(`${ate}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN
  return Math.round((b - a) / 86_400_000)
}


export function medidaDoAgregado(
  a: AgregadoDeUso,
  agoraIso: string,
  hojeLocal: string,
): MedidaDeUso {
  const n = (v: unknown): number => {
    const x = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(x) ? x : NaN
  }
  const criado = Date.parse(a.criado_em)
  const agora = Date.parse(agoraIso)
  const idadeDias =
    Number.isFinite(criado) && Number.isFinite(agora)
      ? Math.floor((agora - criado) / 86_400_000)
      : NaN
  return {
    alvoId: a.alvo_id,
    sinais: n(a.sinais),
    consultasUnicas: n(a.consultas_unicas),
    diasDistintos: n(a.dias_distintos),
    idadeDias,
    diasDesdeUltimoUso: diasEntreDias(a.ultimo_dia, hojeLocal),
  }
}


export function passaNosPortoes(m: MedidaDeUso): boolean {
  if (!Number.isFinite(m.sinais) || !Number.isFinite(m.idadeDias)) return false
  if (m.sinais < MIN_SINAIS) return false
  if (m.consultasUnicas < MIN_CONSULTAS) return false
  if (m.diasDistintos < MIN_DIAS) return false
  if (m.idadeDias < 0 || m.idadeDias > IDADE_MAXIMA_DIAS) return false
  return true
}


export function scoreDeOrdenacao(m: MedidaDeUso): number {
  const diversidade = m.consultasUnicas * m.diasDistintos
  if (!Number.isFinite(diversidade) || diversidade <= 0) return 0
  const desde = Number.isFinite(m.diasDesdeUltimoUso) ? Math.max(0, m.diasDesdeUltimoUso) : 0
  return diversidade * Math.pow(0.5, desde / MEIA_VIDA_DIAS)
}


export function escolherParaPromover(
  medidas: readonly MedidaDeUso[],
  teto: number = TETO_POR_VARREDURA,
): MedidaDeUso[] {
  const limite = Number.isFinite(teto) && teto > 0 ? Math.floor(teto) : 0
  if (limite === 0) return []
  return medidas
    .filter(passaNosPortoes)
    .sort((a, b) => {
      const d = scoreDeOrdenacao(b) - scoreDeOrdenacao(a)
      return d !== 0 ? d : a.alvoId.localeCompare(b.alvoId)
    })
    .slice(0, limite)
}
