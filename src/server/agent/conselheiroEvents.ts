
import type { NotaCitada } from '@/server/tools/buscarCerebro'
import type { ArtifactRow } from '@/data/artifacts'
import type { MotivoDoFim, ResultadoDeTool } from '@/lib/conversa/fechamentoDoTurno'
import type { MemoryDraft, PainelBlocoPatch, EstudioPatch, JuridicoPatch, InvestigacaoResumo } from './wireTypes'


export interface ToolProgresso {
  tool: string
  rotulo: string
  
  detalhe?: string
  
  contador?: string
}


export interface ToolErroTurno {
  
  tool: string
  
  motivo: string
}


export interface TurnSink {
  
  onText(delta: string): void
  
  onArtefato?(artefato: ArtifactRow): void
  
  onCitacoes?(notas: NotaCitada[]): void
  
  onRascunhoMemoria?(draft: MemoryDraft): void
  
  onTransfer?(agentId: string, resumo: string): void
  
  onPainel?(patch: PainelBlocoPatch): void
  
  onEstudio?(patch: EstudioPatch): void
  
  onJuridico?(patch: JuridicoPatch): void
  
  onProgresso?(progresso: ToolProgresso): void
  
  onInvestigacao?(resumo: InvestigacaoResumo): void
  
  onConversationId?(id: string): void
}


export interface ResumoTurno {
  
  finished: boolean
  
  text: string
  
  inputTokens: number
  
  outputTokens: number
  
  cachedTokens: number
  
  pendingApprovalId: string | null
  
  messageId?: string
  
  finishReason?: string
  
  fimAnormal?: MotivoDoFim
  
  textoDeSocorro?: boolean
  
  fechamentoUsado?: boolean
  
  toolErrors?: ToolErroTurno[]
  
  toolNames?: string[]
  
  resultadosDeTool?: ResultadoDeTool[]
}
