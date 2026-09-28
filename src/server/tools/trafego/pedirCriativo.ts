import { getBlocoById as getBlocoImpl } from '@/data/trafego'
import { createTask as createTaskImpl } from '@/data/tasks'
import { descreverCriativo as descreverImpl, type DescricaoCriativo } from './descreverCriativo'
import { objetivoRuiParaTeo } from '@/lib/trafego/objetivoRuiParaTeo'
import { contextoDoAnuncio as contextoImpl, type ContextoDoAnuncio } from './contextoDoAnuncio'
import { runTask } from '../../agent/executor/runTask'
import type { BlocoRow } from '@/data/trafego'

export interface PedirCriativoDeps {
  getBloco?: (operatorId: string, id: string) => Promise<BlocoRow | null>
  descrever?: (ctx: { adId: string; actingAgentId?: string }) => Promise<DescricaoCriativo | null>
  
  contexto?: (input: { operatorId: string; adId: string }) => Promise<ContextoDoAnuncio>
  createTask?: typeof createTaskImpl
  run?: (id: string) => void
}
export interface PedirCriativoResult { ok: boolean; taskId?: string; summary: string }

export async function pedirCriativo(
  input: { blocoId: string; operatorId: string }, deps: PedirCriativoDeps = {},
): Promise<PedirCriativoResult> {
  const getBloco = deps.getBloco ?? getBlocoImpl
  const createTask = deps.createTask ?? createTaskImpl
  const descrever = deps.descrever ?? ((c) => descreverImpl(c))
  const contexto = deps.contexto ?? ((c) => contextoImpl(c))
  const fire = deps.run ?? ((id: string) => { void runTask(id) })

  const bloco = await getBloco(input.operatorId, input.blocoId)
  if (!bloco) return { ok: false, summary: 'Recomendação não encontrada.' }
  const escopo = (bloco.config?.escopo ?? {}) as { level?: string; entityId?: string }
  if (escopo.level !== 'ad' || !escopo.entityId) return { ok: false, summary: 'Só dá pra pedir criativo de um anúncio específico.' }

  let criativo: DescricaoCriativo | undefined
  try {
    criativo = (await descrever({ adId: escopo.entityId, actingAgentId: 'gestor-trafego' })) ?? undefined
  } catch {
    criativo = undefined 
  }
  
  
  const ctxAnuncio = await contexto({ operatorId: input.operatorId, adId: escopo.entityId })
  const objective = objetivoRuiParaTeo({
    diagnostico: bloco.annotation ?? 'criativo precisa renovar',
    criativo,
    ...(ctxAnuncio.nome ? { nomeAnuncio: ctxAnuncio.nome } : {}),
    ...(ctxAnuncio.causa ? { causa: ctxAnuncio.causa } : {}),
  })
  const task = await createTask({
    agent_id: 'designer', created_by: 'gestor-trafego', operator_id: input.operatorId, objective,
    
    
    terceiro_ingerido: true,
  })
  fire(task.id)
  return { ok: true, taskId: task.id, summary: 'Pedi pro Téo. O criativo novo vai nascer no Estúdio dele.' }
}
