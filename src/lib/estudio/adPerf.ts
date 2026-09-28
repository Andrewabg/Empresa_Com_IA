

import { avaliarVsNormal, type AccountBaseline } from '@/lib/trafego/baseline'
import type { CausaCriativo } from '@/lib/trafego/criativo'

export interface AdPerf {
  adId: string
  nome?: string
  roas?: number
  ctr?: number
  spend?: number
  veredito?: 'acima' | 'dentro' | 'abaixo'   
  
  hookRate?: number
  holdRate?: number
  
  causa?: CausaCriativo
  at: string                                  
}

export function vereditoDaPeca(roas: number | undefined, baseline: AccountBaseline): AdPerf['veredito'] {
  if (roas === undefined || !baseline.suficiente) return undefined
  const faixa = baseline.faixas['roas']
  if (!faixa) return undefined
  return avaliarVsNormal(roas, faixa).posicao
}


export function deveAprender(perf: AdPerf | null, aprendidoAdId: string | null): boolean {
  if (!perf || perf.adId === aprendidoAdId) return false
  return perf.veredito === 'acima' || perf.veredito === 'abaixo'
}


export function licaoDaPeca(perf: AdPerf | null): 'repetir' | 'evitar' | null {
  if (perf?.veredito === 'acima') return 'repetir'
  if (perf?.veredito === 'abaixo') return 'evitar'
  return null
}
