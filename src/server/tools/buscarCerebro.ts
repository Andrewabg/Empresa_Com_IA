
import { recall } from '../memory/recall'
import type { ReadBrain } from '../brain/readBrain'
import { estaArquivada } from '@/lib/brain/arquivoDeNotas'
import { escopoDeLeitura, dentroDoEscopo } from '@/lib/brain/escopoDeLeitura'


export interface NotaCitada {
  id: string
  título: string | null
  trecho: string
  caminho: string
  agente: string | null
  quando: string | null
  
  origem?: 'nota' | 'episodic'
  
  fonte?: string | null
  
  tipo?: string | null
}

type Brain = ReadBrain


export async function buscarCerebro(query: string, k = 8, brain?: Brain, agentId?: string | null): Promise<NotaCitada[]> {
  
  
  const { notes } = await recall(query, k, { brain, agentId: agentId ?? null })
  return notes
}


export interface ScopeContext {
  
  episodicAgentId?: string | null
}


export function applyScopes(
  notesEntrada: NotaCitada[],
  scopes: string[] | null | undefined,
  ctx?: ScopeContext,
): NotaCitada[] {
  
  
  
  
  const notes = notesEntrada.filter((n) => !estaArquivada(n.caminho ?? ''))

  
  
  
  const escopo = escopoDeLeitura(scopes)
  if (escopo.modo === 'tudo') {
    
    if (ctx?.episodicAgentId != null) {
      console.warn(
        `[buscarCerebro/applyScopes] contratado ${JSON.stringify(ctx.episodicAgentId)} leu SEM brain_read_scopes ` +
        `→ notas git NÃO escopadas (lê tudo). Provável config quebrada; o episódico segue escopado pelo RPC.`,
      )
    }
    return notes
  }
  
  
  
  if (escopo.modo === 'nada') return notes.filter((n) => n.origem === 'episodic')
  
  return notes.filter((n) => {
    if (n.origem === 'episodic') return true 
    return dentroDoEscopo(n.caminho ?? '', escopo.prefixos)
  })
}
