
import { upsertBloco as upsertBlocoDefault } from '@/data/trafego'
import type { BlocoType } from '@/lib/trafego/types'
import { toPainelBloco, SEM_OPERADOR, type BlocoToolCtx, type BlocoToolResult } from './blocoResult'

export interface MontarBlocoInput {
  id?: string
  type: BlocoType
  config?: Record<string, unknown>
  annotation?: string | null
  position?: number
  snapshot_id?: string | null
}

export interface MontarBlocoDeps {
  upsertBloco?: typeof upsertBlocoDefault
}

export async function montarBloco(
  input: MontarBlocoInput,
  ctx: BlocoToolCtx,
  deps: MontarBlocoDeps = {},
): Promise<BlocoToolResult> {
  if (!ctx.operatorId) return { output: SEM_OPERADOR }
  const upsert = deps.upsertBloco ?? upsertBlocoDefault
  const row = await upsert({
    id: input.id,
    operator_id: ctx.operatorId,
    type: input.type,
    
    
    config: input.config,
    annotation: input.annotation,
    position: input.position,
    snapshot_id: input.snapshot_id,
  })
  const bloco = toPainelBloco(row)
  const verbo = input.id ? 'atualizado' : 'adicionado'
  return { output: `Bloco "${row.type}" ${verbo} no painel.`, patch: { op: 'upsert', bloco } }
}
