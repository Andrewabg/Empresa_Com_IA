
import { getCampanha as getCampanhaImpl, updateCampanhaPlanoItem as updItemImpl, setCampanhaStatus as setStatusImpl } from '@/data/campanhas'
import { createTask as createTaskImpl } from '@/data/tasks'
import { renderBriefParaPrompt } from '@/lib/estudio/renderBrief'
import { runTask } from '../../agent/executor/runTask'
import type { CampanhaRow } from '@/data/campanhas'

const CAP = 8 
const ELEGIVEL = new Set(['pendente', 'falhou'])

export interface ProduzirDeps {
  getCampanha?: (id: string) => Promise<CampanhaRow | null>
  createTask?: typeof createTaskImpl
  updateCampanhaPlanoItem?: typeof updItemImpl
  setCampanhaStatus?: typeof setStatusImpl
  run?: (id: string) => void
}
export interface ProduzirResult { produzidas: number; summary: string }

function objetivo(nome: string, i: number, n: number, it: { formato: string; canal: string; angulo: string }, briefStr: string): string {
  return `Produza a peça do plano da campanha "${nome}" (item ${i + 1}/${n}): formato=${it.formato}, canal=${it.canal}, ângulo=${it.angulo}. Brief: ${briefStr}. Use a tool gerarPeca; não responda em texto.`
}

export async function produzirCampanha(
  input: { campanhaId: string; operatorId: string }, deps: ProduzirDeps = {},
): Promise<ProduzirResult> {
  const getCampanha = deps.getCampanha ?? getCampanhaImpl
  const createTask = deps.createTask ?? createTaskImpl
  const updItem = deps.updateCampanhaPlanoItem ?? updItemImpl
  const setStatus = deps.setCampanhaStatus ?? setStatusImpl
  const fire = deps.run ?? ((id: string) => { void runTask(id) })

  const camp = await getCampanha(input.campanhaId)
  if (!camp || camp.operator_id !== input.operatorId) return { produzidas: 0, summary: 'Campanha não encontrada.' }
  const n = camp.plano.length
  const briefStr = renderBriefParaPrompt(camp.brief, '; ')

  const elegiveis = camp.plano.map((it, i) => ({ it, i })).filter(({ it }) => ELEGIVEL.has(it.status))
  if (!elegiveis.length) return { produzidas: 0, summary: 'Nada a produzir (plano vazio ou tudo em andamento/pronto).' }

  await setStatus(input.campanhaId, 'em_producao')
  let disparadas = 0
  for (const { it, i } of elegiveis) {
    const task = await createTask({
      agent_id: camp.agent_id || 'copywriter',
      created_by: 'copywriter',
      objective: objetivo(camp.nome, i, n, it, briefStr),
      operator_id: input.operatorId,
      campanha_id: input.campanhaId,
      plano_index: i,
    })
    await updItem(input.campanhaId, i, { task_id: task.id, status: 'produzindo' })
    if (disparadas < CAP) { fire(task.id); disparadas++ }
  }
  return { produzidas: elegiveis.length, summary: `Coloquei ${elegiveis.length} peça(s) na esteira. Vou te mostrar cada uma nascendo.` }
}
