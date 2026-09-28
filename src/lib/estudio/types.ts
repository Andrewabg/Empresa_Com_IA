import type { ResultadoDoPortao } from '@/lib/qa/portoes'

import type { BrandVoice } from '@/lib/estudio/brandVoice'
import type { CriativoView } from '@/lib/design/types'
import type { DirecaoArte } from '@/lib/design/direcaoArte'
import type { AdPerf } from '@/lib/estudio/adPerf'
import type { Bloco } from '@/lib/estudio/blocos'

export interface Variacao {
  angulo: string
  
  texto: string
  notas?: string
  
  blocos?: Bloco[]
  
  ganchos?: string[]
}
export interface Veredito { escolhida?: number; porque?: string; teste?: string } 

export interface Critica {
  aprovado?: boolean
  problemas?: string[]
  notas?: string
  portoes?: ResultadoDoPortao[]
}


export interface PecaView {
  id: string
  brandId: string
  formato: string
  titulo: string
  status: 'brief' | 'rascunho' | 'revisao' | 'aprovada' | 'arquivada'
  origem: string   
  position: number
  versaoAtual: number
  variacoes: Variacao[]
  veredito: Veredito
  critica: Critica
  adId?: string
  adPerf?: AdPerf
  
  aprendido?: boolean
}


export interface Desmontagem {
  porqueFunciona?: string
  gancho?: string
  estrutura?: string[]
  gatilhos?: string[]
  angulo?: string
}


export interface SwipeView {
  id: string
  brandId: string
  titulo: string
  fonte?: string
  conteudo: string
  desmontagem: Desmontagem
  tags: string[]
  origem: string   
  createdAt: string
}

export type PlanoItemStatus = 'pendente' | 'produzindo' | 'pronta' | 'falhou'

export interface PlanoItem {
  formato: string
  canal: string
  angulo: string
  justificativa: string
  peca_id?: string
  task_id?: string
  status: PlanoItemStatus
  
  
  arte_task_id?: string
  
  arte_status?: PlanoItemStatus
}
export type CampanhaStatus = 'rascunho' | 'planejada' | 'em_producao' | 'concluida' | 'arquivada'

export interface CampanhaView {
  id: string
  brandId: string
  agentId: string
  nome: string
  bigIdea: string
  brief: Record<string, unknown>
  plano: PlanoItem[]
  status: CampanhaStatus
  createdAt: string
}


export type EstudioPatch =
  | { op: 'upsert' | 'remove'; entidade: 'peca'; peca: PecaView }
  | { op: 'upsert'; entidade: 'dna'; voice: BrandVoice }
  | { op: 'upsert' | 'remove'; entidade: 'swipe'; swipe: SwipeView }
  | { op: 'upsert' | 'remove'; entidade: 'campanha'; campanha: CampanhaView }
  | { op: 'upsert' | 'remove'; entidade: 'criativo'; criativo: CriativoView }
  | { op: 'upsert'; entidade: 'direcao'; direcao: DirecaoArte }
