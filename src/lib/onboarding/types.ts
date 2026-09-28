export type Perfil = 'tem_empresa' | 'sem_empresa' | 'revendedor' | 'curioso'
export type Fase = 'abertura' | 'roteamento' | 'entrevista' | 'concluida' | 'adiada'
export type SlotStatus = 'vazio' | 'aguardando_confirmacao' | 'pendente_commit' | 'coberto' | 'adiado'
export type Profundidade = 0 | 1 | 2 | 3

export interface Slot {
  id: string            
  categoria: string
  nucleo: boolean       
  prioridade: number    
  status: SlotStatus
  valor?: string
  
  conteudoPendente?: string
  profundidade: Profundidade
  ladder: number        
  
  reforcos: number
  reespelhos: number    
}

export interface OnboardingSession {
  operatorId: string
  conversationId?: string
  perfil: Perfil | null
  fase: Fase
  slots: Slot[]
  
  perguntaEmJogo?: string
  reflectCutpointAt?: string   
}


export interface ExtracaoTurno {
  topicId: string
  valor: string
  conteudo?: string     
  profundidade: Profundidade
  precisaConfirmar: boolean
  persistido: boolean   
  
  falaDoDono?: string
}

export const LIMIAR_SUFICIENTE: Profundidade = 2   
export const TETO_LADDER = 3                        
export const TETO_REESPELHOS = 2                    
