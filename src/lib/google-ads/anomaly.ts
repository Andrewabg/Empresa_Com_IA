





export interface MetricasDia {
  cpa?: number
  ctr?: number
  
  impressionShare?: number
  
  cvr?: number
  
  paceUtilizacao?: number
}


export interface PontoSerie extends MetricasDia {
  diaSemana: number
}


const CAMPOS: (keyof MetricasDia)[] = ['cpa', 'ctr', 'impressionShare', 'cvr', 'paceUtilizacao']


export function baselineDiaDaSemana(serie: PontoSerie[], diaSemanaAlvo: number): MetricasDia | null {
  const casados = serie.filter((p) => p.diaSemana === diaSemanaAlvo)
  if (casados.length === 0) return null
  const out: MetricasDia = {}
  for (const campo of CAMPOS) {
    const valores = casados.map((p) => p[campo]).filter((v): v is number => v != null)
    if (valores.length > 0) out[campo] = valores.reduce((a, b) => a + b, 0) / valores.length
  }
  return out
}


export const LIM_CPA = 0.20  
export const LIM_CTR = 0.15  
export const LIM_IS = 0.10   
export const LIM_CVR = 0.20  
export const LIM_PACE = 0.15 

export type SinalAnomalia =
  | { tipo: 'cpa_subiu'; delta: number }
  | { tipo: 'ctr_caiu'; delta: number }
  | { tipo: 'is_perdeu'; delta: number }
  | { tipo: 'conversao_caiu'; delta: number }
  | { tipo: 'pace_fora'; delta: number }


function subiu(hoje?: number, base?: number): number | null {
  if (hoje == null || base == null || base <= 0) return null
  return (hoje - base) / base
}

function caiu(hoje?: number, base?: number): number | null {
  if (hoje == null || base == null || base <= 0) return null
  return (base - hoje) / base
}


export function detectarAnomalias(hoje: MetricasDia, base: MetricasDia): SinalAnomalia[] {
  const sinais: SinalAnomalia[] = []
  const cpa = subiu(hoje.cpa, base.cpa)
  if (cpa != null && cpa >= LIM_CPA) sinais.push({ tipo: 'cpa_subiu', delta: cpa })
  const ctr = caiu(hoje.ctr, base.ctr)
  if (ctr != null && ctr >= LIM_CTR) sinais.push({ tipo: 'ctr_caiu', delta: ctr })
  const is = caiu(hoje.impressionShare, base.impressionShare)
  if (is != null && is >= LIM_IS) sinais.push({ tipo: 'is_perdeu', delta: is })
  const cvr = caiu(hoje.cvr, base.cvr)
  if (cvr != null && cvr >= LIM_CVR) sinais.push({ tipo: 'conversao_caiu', delta: cvr })
  if (hoje.paceUtilizacao != null) {
    const delta = hoje.paceUtilizacao - 1
    if (Math.abs(delta) >= LIM_PACE) sinais.push({ tipo: 'pace_fora', delta })
  }
  return sinais
}
