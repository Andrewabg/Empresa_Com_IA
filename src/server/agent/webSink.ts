
import type { TurnSink, ToolProgresso } from './conselheiroEvents'
import type { NotaCitada } from '../tools/buscarCerebro'
import type { ArtifactRow } from '../../data/artifacts'
import type { MemoryDraft, PainelBlocoPatch, EstudioPatch, JuridicoPatch, InvestigacaoResumo } from './wireTypes'
import {
  CITATIONS_DATA_TYPE,
  ARTIFACT_DATA_TYPE,
  MEMORY_DRAFT_DATA_TYPE,
  TRANSFER_DATA_TYPE,
  PAINEL_DATA_TYPE,
  ESTUDIO_DATA_TYPE,
  JURIDICO_DATA_TYPE,
  FERRAMENTA_DATA_TYPE,
  INVESTIGACAO_DATA_TYPE,
} from './wireTypes'


export interface WebStreamWriter {
  write(part: unknown): void
}


export function criarWebSink(writer: WebStreamWriter, textId: string): TurnSink {
  return {
    
    onText(delta: string): void {
      
      
      writer.write({ type: 'text-delta', id: textId, delta })
    },

    
    onCitacoes(notas: NotaCitada[]): void {
      writer.write({ type: CITATIONS_DATA_TYPE, data: { notes: notas }, transient: true })
    },

    
    onArtefato(artefato: ArtifactRow): void {
      writer.write({ type: ARTIFACT_DATA_TYPE, data: { artifact: artefato }, transient: true })
    },

    
    onRascunhoMemoria(draft: MemoryDraft): void {
      writer.write({ type: MEMORY_DRAFT_DATA_TYPE, data: { draft }, transient: true })
    },

    
    onTransfer(agentId: string, resumo: string): void {
      writer.write({ type: TRANSFER_DATA_TYPE, data: { agentId, resumo }, transient: true })
    },

    
    onPainel(patch: PainelBlocoPatch): void {
      writer.write({ type: PAINEL_DATA_TYPE, data: { patch }, transient: true })
    },

    
    onEstudio(patch: EstudioPatch): void {
      writer.write({ type: ESTUDIO_DATA_TYPE, data: { patch }, transient: true })
    },

    
    onJuridico(patch: JuridicoPatch): void {
      writer.write({ type: JURIDICO_DATA_TYPE, data: { patch }, transient: true })
    },

    
    
    
    
    
    
    
    onProgresso(progresso: ToolProgresso): void {
      writer.write({
        type: FERRAMENTA_DATA_TYPE,
        data: {
          tool: progresso.tool,
          ...(progresso.detalhe ? { detalhe: progresso.detalhe } : {}),
          ...(progresso.contador ? { contador: progresso.contador } : {}),
        },
        transient: true,
      })
    },

    
    
    
    
    onInvestigacao(resumo: InvestigacaoResumo): void {
      writer.write({ type: INVESTIGACAO_DATA_TYPE, data: { investigacao: resumo }, transient: true })
    },

    
    
  }
}
