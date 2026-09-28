

import { getContrato as getContratoImpl, setContratoStatus as setStatusImpl } from '@/data/contratos'
import { enqueueMemoryJob as enqueueImpl } from '@/data/memoryJobs'
import { espelharContratoNoCerebro as espelharImpl } from './espelhoJuridico'
import { extrairPrazos as extrairPrazosImpl } from './extrairPrazos'
import { espelharEntregavelDaTarefa } from '../espelharEntregavel'
import { toContratoView, type JuridicoPatch } from '@/lib/juridico/types'

export interface FinalizarContratoInput { contratoId: string }
export interface FinalizarContratoCtx { operatorId?: string; taskId?: string | null; conversationId?: string | null }
export interface FinalizarContratoDeps {
  getContrato?: typeof getContratoImpl
  setContratoStatus?: typeof setStatusImpl
  espelhar?: typeof espelharImpl
  enqueueMemoryJob?: typeof enqueueImpl
  extrairPrazos?: typeof extrairPrazosImpl
  
  espelharEntregavel?: typeof espelharEntregavelDaTarefa
}
export interface FinalizarContratoResult { output: string; patch: JuridicoPatch | null; patches?: JuridicoPatch[] }

export async function finalizarContrato(
  input: FinalizarContratoInput, ctx: FinalizarContratoCtx, deps: FinalizarContratoDeps = {},
): Promise<FinalizarContratoResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const getContrato = deps.getContrato ?? getContratoImpl
  const setStatus = deps.setContratoStatus ?? setStatusImpl
  const espelhar = deps.espelhar ?? espelharImpl
  const espelharEntregavel = deps.espelharEntregavel ?? espelharEntregavelDaTarefa
  const enqueue = deps.enqueueMemoryJob ?? enqueueImpl
  const extrair = deps.extrairPrazos ?? extrairPrazosImpl
  const operatorId = ctx.operatorId

  
  const row = await getContrato(input.contratoId, operatorId)
  if (!row) return { output: 'Não achei esse contrato na Mesa — confere qual você quer finalizar?', patch: null }

  
  if (row.kind !== 'gerado') {
    const output = row.kind === 'analisado'
      ? 'Análises não finalizam — quer que eu arquive?'
      : 'Isso já é um modelo da casa.'
    return { output, patch: null }
  }

  
  const rowAtual = await setStatus(input.contratoId, operatorId, 'finalizado')
  const view = toContratoView(rowAtual)

  
  let res = { ok: false }
  try { res = await espelhar(view) } catch { res = { ok: false } }

  
  
  
  
  await espelharEntregavel(
    { taskId: ctx.taskId, conversationId: ctx.conversationId, actingAgentId: row.agent_id },
    { kind: 'documento', title: view.titulo, content: view.texto },
  )

  
  try { await enqueue('reflect_juridico', operatorId) } catch (e) { console.warn('[finalizarContrato] enqueue (fail-open):', e) }

  const patch: JuridicoPatch = { op: 'upsert', entidade: 'contrato', contrato: view }

  
  let patches: JuridicoPatch[] = []
  try {
    const pr = await extrair({ contratoId: input.contratoId }, { operatorId })
    if (pr.patch) patches = [pr.patch]
  } catch (e) { console.warn('[finalizarContrato] extrairPrazos (fail-open):', e) }

  const output = `Finalizei o contrato "${view.titulo}".` +
    (res.ok
      ? ' Guardei uma cópia no Segundo Cérebro.'
      : ' (Não consegui guardar no Cérebro agora — dá pra tentar de novo depois.)')
  return { output, patch, patches }
}
