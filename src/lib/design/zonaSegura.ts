











export interface MargensSeguras {
  
  topo: number
  base: number
  laterais: number
  
  plataformaCobre: boolean
  
  rodapeDisputado: boolean
}

const FEED: MargensSeguras = { topo: 0.06, base: 0.06, laterais: 0.06, plataformaCobre: false, rodapeDisputado: false }

const ZONAS: Record<string, MargensSeguras> = {
  'post-quadrado': FEED,
  'post-feed': FEED,
  'story': { topo: 0.14, base: 0.24, laterais: 0.06, plataformaCobre: true, rodapeDisputado: true },
  'anuncio-paisagem': FEED,
}


export function margensSeguras(slug: string): MargensSeguras {
  return ZONAS[(slug ?? '').trim().toLowerCase()] ?? FEED
}

export interface Caixa { x: number; y: number; w: number; h: number }


export function caixaSegura(slug: string, largura: number, altura: number): Caixa {
  const m = margensSeguras(slug)
  const x = Math.round(largura * m.laterais)
  const y = Math.round(altura * m.topo)
  return {
    x,
    y,
    w: Math.max(0, largura - x * 2),
    h: Math.max(0, altura - y - Math.round(altura * m.base)),
  }
}


export function invadeZonaDePerigo(caixa: Caixa, segura: Caixa): boolean {
  return (
    caixa.x < segura.x ||
    caixa.y < segura.y ||
    caixa.x + caixa.w > segura.x + segura.w ||
    caixa.y + caixa.h > segura.y + segura.h
  )
}
