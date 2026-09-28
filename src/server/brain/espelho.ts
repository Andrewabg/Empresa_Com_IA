


import { getBrain } from './runtime'
import { NoteWriter } from './noteWriter'
import { reconcileResilient } from './reconcileResilient'
import { withCloneRepair } from './repairClone'
import { withCloneLock } from './cloneLock'
import { registrarPrDoCerebro } from './aprovacoesDoCerebro'


export interface EscreverNotaArgs {
  caminho: string; conteudo: string; titulo: string; tags: string[]
  commitMsg: string; authorAgent: string
}


async function commitOnce(a: EscreverNotaArgs): Promise<{ ok: boolean }> {
  const brain = await getBrain()
  return withCloneLock(async () => {
    const writer = new NoteWriter(brain.repo)
    writer.persist({
      mode: 'set',
      body: a.conteudo,
      intent: {
        path: a.caminho,
        title: a.titulo,
        suggestedTags: a.tags,
        authorAgent: a.authorAgent,
        confidence: 1,
        type: 'semantic',
      },
    })
    const result = await brain.committer.commitFile(a.caminho, a.commitMsg)
    if (result.kind === 'commit') {
      try {
        await reconcileResilient(brain.db, brain.repo, brain.sync, brain.embedder.version())
      } catch (err) {
        
        console.warn('[espelho] reconcile pós-commit falhou (não-fatal):', err instanceof Error ? err.message : err)
      }
    } else if (result.kind === 'pr') {
      
      
      
      
      await registrarPrDoCerebro({
        path: a.caminho, titulo: a.titulo, corpo: a.conteudo, ref: result.ref, agente: a.authorAgent,
      })
    }
    return { ok: true }
  })
}


export async function escreverNotaNoCerebro(a: EscreverNotaArgs): Promise<{ ok: boolean }> {
  try {
    
    
    return await withCloneRepair(() => commitOnce(a))
  } catch (err) {
    console.warn('[espelho] espelho falhou (não-fatal):', err instanceof Error ? err.message : err)
    return { ok: false }
  }
}
