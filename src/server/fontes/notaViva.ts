








import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { getBrain as getBrainReal } from '@/server/brain/runtime'
import { withCloneLock } from '@/server/brain/cloneLock'
import { upsertFatoEmpresaSemRebaixar } from '@/data/fichaEmpresa'
import { slugFato } from '@/lib/memory/fichaEmpresa'
import type { FatoEmpresa } from '@/lib/memory/fichaEmpresa'
import { listPending } from '@/data/approvals'
import { registrarPrDoCerebro } from '@/server/brain/aprovacoesDoCerebro'
import { deriveId } from '@/lib/brain-frontmatter'
import { montarCorpoCarimbado, notaAindaENossa } from '@/lib/fontes/carimboDaNota'
import { RECUSA_NOTA_EDITADA_A_MAO } from '@/lib/fontes/mensagens'
import { RecusaDoNucleo } from './recusaDoNucleo'

export interface EscreverNotaVivaInput {
  path: string
  titulo: string
  corpo: string
  fatos: { rotulo: string; valor: string }[]
}


export interface RepoDaNotaViva {
  dir: string
  pull(): Promise<unknown>
}

export interface NotaVivaDeps {
  getBrain?: () => Promise<{
    repo: RepoDaNotaViva
    committer: { apply(decision: unknown, ctx: { operation: string; touched: number }): Promise<{ kind: string; ref?: string }> }
  }>
  upsertFato?: (f: FatoEmpresa) => Promise<void>
  agora?: () => string
  
  listarPendentes?: () => Promise<{ kind: string; path: string | null }[]>
  
  registrarPr?: (pr: { path: string; titulo?: string; corpo?: string; ref?: string }) => Promise<unknown>
  
  lerCorpoAtual?: (repo: RepoDaNotaViva, path: string) => string | null
  
  comLock?: <T>(fn: () => Promise<T>) => Promise<T>
}







function lerCorpoDoClone(repo: RepoDaNotaViva, path: string): string | null {
  const abs = join(repo.dir, path)
  if (!existsSync(abs)) return null
  return matter(readFileSync(abs, 'utf8')).content.trim()
}


export async function notaFoiEditadaAMao(path: string, deps: NotaVivaDeps = {}): Promise<boolean> {
  const getBrain = deps.getBrain ?? (getBrainReal as unknown as NonNullable<NotaVivaDeps['getBrain']>)
  const lerCorpoAtual = deps.lerCorpoAtual ?? lerCorpoDoClone
  const comLock = deps.comLock ?? withCloneLock

  const brain = await getBrain()
  return comLock(async () => {
    
    
    await brain.repo.pull()
    const corpoAtual = lerCorpoAtual(brain.repo, path)
    return corpoAtual !== null && !notaAindaENossa(corpoAtual)
  })
}

export async function escreverNotaViva(
  input: EscreverNotaVivaInput,
  deps: NotaVivaDeps = {},
): Promise<'salvo' | 'virou_pedido' | 'noop'> {
  const getBrain = deps.getBrain ?? (getBrainReal as unknown as NonNullable<NotaVivaDeps['getBrain']>)
  
  
  
  const upsertFato = deps.upsertFato ?? upsertFatoEmpresaSemRebaixar
  const agora = deps.agora ?? (() => new Date().toISOString())
  const listarPendentes = deps.listarPendentes ?? listPending
  const registrarPr = deps.registrarPr ?? registrarPrDoCerebro
  const lerCorpoAtual = deps.lerCorpoAtual ?? lerCorpoDoClone
  const comLock = deps.comLock ?? withCloneLock

  
  
  
  
  
  
  const pendentes = await listarPendentes().catch(() => [])
  if (pendentes.some((a) => a.kind === 'brain_pr' && a.path === input.path)) return 'virou_pedido'

  const at = agora()
  
  
  const brain = await getBrain()

  
  
  
  
  const corpoCarimbado = montarCorpoCarimbado(input.corpo, at.slice(0, 10))

  
  
  
  const res = await comLock(async () => {
    
    
    
    await brain.repo.pull()

    const corpoAtual = lerCorpoAtual(brain.repo, input.path)
    const existe = corpoAtual !== null

    
    
    
    
    
    
    if (existe && !notaAindaENossa(corpoAtual)) throw new RecusaDoNucleo(RECUSA_NOTA_EDITADA_A_MAO)

    const decision = {
      action: existe ? 'merge' : 'create',
      path: input.path,
      noteId: deriveId(input.path),
      title: input.titulo,
      body: corpoCarimbado,
      reason: `fontes: atualiza ${input.titulo}`,
    }

    return brain.committer.apply(decision, {
      operation: existe ? 'update' : 'create',
      touched: 1,
    })
  })

  
  
  
  
  
  
  
  
  
  
  
  
  
  if (res.kind === 'commit') {
    for (const f of input.fatos) {
      await upsertFato({
        id: slugFato(f.rotulo), rotulo: f.rotulo, valor: f.valor,
        categoria: 'dados', fonte: 'conversa', at,
      })
    }
  }

  if (res.kind === 'pr') {
    
    
    
    
    await registrarPr({ path: input.path, titulo: input.titulo, corpo: corpoCarimbado, ref: res.ref }).catch(() => {})
    return 'virou_pedido'
  }
  if (res.kind === 'noop') return 'noop'
  return 'salvo'
}
