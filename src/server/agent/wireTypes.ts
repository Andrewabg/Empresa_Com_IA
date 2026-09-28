
import type { FerramentaStatus } from '@/lib/hiring/brief' 


export const CITATIONS_DATA_TYPE = 'data-citations' as const


export const CONVERSATION_DATA_TYPE = 'data-conversation' as const


export const ARTIFACT_DATA_TYPE = 'data-artifact' as const


export const MEMORY_DRAFT_DATA_TYPE = 'data-memory-draft' as const


export interface MemoryDraft {
  título: string
  conteúdo: string
  tipo: string
  tags?: string[]
}


export const TRANSFER_DATA_TYPE = 'data-transfer' as const


export interface TransferData { agentId: string; resumo?: string }


export const PAINEL_DATA_TYPE = 'data-painel' as const
export type { PainelBlocoPatch, PainelBloco } from '@/lib/trafego/types'


export const ESTUDIO_DATA_TYPE = 'data-estudio' as const
export type { EstudioPatch, PecaView, SwipeView, CampanhaView } from '@/lib/estudio/types'


export const FERRAMENTA_DATA_TYPE = 'data-ferramenta' as const


export interface FerramentaEmCurso { tool: string; detalhe?: string; contador?: string }


export const INVESTIGACAO_DATA_TYPE = 'data-investigacao' as const
export type { InvestigacaoResumo } from '@/lib/trafego/graph/comoCheguei'


export const MENSAGEM_DATA_TYPE = 'data-mensagem' as const


export const JURIDICO_DATA_TYPE = 'data-juridico' as const
export type { JuridicoPatch, ContratoView } from '@/lib/juridico/types'








export const HIRING_SESSION_DATA_TYPE = 'data-sessao' as const

export const HIRING_TOOLKIT_DATA_TYPE = 'data-toolkit' as const

export const HIRING_CANDIDATO_DATA_TYPE = 'data-candidato' as const


export interface ToolkitCardData {
  slug: string; name: string; icon?: string
  status: FerramentaStatus  
  
  activation?: { mode: 'managed' | 'apikey' | 'byo' | 'none'; fields?: { name: string; label: string; required: boolean; type: string }[] }
  validado: boolean
}


export interface CandidatoAntes {
  missao: string
  ferramentas: { slug: string; name: string; status: string }[]
  budgetUsd: number
}


export interface CandidatoCardData {
  nome: string; papel: string; missao: string
  fazSozinho: string[]; pedeAprovacao: string[]   
  ferramentas: { slug: string; name: string; status: string }[]
  leituraCerebro: string    
  budgetUsd: number
  
  antes?: CandidatoAntes
}


export const ONBOARDING_DATA_TYPE = 'data-onboarding' as const


export interface OnboardingProgress {
  fase: string
  cobertos: number
  total: number
}


export const WIRE_PROTOCOL_REVISION = '8e591e079b700af28db174fd4cedfc14' as const
