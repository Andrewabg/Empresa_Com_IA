










import type { AlinhamentoH, AlinhamentoV } from '@/lib/design/layout/tipos'
import type { PapelDeFonte } from '@/lib/design/fontes'


export const BLOCOS_DE_ARTE = ['headline', 'subheadline', 'cta', 'selo'] as const
export type BlocoDeArte = (typeof BLOCOS_DE_ARTE)[number]

export function ehBlocoDeArte(v: string): v is BlocoDeArte {
  return (BLOCOS_DE_ARTE as readonly string[]).includes(v)
}


export interface Ancora { x: number; y: number; w: number; h: number }


export type PapelDeCorNaPeca = 'fundo' | 'destaque' | 'botao'

export interface CamadaDeTemplate {
  tipo: 'solido' | 'gradiente' | 'veu'
  
  ancora: Ancora
  papel: PapelDeCorNaPeca
  
  opacidade: number
  
  sentido?: 'para-cima' | 'para-baixo'
  
  raio?: number
}

export interface FaixaDeTemplate {
  bloco: BlocoDeArte
  
  ancora: Ancora
  papel: PapelDeFonte
  peso: number
  
  escala: { min: number; max: number }
  maxLinhas: number
  entrelinha: number
  alinhamento: AlinhamentoH
  alinhamentoV: AlinhamentoV
  caixaAlta?: boolean
  
  cor: 'auto' | 'sobreFundo' | 'destaque' | 'sobreBotao'
  
  pilula?: boolean
  
  veu?: boolean
}


export type CantoDaMarca = 'superior-esquerda' | 'superior-direita' | 'inferior-esquerda' | 'inferior-direita'

export interface TemplateDeArte {
  slug: string
  
  nome: string
  
  descricao: string
  camadas: CamadaDeTemplate[]
  faixas: FaixaDeTemplate[]
  
  fundoPede: string
  
  semFoto?: boolean
  
  formatos?: string[]
  marcaEm: CantoDaMarca
}
