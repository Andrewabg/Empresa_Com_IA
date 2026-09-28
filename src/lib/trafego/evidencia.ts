








import type { Eliminacao } from '@/lib/trafego/eliminacao'
import { resumoEliminacao } from '@/lib/trafego/eliminacao'

export interface ItemEvidencia {
  
  afirmacao: string
  
  descartadaPor: string
}


export function resumoLeigo(e: Eliminacao): string {
  return resumoEliminacao({ causa: e.causa, descartadas: [] })
}


export function montarEvidencia(e: Eliminacao): ItemEvidencia[] {
  return e.descartadas.map((d) => ({ afirmacao: d.hipotese, descartadaPor: d.porque }))
}
