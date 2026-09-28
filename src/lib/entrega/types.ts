










export type EstadoItem =
  | 'na-fila'      
  | 'escrevendo'   
  | 'texto-pronto' 
  | 'desenhando'   
  | 'pronto'       
  | 'travado'      


export type QuemEsta = 'copy' | 'arte' | null


export interface ItemDaEntrega {
  
  indice: number
  
  formato: string
  
  formatoNome: string
  canal: string
  angulo: string
  estado: EstadoItem
  quemEsta: QuemEsta
  
  pecaId?: string
  
  criativoId?: string
  
  artifactId?: string
}


export interface Entrega {
  id: string
  nome: string
  bigIdea: string
  criadaEm: string
  
  comArte: boolean
  itens: ItemDaEntrega[]
}


export interface Progresso {
  total: number
  prontos: number
  travados: number
  emVoo: number
  
  porcento: number
  
  terminou: boolean
}


export interface PedidoDeEntrega {
  
  objetivo: string
  
  oferta: string
  
  publico: string
  
  quantidades: Record<string, number>
  
  comArte: boolean
}
