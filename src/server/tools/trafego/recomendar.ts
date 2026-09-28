
import { upsertBloco as upsertBlocoDefault } from '@/data/trafego'
import { toPainelBloco, SEM_OPERADOR, type BlocoToolCtx, type BlocoToolResult } from './blocoResult'

export interface RecomendarEscopo {
  accountId?: string
  level?: 'account' | 'campaign' | 'adset' | 'ad'
  entityId?: string
}

export interface RecomendarInput {
  
  id?: string
  titulo: string
  diagnostico: string
  passos: string[]
  prioridade?: string | number
  escopo?: RecomendarEscopo
  position?: number
}

export interface RecomendarDeps {
  upsertBloco?: typeof upsertBlocoDefault
}

export async function recomendar(
  input: RecomendarInput,
  ctx: BlocoToolCtx,
  deps: RecomendarDeps = {},
): Promise<BlocoToolResult> {
  if (!ctx.operatorId) return { output: SEM_OPERADOR }
  const upsert = deps.upsertBloco ?? upsertBlocoDefault
  const row = await upsert({
    id: input.id,
    operator_id: ctx.operatorId,
    type: 'recommendation',
    config: {
      titulo: input.titulo,
      passos: input.passos,
      prioridade: input.prioridade,
      escopo: input.escopo,
    },
    annotation: input.diagnostico,
    position: input.position,
  })
  const bloco = toPainelBloco(row)
  return { output: `Recomendação "${input.titulo}" adicionada ao painel.`, patch: { op: 'upsert', bloco } }
}
