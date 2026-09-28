


import type { CampaignEntity } from '@/lib/trafego/normalize'
import type { MetricShape } from '@/lib/trafego/types'


export type PosturaCampanha = 'advantage_plus' | 'cbo' | 'abo' | 'desconhecida'


export function classificarPostura(entity?: CampaignEntity): PosturaCampanha {
  if (!entity) return 'desconhecida'
  if (entity.advantageState && entity.advantageState !== 'DISABLED') return 'advantage_plus'
  if (entity.cbo) return 'cbo'
  return 'abo'
}


export const CONC_ADS_MIN = 4          
export const CONC_ADS_TOP_PCT = 0.8    
export const CONC_ADS_SPEND_MIN = 100  

export interface Concentracao { concentrado: boolean; total: number; topPct: number }

export function concentracaoCriativa(anuncios: { m: MetricShape }[]): Concentracao {
  const gastos = anuncios.map((a) => a.m.spend ?? 0)
  const total = anuncios.length
  const soma = gastos.reduce((s, g) => s + g, 0)
  const top2 = [...gastos].sort((a, b) => b - a).slice(0, 2).reduce((s, g) => s + g, 0)
  const topPct = soma > 0 ? top2 / soma : 0
  const concentrado = total >= CONC_ADS_MIN && soma >= CONC_ADS_SPEND_MIN && topPct >= CONC_ADS_TOP_PCT
  return { concentrado, total, topPct }
}


export function adviceConsolidar(nConjuntos: number, famintos: number, postura: PosturaCampanha): string {
  const base = `${nConjuntos} conjuntos, ${famintos} em learning limited. Na era atual o Meta lê o criativo e distribui, e cada conjunto precisa de cerca de 50 conversões por semana pra sair do aprendizado.`
  if (postura === 'cbo') {
    return `${base} A campanha já é CBO, então reduza o número de conjuntos (menos conjuntos, mais orçamento por conjunto) pra concentrar os eventos.`
  }
  if (postura === 'advantage_plus') {
    return `${base} A campanha já é Advantage+; deixe o orçamento fluir e evite fragmentar em muitos conjuntos manuais.`
  }
  
  return `${base} Consolide em CBO ou Advantage+ com público amplo (menos conjuntos, mais orçamento por conjunto); os interesses detalhados foram consolidados, hoje o caminho é público amplo mais Advantage+ Audience.`
}


export function adviceDiversificar(total: number): string {
  return `a Andrômeda concentrou quase todo o gasto em 1 ou 2 dos ${total} anúncios e o vencedor está dando sinal de fadiga. Pause os anúncios parados e teste um ângulo genuinamente diferente, não mais variações do mesmo.`
}
