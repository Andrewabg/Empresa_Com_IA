


import { getBlocoById as getBlocoImpl } from '@/data/trafego'
import { createTask as createTaskImpl } from '@/data/tasks'
import { lerCopyDoCriativo as lerCopyImpl } from './lerCopyDoCriativo'
import { descreverCriativo as descreverImpl, type DescricaoCriativo } from './descreverCriativo'
import { objetivoRuiParaLia } from '@/lib/trafego/objetivoRuiParaLia'
import { contextoDoAnuncio as contextoImpl, type ContextoDoAnuncio } from './contextoDoAnuncio'
import { runTask } from '../../agent/executor/runTask'
import type { BlocoRow } from '@/data/trafego'

export interface PedirCopyDeps {
  getBloco?: (operatorId: string, id: string) => Promise<BlocoRow | null>
  lerCopy?: (ctx: { adId: string; actingAgentId?: string }) => Promise<{ message?: string; headline?: string; description?: string } | null>
  descrever?: (ctx: { adId: string; actingAgentId?: string }) => Promise<DescricaoCriativo | null>
  
  contexto?: (input: { operatorId: string; adId: string }) => Promise<ContextoDoAnuncio>
  createTask?: typeof createTaskImpl
  run?: (id: string) => void
}
export interface PedirCopyResult { ok: boolean; taskId?: string; summary: string }

function copyToStr(c: { message?: string; headline?: string; description?: string } | null): string | undefined {
  if (!c) return undefined
  return [c.headline, c.message, c.description].filter(Boolean).join(' | ') || undefined
}

export async function pedirCopy(
  input: { blocoId: string; operatorId: string }, deps: PedirCopyDeps = {},
): Promise<PedirCopyResult> {
  const getBloco = deps.getBloco ?? getBlocoImpl
  const createTask = deps.createTask ?? createTaskImpl
  const lerCopy = deps.lerCopy ?? ((c) => lerCopyImpl(c))
  const descrever = deps.descrever ?? ((c) => descreverImpl(c))
  const contexto = deps.contexto ?? ((c) => contextoImpl(c))
  const fire = deps.run ?? ((id: string) => { void runTask(id) })

  const bloco = await getBloco(input.operatorId, input.blocoId)
  if (!bloco) return { ok: false, summary: 'Recomendação não encontrada.' }
  const escopo = (bloco.config?.escopo ?? {}) as { level?: string; entityId?: string }
  if (escopo.level !== 'ad' || !escopo.entityId) return { ok: false, summary: 'Só dá pra pedir copy de um anúncio específico.' }

  const copy = await lerCopy({ adId: escopo.entityId, actingAgentId: 'gestor-trafego' })
  let criativo: DescricaoCriativo | undefined
  try {
    criativo = (await descrever({ adId: escopo.entityId, actingAgentId: 'gestor-trafego' })) ?? undefined
  } catch {
    criativo = undefined 
  }
  const ctxAnuncio = await contexto({ operatorId: input.operatorId, adId: escopo.entityId })
  const objective = objetivoRuiParaLia({
    diagnostico: bloco.annotation ?? 'criativo fadigado',
    copyAtual: copyToStr(copy),
    criativo,
    ...(ctxAnuncio.nome ? { nomeAnuncio: ctxAnuncio.nome } : {}),
    ...(ctxAnuncio.causa ? { causa: ctxAnuncio.causa } : {}),
  })
  const task = await createTask({
    agent_id: 'copywriter', created_by: 'gestor-trafego', operator_id: input.operatorId, objective,
    
    
    terceiro_ingerido: true,
  })
  fire(task.id)
  return { ok: true, taskId: task.id, summary: 'Pedi pra Lia. A peça nova vai nascer no Estúdio dela.' }
}
