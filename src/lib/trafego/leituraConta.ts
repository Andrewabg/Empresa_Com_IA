



import type { AccountBaseline, FaixaNormal } from '@/lib/trafego/baseline'
import { fmtBRL } from '@/lib/trafego/format'



const fmtRoasMult = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'x'


export const DOW_LABEL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const

export const VOLATIL_RATIO = 0.5

export const RITMO_MIN_RATIO = 1.3

export const RITMO_MIN_DOW = 5

export type Volatilidade = 'estavel' | 'volatil'

export interface RitmoSemanal {
  metric: 'roas' | 'cpa'
  melhorDia: number 
  piorDia: number   
  melhorValor: number
  piorValor: number
}

export interface LeituraConta {
  dias: number
  suficiente: boolean
  volatilidade?: Volatilidade
  
  volatilidadeRatio?: number
  ritmoRoas?: RitmoSemanal
  ritmoCpa?: RitmoSemanal
}


export function avaliarVolatilidade(faixaRoas: FaixaNormal | undefined): { nivel: Volatilidade; ratio: number } | undefined {
  if (!faixaRoas || faixaRoas.mediana <= 0) return undefined
  const ratio = (faixaRoas.p75 - faixaRoas.p25) / faixaRoas.mediana
  return { nivel: ratio > VOLATIL_RATIO ? 'volatil' : 'estavel', ratio }
}


export function lerRitmoSemanal(
  porDia: Record<number, number> | undefined,
  metric: 'roas' | 'cpa',
  melhorEhMaior: boolean,
): RitmoSemanal | undefined {
  if (!porDia) return undefined
  const entradas = Object.entries(porDia)
    .map(([dow, v]) => ({ dow: Number(dow), v }))
    .filter((e) => Number.isFinite(e.v))
  if (entradas.length < RITMO_MIN_DOW) return undefined
  let melhor = entradas[0]
  let pior = entradas[0]
  for (const e of entradas) {
    if (melhorEhMaior ? e.v > melhor.v : e.v < melhor.v) melhor = e
    if (melhorEhMaior ? e.v < pior.v : e.v > pior.v) pior = e
  }
  const alto = Math.max(melhor.v, pior.v)
  const baixo = Math.min(melhor.v, pior.v)
  if (baixo <= 0 || alto / baixo < RITMO_MIN_RATIO) return undefined
  return { metric, melhorDia: melhor.dow, piorDia: pior.dow, melhorValor: melhor.v, piorValor: pior.v }
}


export function lerPersonalidade(baseline: AccountBaseline): LeituraConta {
  const out: LeituraConta = { dias: baseline.dias, suficiente: baseline.suficiente }
  if (!baseline.suficiente) return out
  const vol = avaliarVolatilidade(baseline.faixas.roas)
  if (vol) {
    out.volatilidade = vol.nivel
    out.volatilidadeRatio = vol.ratio
  }
  const dw = baseline.diaSemana
  const rRoas = lerRitmoSemanal(dw?.roas, 'roas', true)
  if (rRoas) out.ritmoRoas = rRoas
  const rCpa = lerRitmoSemanal(dw?.cpa, 'cpa', false)
  if (rCpa) out.ritmoCpa = rCpa
  return out
}


export function resumoPersonalidade(l: LeituraConta): string {
  if (!l.suficiente) return ''
  const linhas: string[] = []
  if (l.volatilidade === 'volatil') {
    const mag = l.volatilidadeRatio !== undefined ? ` (IQR ${Math.round(l.volatilidadeRatio * 100)}% da mediana)` : ''
    linhas.push(`Conta VOLÁTIL — ROAS oscila muito${mag}. Não reaja a 1 dia isolado; espere o padrão.`)
  } else if (l.volatilidade === 'estavel') {
    linhas.push('Conta estável — ROAS consistente; desvio forte hoje é sinal real.')
  }
  if (l.ritmoRoas) {
    const r = l.ritmoRoas
    linhas.push(`Melhor dia de retorno: ${DOW_LABEL[r.melhorDia]} (ROAS ${fmtRoasMult(r.melhorValor)}); pior: ${DOW_LABEL[r.piorDia]} (${fmtRoasMult(r.piorValor)}) — evite escalar no pior dia (${DOW_LABEL[r.piorDia]}).`)
  }
  if (l.ritmoCpa) {
    const r = l.ritmoCpa
    linhas.push(`CPA mais barato: ${DOW_LABEL[r.melhorDia]} (${fmtBRL(r.melhorValor)}); mais caro: ${DOW_LABEL[r.piorDia]} (${fmtBRL(r.piorValor)}).`)
  }
  if (!linhas.length) return ''
  return `\n\nPersonalidade da conta:\n${linhas.map((s) => `- ${s}`).join('\n')}`
}
