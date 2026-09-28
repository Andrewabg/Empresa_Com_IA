
import { withCloneLock } from './cloneLock'
import { reconcileResilient } from './reconcileResilient'
import { NoteWriter } from './noteWriter'
import { registrarPrDoCerebro } from './aprovacoesDoCerebro'
import { getBrain } from './runtime'
import { isSafeNotePath } from '@/lib/brain/safePath'
import { mensagemDoCommit, normalizarEdicao, validarEdicao, type EdicaoNota } from '@/lib/brain/edicaoDeNota'

type Brain = Awaited<ReturnType<typeof getBrain>>

export type EditarNotaResult =
  | { status: 'salvo'; indice_atrasado?: true }
  
  | { status: 'virou_pedido'; url?: string }
  | { status: 'nao_encontrada' }
  | { status: 'recusado'; aviso: string }

export interface EditarNotaInput {
  path: string
  titulo: string
  corpo: string
}


export async function lerNota(path: string, brain?: Brain): Promise<EdicaoNota | null> {
  if (!isSafeNotePath(path) || !path.endsWith('.md')) return null
  const b = brain ?? (await getBrain())
  return withCloneLock(async () => {
    await b.repo.pull()
    try {
      const nota = b.repo.readNote(path)
      return { titulo: nota.title ?? '', corpo: nota.body }
    } catch {
      return null
    }
  })
}


export async function editarNota(input: EditarNotaInput, brain?: Brain): Promise<EditarNotaResult> {
  
  
  if (!isSafeNotePath(input.path) || !input.path.endsWith('.md')) {
    return { status: 'recusado', aviso: 'Não reconheço essa nota.' }
  }

  const b = brain ?? (await getBrain())

  return withCloneLock(async () => {
    
    
    await b.repo.pull()

    let atual: EdicaoNota
    try {
      const nota = b.repo.readNote(input.path)
      atual = { titulo: nota.title ?? '', corpo: nota.body }
    } catch {
      
      return { status: 'nao_encontrada' }
    }

    
    const veredito = validarEdicao({ titulo: input.titulo, corpo: input.corpo }, atual)
    if (!veredito.ok) return { status: 'recusado', aviso: veredito.aviso }

    const { titulo, corpo } = normalizarEdicao({ titulo: input.titulo, corpo: input.corpo })

    
    
    new NoteWriter(b.repo).persist({
      mode: 'edit',
      body: corpo,
      intent: { path: input.path, title: titulo },
    })

    
    
    
    const aplicado = await b.committer.commitFile(input.path, mensagemDoCommit(titulo))
    if (aplicado?.kind !== 'commit') {
      
      
      
      if (aplicado?.kind === 'pr') {
        await registrarPrDoCerebro({ path: input.path, titulo, corpo, ref: aplicado.ref })
      }
      return { status: 'virou_pedido', ...(aplicado?.ref ? { url: aplicado.ref } : {}) }
    }

    try {
      await reconcileResilient(b.db, b.repo, b.sync, b.embedder.version())
    } catch (err) {
      
      console.warn('[editarNota] reindexação falhou (o commit já subiu):', err)
      return { status: 'salvo', indice_atrasado: true }
    }

    return { status: 'salvo' }
  })
}
