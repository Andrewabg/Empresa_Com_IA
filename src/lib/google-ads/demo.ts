





import type { ContaSnapshot } from '@/lib/google-ads/audit'
import type { SearchTermRow } from '@/lib/google-ads/types'
import type { PacingMensalInput } from '@/lib/google-ads/pacing'
import { montarRaioX, renderRaioX } from '@/lib/google-ads/raio-x'


export const NEGOCIO_DEMO = 'Clínica OdontoSorriso — São Paulo/SP'


export const CPA_TETO_DEMO = 600


export const CONTA_DEMO: ContaSnapshot = {
  temConversaoConfigurada: true,
  temEnhancedConversions: false,
  campanhasComAnuncioReprovado: 1,
  temNegativas: false,
  conflitosKeyword: 2,
  gruposForaStag: 3,
}


export const SEARCH_TERMS_DEMO: SearchTermRow[] = [
  
  { termo: 'clareamento dental gratis', clicks: 95, cost: 190, conversions: 0, conversionValue: 0, impressions: 1800 },
  { termo: 'dentista gratis sp', clicks: 80, cost: 150, conversions: 0, conversionValue: 0, impressions: 1500 },
  { termo: 'tratamento gratis dentario', clicks: 62, cost: 118, conversions: 0, conversionValue: 0, impressions: 1150 },
  
  { termo: 'vaga dentista sp', clicks: 85, cost: 70, conversions: 0, conversionValue: 0, impressions: 1600 },
  { termo: 'vaga auxiliar odontologico', clicks: 80, cost: 65, conversions: 0, conversionValue: 0, impressions: 1500 },
  
  { termo: 'implante dentario preco', clicks: 110, cost: 850, conversions: 7, conversionValue: 8400, impressions: 2200 },
  { termo: 'clareamento dental valor', clicks: 70, cost: 420, conversions: 4, conversionValue: 4800, impressions: 1400 },
  { termo: 'dentista particular sp', clicks: 90, cost: 700, conversions: 5, conversionValue: 6000, impressions: 1900 },
  
  { termo: 'aparelho ortodontico preco', clicks: 180, cost: 2200, conversions: 3, conversionValue: 3600, impressions: 3200 },
  { termo: 'protese dentaria fixa', clicks: 160, cost: 1400, conversions: 2, conversionValue: 2000, impressions: 2600 },
]


export const PACING_DEMO: PacingMensalInput = {
  spendMtd: 3500,
  diasDecorridos: 14,
  diasNoMes: 30,
  metaMensal: 6000,
}


export function raioXDemo(): string {
  const raioX = montarRaioX({
    conta: CONTA_DEMO,
    searchTerms: SEARCH_TERMS_DEMO,
    pacing: PACING_DEMO,
    cpaTeto: CPA_TETO_DEMO,
  })
  return renderRaioX(raioX, { demo: true, negocio: NEGOCIO_DEMO })
}
