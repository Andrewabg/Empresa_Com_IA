



import { mergePecaBrief as mergePecaBriefImpl } from '@/data/pecas'
import { toCriativoView, type BriefEstruturado } from '@/lib/design/types'
import type { EstudioPatch } from '@/lib/estudio/types'

const CALMA_INEXISTENTE = 'Não achei esse criativo.'

export interface AtualizarBriefInput {
  pecaId: string
  objetivo?: string; publico?: string; oferta?: string; angulo?: string; restricoes?: string
  usarRosto?: boolean; referenciaId?: string
  placement?: string
}
export interface AtualizarBriefCtx { operatorId?: string; actingAgentId?: string }
export interface AtualizarBriefDeps { mergePecaBrief?: typeof mergePecaBriefImpl }
export interface AtualizarBriefResult { output: string; patch: EstudioPatch | null }

export async function atualizarBrief(
  input: AtualizarBriefInput, ctx: AtualizarBriefCtx, deps: AtualizarBriefDeps = {},
): Promise<AtualizarBriefResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const mergePecaBrief = deps.mergePecaBrief ?? mergePecaBriefImpl

  
  const patch: Partial<BriefEstruturado> = {}
  if (typeof input.objetivo === 'string') patch.objetivo = input.objetivo
  if (typeof input.publico === 'string') patch.publico = input.publico
  if (typeof input.oferta === 'string') patch.oferta = input.oferta
  if (typeof input.angulo === 'string') patch.angulo = input.angulo
  if (typeof input.restricoes === 'string') patch.restricoes = input.restricoes
  if (typeof input.usarRosto === 'boolean') patch.usarRosto = input.usarRosto
  if (typeof input.referenciaId === 'string') patch.referenciaId = input.referenciaId
  
  const placement = typeof input.placement === 'string' && input.placement.trim() ? input.placement.trim() : undefined

  const updated = await mergePecaBrief(input.pecaId, ctx.operatorId, patch, placement)
  if (!updated) return { output: CALMA_INEXISTENTE, patch: null }

  const criativo = toCriativoView(updated, updated.versoes.at(-1))
  return { output: `Anotei no briefing de "${updated.titulo || 'anúncio'}".`, patch: { op: 'upsert', entidade: 'criativo', criativo } }
}
