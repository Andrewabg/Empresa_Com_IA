
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

import { validarPlano } from '@/lib/maestro-plan'
import { cargosEquivalentes } from '@/lib/maestro/cargoMatch'
import { getTask, createTask, updateTask, type TaskRow } from '@/data/tasks'
import { createPlan } from '@/data/plans'
import { listAgents } from '@/data/agents'
import { createApproval, linkApprovalToTask, type Approval } from '@/data/approvals'
import { notificarAprovacao } from '@/server/proativo/producers'
import { appendMessage } from '@/data/messages'
import { avisoDePlanoEsperando } from '@/lib/aprovacoes/avisoNaSala'
import { payloadDaMensagem } from '@/lib/conversa/fechamentoDoTurno'
import { encurtarTitulo } from '@/lib/encurtarTitulo'
import { getTurnContext } from '../turnContext'


export interface PlanejarStep {
  role: string
  sub_objective: string
  depends_on: number[]
}

export interface PlanejarInput {
  steps: PlanejarStep[]
  orcamento_estimado_usd?: number
  
  objetivo?: string
}


export const MSG_FALTA_OBJETIVO =
  'Para montar o plano eu preciso do objetivo geral em uma frase. Chame de novo preenchendo o campo objetivo.'

export interface PlanejarDeps {
  
  taskId: () => string | undefined
  
  actingAgent: () => string | undefined
  
  conversationId: () => string | null | undefined
  
  operatorId: () => string | undefined
  
  criarTarefaRaiz: typeof createTask
  
  atualizarTarefa: typeof updateTask
  
  ligarAprovacaoNaTarefa: typeof linkApprovalToTask
  getTask: typeof getTask
  createPlan: typeof createPlan
  createApproval: typeof createApproval
  
  listAgents: () => Promise<AgenteAtivoLike[]>
  
  notificarAprovacao?: typeof notificarAprovacao
  
  appendMessage?: typeof appendMessage
}

export type PlanejarResult =
  | { status: 'pending_approval'; approvalId: string }
  | { status: 'erro'; message: string }


interface StepComOrdinal {
  ordinal: number
  role: string
  sub_objective: string
  depends_on: number[]
}


export interface AgenteAtivoLike {
  name: string
  role: string
  enabled: boolean
}


export function renderPlano(steps: StepComOrdinal[], orcamento?: number, agentes?: AgenteAtivoLike[]): string {
  const ativos = agentes?.filter((a) => a.enabled)
  const linhas = steps.map((s) => {
    const dep = s.depends_on.length ? ` (depende de: ${s.depends_on.join(', ')})` : ''
    let anot = ''
    if (ativos) {
      const existente = ativos.find((a) => cargosEquivalentes(a.role, s.role))
      anot = existente ? ` → reusa ${existente.name} (${existente.role})` : ' → CONTRATA NOVO'
    }
    return `${s.ordinal}. [${s.role}] ${s.sub_objective}${dep}${anot}`
  })
  if (orcamento != null) linhas.push('', `Orçamento estimado: US$ ${orcamento}`)
  return linhas.join('\n')
}

const defaultDeps: PlanejarDeps = {
  taskId: () => getTurnContext().taskId,
  actingAgent: () => getTurnContext().actingAgentId,
  conversationId: () => getTurnContext().conversationId,
  operatorId: () => getTurnContext().operatorId,
  criarTarefaRaiz: createTask,
  atualizarTarefa: updateTask,
  ligarAprovacaoNaTarefa: linkApprovalToTask,
  getTask,
  createPlan,
  createApproval,
  listAgents,
}


export async function planejarObjetivo(
  input: PlanejarInput,
  deps?: Partial<PlanejarDeps>,
): Promise<PlanejarResult> {
  const d: PlanejarDeps = { ...defaultDeps, ...deps }

  
  const stepsComOrdinais: StepComOrdinal[] = input.steps.map((s, i) => ({
    ordinal: i + 1,
    role: s.role,
    sub_objective: s.sub_objective,
    depends_on: s.depends_on,
  }))

  
  const v = validarPlano(stepsComOrdinais)
  if (!v.ok) return { status: 'erro', message: v.erro }

  
  
  
  
  
  
  const tid = d.taskId()
  const agenteQuePlaneja = d.actingAgent() ?? 'coo'
  let task: TaskRow
  let raizImplicita = false
  if (tid) {
    const doContexto = await d.getTask(tid)
    if (!doContexto) return { status: 'erro', message: 'Tarefa-raiz não encontrada.' }
    task = doContexto
  } else {
    const objetivo = (input.objetivo ?? '').trim()
    if (!objetivo) return { status: 'erro', message: MSG_FALTA_OBJETIVO }
    task = await d.criarTarefaRaiz({
      agent_id: agenteQuePlaneja,
      created_by: agenteQuePlaneja,
      conversation_id: d.conversationId() ?? null,
      objective: objetivo,
      operator_id: d.operatorId() ?? null,
    })
    raizImplicita = true
    
    
    
    await d.atualizarTarefa(task.id, { status: 'needs_approval' }, 'Esperando você aprovar.')
  }
  const objective = task.objective

  
  
  
  let agentes: AgenteAtivoLike[] | undefined
  try {
    agentes = await d.listAgents()
  } catch (err) {
    console.warn('[planejarObjetivo] listAgents falhou (fail-open, diff sem anotações):', err)
    agentes = undefined
  }

  
  
  
  
  
  let approval: Approval
  try {
    const { plan } = await d.createPlan(task.id, objective, stepsComOrdinais)
    approval = await d.createApproval({
      kind: 'plan',
      
      
      
      title: `Plano: ${encurtarTitulo(objective, 80)}`,
      diff: renderPlano(stepsComOrdinais, input.orcamento_estimado_usd, agentes),
      plan_id: plan.id,
      agent: agenteQuePlaneja,
      reason: 'Plano de orquestração aguardando aprovação',
      
      
      conversation_id: task.conversation_id,
    })
    
    
    
    if (raizImplicita) {
      await d.ligarAprovacaoNaTarefa(approval.id, task.id, agenteQuePlaneja)
      await d.atualizarTarefa(task.id, { approval_id: approval.id })
    }
  } catch (err) {
    if (raizImplicita) {
      await d.atualizarTarefa(task.id, { status: 'failed' }, 'Não consegui abrir o plano para sua aprovação.')
        .catch(() => {  })
    }
    throw err
  }
  
  
  
  void Promise.resolve()
    .then(() => (d.notificarAprovacao ?? notificarAprovacao)(approval))
    .catch(() => {})

  
  
  
  
  
  if (task.conversation_id) {
    const escrever = d.appendMessage ?? appendMessage
    void Promise.resolve()
      .then(() => escrever(
        task.conversation_id as string,
        'assistant',
        avisoDePlanoEsperando(objective),
        payloadDaMensagem({ socorro: true }),
      ))
      .catch((err) => { console.warn('[planejarObjetivo] aviso na sala falhou (não-fatal):', err) })
  }

  
  return { status: 'pending_approval', approvalId: approval.id }
}


export const planejarObjetivoTool = createTool({
  id: 'planejarObjetivo',
  description:
    'Decompõe o objetivo num plano de passos (cargo + sub-objetivo + dependências por ordinal) e abre pra aprovação do operador. Use 1x, no início, ANTES de delegar. Não execute nada antes do plano ser aprovado. Quando o pedido chega numa CONVERSA (e não dentro de uma tarefa que você já está executando), preencha também o campo objetivo com o objetivo geral em uma frase.',
  inputSchema: z.object({
    steps: z
      .array(
        z.object({
          role: z.string().describe('O cargo que executa este passo (ex.: Pesquisador, Redator).'),
          sub_objective: z.string().describe('O sub-objetivo claro deste passo.'),
          depends_on: z
            .array(z.number().int().positive())
            .describe('Ordinais (1-based) dos passos de que este depende. Vazio = sem dependências.'),
        }),
      )
      .describe('Os passos do plano, na ordem. O ordinal de cada passo é a sua posição (1-based).'),
    orcamento_estimado_usd: z.number().positive().optional().describe('Custo total estimado em USD (opcional).'),
    objetivo: z
      .string()
      .optional()
      .describe('O objetivo geral, em uma frase. Obrigatório quando o plano nasce de uma conversa; dentro de uma tarefa sua ele é ignorado (vale o objetivo da tarefa).'),
  }),
  
  execute: async ({ steps, orcamento_estimado_usd, objetivo }) => planejarObjetivo({ steps, orcamento_estimado_usd, objetivo }),
})
