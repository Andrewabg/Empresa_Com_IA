
import { Committer, type ApplyResult } from '../../brain/curator/commit'
import type { Decision } from '../../brain/curator/consolidate'
import type { Operation } from '../../brain/curator/classify'
import { encurtarTitulo } from '@/lib/encurtarTitulo'
import { deriveId } from '@/lib/brain-frontmatter'
import { exigeAprovacaoDoDono } from './sensibilidadeDaPasta'


export const MAX_REASON_PR = 200

export class CommitterTituloSeguro extends Committer {
  override async apply(decision: Decision, ctx: { operation: Operation; touched: number }): Promise<ApplyResult> {
    conferirIdContraCaminho(decision)
    const reason = decision.reason
    const ajustado = typeof reason === 'string' && reason.length > MAX_REASON_PR
      ? { ...decision, reason: encurtarTitulo(reason, MAX_REASON_PR) }
      : decision
    return super.apply(ajustado, comAprovacaoQuandoSensivel(decision.path, ctx))
  }
}


export function conferirIdContraCaminho(decision: Decision): void {
  
  
  if (decision.action === 'ignore') return
  if (!decision.path || !decision.noteId) return
  const esperado = deriveId(decision.path)
  if (decision.noteId === esperado) return
  throw new Error(
    `[Committer] id da nota não corresponde ao caminho e a escrita foi recusada: ` +
    `id=${JSON.stringify(decision.noteId)} esperado=${JSON.stringify(esperado)} ` +
    `caminho=${JSON.stringify(decision.path)}`,
  )
}


export function comAprovacaoQuandoSensivel(
  path: string | undefined,
  ctx: { operation: Operation; touched: number },
): { operation: Operation; touched: number } {
  
  
  if (ctx.operation === 'delete') return ctx
  if (!path || !exigeAprovacaoDoDono(path)) return ctx
  return { ...ctx, operation: 'overwrite' }
}
