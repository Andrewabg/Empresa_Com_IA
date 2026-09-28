
import { removeBloco as removeBlocoDefault } from '@/data/trafego'
import type { PainelBloco } from '@/lib/trafego/types'
import { SEM_OPERADOR, type BlocoToolCtx, type BlocoToolResult } from './blocoResult'

export interface RemoverBlocoInput {
  id: string
}

export interface RemoverBlocoDeps {
  removeBloco?: typeof removeBlocoDefault
}

export async function removerBloco(
  input: RemoverBlocoInput,
  ctx: BlocoToolCtx,
  deps: RemoverBlocoDeps = {},
): Promise<BlocoToolResult> {
  if (!ctx.operatorId) return { output: SEM_OPERADOR }
  const remove = deps.removeBloco ?? removeBlocoDefault
  await remove(input.id, ctx.operatorId)
  
  const bloco = { id: input.id } as unknown as PainelBloco
  return { output: 'Bloco removido do painel.', patch: { op: 'remove', bloco } }
}
