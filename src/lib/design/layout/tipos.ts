





import type { EspecDeFonte } from '@/lib/design/fontes'

export type { EspecDeFonte }

export interface MedidaTexto {
  largura: number
  
  ascento: number
  
  descenso: number
}

export type Medidor = (texto: string, fonte: EspecDeFonte) => MedidaTexto

export type AlinhamentoH = 'esquerda' | 'centro' | 'direita'
export type AlinhamentoV = 'topo' | 'meio' | 'base'

export interface Caixa { x: number; y: number; w: number; h: number }

export interface CaixaDeTexto {
  linhas: string[]
  
  tamanho: number
  
  alturaDeLinha: number
  
  caixa: Caixa
  alinhamento: AlinhamentoH
  familia: string
  peso: number
  
  coube: boolean
}
