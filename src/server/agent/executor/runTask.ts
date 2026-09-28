
import { runAgentRound, type HeadlessAgentLike } from './headlessRun'
import { claimTask, getTask, updateTask } from '@/data/tasks'
import type { TaskRow } from '@/data/tasks'
import { getAgent, SEED_PRIMARY_AGENT } from '../jarvis'
import { getAgentRow, listAgents } from '@/data/agents'
import { renderRoster } from '@/lib/roster'
import { shouldReflectTask } from '@/lib/reflectGate'
import { enqueueMemoryJob } from '@/data/memoryJobs'
import { linkApprovalToTask } from '@/data/approvals'
import { recordCost, readBudgetGate } from '@/data/cost'
import { estourouBudget } from '@/lib/cost-guard'
import { recordEvent } from '@/data/events'
import { appendMessage } from '@/data/messages'
import { ledgerSemApuracao, resumoDoLedger, type Ledger } from '@/lib/trafego/graph/ledger'
import { rotuloDoEventoDeInvestigacao, textoDaNotaDaInvestigacao } from '@/lib/trafego/graph/rastro'
import { gravarNotaDaInvestigacao } from '@/data/trafego'
import { getSetting } from '@/data/settings'
import { blocoRelogio, tzSegura, comContextoNaUltimaMsg } from '@/lib/relogio'
import { cortadoPeloPrazo, payloadDaMensagem, LINHA_DEMORA } from '@/lib/conversa/fechamentoDoTurno'
import { motivoSeguro } from '@/lib/sanitizarErro'
import { costUsd } from '@/server/cost/pricing'
import { runWithTurnContext, getTurnContext, marcarTerceiroIngerido } from '../turnContext'
import { ferramentaIngereTerceiro, algumaNotaTrazTerceiro } from '@/lib/turno/conteudoDeTerceiro'
import type { NotaCitada } from '@/server/tools/buscarCerebro'
import {
  resultadoComAvisoDeRecusa,
  rotuloDoEventoDeRecusa,
  type RecusaDeAtoDeDono,
} from '@/lib/turno/papelDoTurno'
import { onChildTerminal } from '../maestro/join'
import { driverStep, defaultDriverDeps } from '../maestro/driver'
import {
  getCampanha as getCampanhaImpl,
  updateCampanhaPlanoItem as updCampanhaItemImpl,
  setCampanhaStatus as setCampanhaStatusImpl,
} from '@/data/campanhas'
import { proximoStatusCampanha } from '@/lib/estudio/campanha'
import { resolverOrigemSolicitante } from '@/lib/origemSolicitante'
import { deveNotificarTarefa } from '@/server/proativo/producers'
import { notificar } from '@/server/proativo/notificar'
import { assembleAgentContext } from '@/server/memory/agentContext'
import { listAnexosDaConversa } from '@/data/messages'
import { renderMateriaisConversa } from '@/lib/conversa/materiais'
import { MSG_TAREFA_SEM_TEXTO, MSG_TAREFA_VAZIA, MSG_TAREFA_MODELO_MUDO, MSG_TAREFA_SEM_ORCAMENTO, ehSocorroDeTarefa } from '@/lib/tarefas/desfecho'
import { registrarSeAcionavel } from '@/server/modelo/alerta'
import type { Papel } from '@/lib/equipe'
import { papelDoUsuario } from '@/data/equipe'
import { passosDoAgente } from '@/lib/turno/passos'

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
const STEP_CAP = 24 


const RODADA_DA_INVESTIGACAO_MS = 540_000


export const MSG_TAREFA_DEMOROU =
  'Essa tarefa demorou mais do que o normal e eu encerrei para ela não ficar presa para sempre. Parte do trabalho pode já ter sido feita, então confira o que ficou pronto antes de pedir de novo.'




export { MSG_TAREFA_SEM_TEXTO, ehSocorroDeTarefa } from '@/lib/tarefas/desfecho'

export interface RunTaskDeps {
  getAgent?: (id: string) => Promise<HeadlessAgentLike>
  
  assembleContext?: (
    agentId: string,
    prompt: string,
    opts: { operatorId?: string; notasInjetadas?: NotaCitada[] },
  ) => Promise<{ stable: string; recall: string }>
  
  runRound?: typeof runAgentRound
  
  registrarErroDoModelo?: (erro: unknown) => void
  
  papelDoOperador?: (operatorId: string) => Promise<Papel | null>
  
  checkBudget?: () => Promise<{ spentUsd: number; budgetUsd: number }>
}

type TerminalStatus = 'done' | 'failed' | 'cancelled'
type Msg = { role: string; content: string }


const defaultGetAgent: (id: string) => Promise<HeadlessAgentLike> = (id) =>
  getAgent(id) as Promise<HeadlessAgentLike>


function msg(err: unknown): string {
  return motivoSeguro(err)
}


async function reportTransition(task: TaskRow, status: string, text: string): Promise<void> {
  const socorro = ehSocorroDeTarefa(status, text)
  try {
    await recordEvent({
      
      
      id: `task:${task.id}:${status}:${task.steps}`,
      type: 'action',
      label: `Tarefa ${status}: ${text.slice(0, 120)}`,
      agent: task.agent_id,
    })
  } catch (err) {
    console.warn('[runTask] recordEvent falhou (não-fatal):', err)
  }
  if (task.conversation_id) {
    try {
      await appendMessage(task.conversation_id, 'assistant', text, payloadDaMensagem({ socorro }))
    } catch (err) {
      console.warn('[runTask] appendMessage de report falhou (não-fatal):', err)
    }
  }
}


function resultadoComRemateDeDemora(texto: string, fechamentoExpirou: boolean | undefined): string {
  return fechamentoExpirou && texto.trim() ? `${texto}${LINHA_DEMORA}` : texto
}


async function registrarRecusasDeAtoDeDono(
  taskId: string,
  recusas: readonly RecusaDeAtoDeDono[] | undefined,
): Promise<void> {
  if (!recusas?.length) return
  try {
    await recordEvent({
      id: `task:${taskId}:recusa-ato-de-dono`,
      type: 'action',
      label: rotuloDoEventoDeRecusa(recusas),
    })
  } catch (err) {
    console.warn('[runTask] rastro da recusa de ato de dono falhou (não-fatal):', err)
  }
}


async function registrarRastroDaInvestigacao(t: TaskRow, ledger: Ledger | undefined): Promise<void> {
  
  
  if (!ledger || ledgerSemApuracao(ledger)) return
  const agoraMs = Date.now()
  try {
    await recordEvent({
      id: `task:${t.id}:investigacao`,
      type: 'tool',
      label: rotuloDoEventoDeInvestigacao(resumoDoLedger(ledger, agoraMs)),
      agent: t.agent_id,
    })
  } catch (err) {
    console.warn('[runTask] rastro da investigação falhou (não-fatal):', err)
  }
  if (t.agent_id === 'gestor-trafego' && t.operator_id) {
    try {
      
      
      
      
      
      const tz = tzSegura(await getSetting('operator_timezone').catch(() => null))
      await gravarNotaDaInvestigacao(
        t.operator_id,
        textoDaNotaDaInvestigacao(ledger, new Date(agoraMs).toISOString(), tz),
      )
    } catch (err) {
      console.warn('[runTask] nota da investigação no painel falhou (não-fatal):', err)
    }
  }
}


export async function finalize(taskId: string, status: TerminalStatus, result: string): Promise<void> {
  
  
  
  
  
  
  
  
  
  
  const recusas = getTurnContext().recusasSemPessoa
  const resultComAviso = resultadoComAvisoDeRecusa(result, recusas)
  
  
  await updateTask(taskId, { status, result: resultComAviso }, resultComAviso)
  await registrarRecusasDeAtoDeDono(taskId, recusas)
  const t = await getTask(taskId)
  if (t) {
    await reportTransition(t, status, result)
    await registrarRastroDaInvestigacao(t, getTurnContext().investigacao?.ledger)
    
    
    
    let agenteNome = ''
    if (!t.parent_task_id && !t.plan_id && status !== 'cancelled') {
      agenteNome = await getAgentRow(t.agent_id).then((r) => r?.name ?? '').catch(() => '')
    }
    const n = deveNotificarTarefa(t, status, result, agenteNome)
    if (n) void notificar(n)
    try {
      await onChildTerminal({ id: t.id, parent_task_id: t.parent_task_id, status: t.status, result: t.result })
    } catch (err) {
      console.warn('[runTask] onChildTerminal falhou (não-fatal):', err)
    }
    try {
      await onCampanhaTaskTerminal({ id: t.id, status: t.status, campanha_id: t.campanha_id, plano_index: t.plano_index }, {})
    } catch (err) {
      console.warn('[runTask] onCampanhaTaskTerminal falhou (não-fatal):', err)
    }
    await maybeEnqueueReflectTask({ id: t.id, agent_id: t.agent_id, status: t.status, plan_id: t.plan_id ?? null })
  }
}


export async function maybeEnqueueReflectTask(
  t: { id: string; agent_id: string; status: string; plan_id: string | null },
  deps: { enqueue?: (kind: 'reflect_task', ref: string) => Promise<{ enqueued: boolean }> } = {},
): Promise<void> {
  try {
    if (!shouldReflectTask(t, SEED_PRIMARY_AGENT.id)) return
    const enqueue = deps.enqueue ?? ((kind: 'reflect_task', ref: string) => enqueueMemoryJob(kind, ref))
    await enqueue('reflect_task', t.id)
  } catch (err) {
    console.warn('[finalize] enqueue reflect_task falhou (não-fatal):', err)
  }
}


export async function onCampanhaTaskTerminal(
  task: { campanha_id: string | null; plano_index: number | null; id?: string; status?: string },
  deps: {
    getCampanha?: typeof getCampanhaImpl
    updateCampanhaPlanoItem?: typeof updCampanhaItemImpl
    setCampanhaStatus?: typeof setCampanhaStatusImpl
  } = {},
): Promise<void> {
  if (!task.campanha_id || task.plano_index == null) return
  const getCampanha = deps.getCampanha ?? getCampanhaImpl
  const updItem = deps.updateCampanhaPlanoItem ?? updCampanhaItemImpl
  const setStatus = deps.setCampanhaStatus ?? setCampanhaStatusImpl
  try {
    const cur = await getCampanha(task.campanha_id)
    const item = cur?.plano[task.plano_index]
    if (!item) return

    
    
    
    if (task.id && item.arte_task_id === task.id) {
      if (item.arte_status === 'produzindo') {
        await updItem(task.campanha_id, task.plano_index, {
          arte_status: task.status === 'done' ? 'pronta' : 'falhou',
        })
      }
      return 
    }

    if (item.status === 'produzindo') {
      const nova = await updItem(task.campanha_id, task.plano_index, { status: 'falhou' })
      if (proximoStatusCampanha(nova.plano) === 'concluida') {
        await setStatus(task.campanha_id, 'concluida')
      }
    }
  } catch (err) {
    console.warn('[runTask] onCampanhaTaskTerminal falhou (não-fatal):', err)
  }
}

export async function runTask(id: string, deps: RunTaskDeps = {}): Promise<void> {
  const getAgentFn = deps.getAgent ?? defaultGetAgent
  const assembleContextFn = deps.assembleContext ?? assembleAgentContext
  const runRoundFn = deps.runRound ?? runAgentRound
  const checkBudgetFn = deps.checkBudget ?? readBudgetGate

  
  const claimedOrNull = await claimTask(id, ['queued'])
  if (!claimedOrNull) return 
  
  
  const claimed: TaskRow = claimedOrNull

  try {
    
    const row = await getAgentRow(claimed.agent_id)
    if (!row || !row.enabled) {
      await finalize(claimed.id, 'failed', 'Executor indisponível (agente inexistente ou desabilitado).')
      return
    }

    
    
    
    
    
    const resolverPapel = deps.papelDoOperador ?? papelDoUsuario
    const papel: Papel | undefined = claimed.operator_id
      ? ((await resolverPapel(claimed.operator_id).catch((err) => {
          console.warn('[runTask] papelDoOperador falhou (papel fica indefinido, tarefa segue):', err)
          return null
        })) ?? undefined)
      : undefined

    
    
    
    
    
    if (claimed.plan_id) {
      await runWithTurnContext(
        { conversationId: claimed.conversation_id, actingAgentId: claimed.agent_id, taskId: claimed.id,
          
          
          operatorId: claimed.operator_id ?? undefined,
          papel },
        () => driverStep(claimed, defaultDriverDeps()),
      )
      return
    }

    const maxSteps = passosDoAgente(row.tools, papel, 'executor', row.budget)
    
    
    
    const investiga = Boolean(row.tools?.investigacao)
    const taskBudget = claimed.budget_usd ?? row.budget?.per_task_usd ?? null
    
    
    const effectiveModel = row.model ?? OPENAI_MODEL

    let agent: HeadlessAgentLike
    try {
      agent = await getAgentFn(claimed.agent_id)
    } catch (err) {
      await finalize(claimed.id, 'failed', `Não consegui montar o executor: ${msg(err)}`)
      return
    }

    
    
    
    
    
    
    
    
    const retomada = Array.isArray(claimed.working_state) && (claimed.working_state as Msg[]).length > 0
    
    
    const notasInjetadas: NotaCitada[] = []
    let messages: Msg[]
    if (retomada) {
      messages = claimed.working_state as Msg[]
    } else {
      const { stable, recall } = await assembleContextFn(
        claimed.agent_id,
        claimed.objective,
        { operatorId: claimed.operator_id ?? undefined, notasInjetadas },
      )
      
      
      
      
      
      
      const materiais = claimed.conversation_id
        ? await listAnexosDaConversa(claimed.conversation_id)
            .then((lista) => renderMateriaisConversa(lista))
            .catch((err) => {
              console.warn('[runTask] materiais da sala falharam (fail-open):', err)
              return ''
            })
        : ''
      const seed: Msg[] = []
      if (stable) seed.push({ role: 'system', content: stable })
      if (materiais) seed.push({ role: 'system', content: materiais })
      seed.push({ role: 'user', content: recall ? `${claimed.objective}\n\n${recall}` : claimed.objective })
      messages = seed
    }
    let spent = Number(claimed.spent_usd ?? 0)
    let steps = claimed.steps ?? 0
    
    
    
    
    
    const tzRelogio = tzSegura(await getSetting('operator_timezone').catch(() => null))
    
    
    
    
    
    
    
    const blocoRoster = row.tools?.planejarObjetivo
      ? await listAgents()
          .then((a) => renderRoster(a, claimed.agent_id) || '')
          .catch((err) => {
            console.warn('[runTask] roster falhou (fail-open):', err)
            return ''
          })
      : ''

    
    
    const recusasSemPessoa: RecusaDeAtoDeDono[] = []
    let recusasRegistradas = 0

    
    
    
    
    
    async function loop(): Promise<void> {
      
      
      
      let vaziasSeguidas = 0
      for (;;) {
        if (steps >= STEP_CAP) {
          await finalize(claimed.id, 'failed', 'Teto de passos atingido (anti-runaway).')
          return
        }
        if (taskBudget != null && spent >= taskBudget) {
          await finalize(claimed.id, 'failed', `Orçamento de US$ ${taskBudget} esgotado.`)
          return
        }

        
        
        
        
        
        if (investiga) {
          let budgetEstourou = false
          try {
            const { spentUsd, budgetUsd } = await checkBudgetFn()
            budgetEstourou = estourouBudget(spentUsd, budgetUsd)
          } catch (e) {
            
            console.warn('[runTask] leitura de budget falhou (fail-open, segue a investigação):', e)
            budgetEstourou = false
          }
          if (budgetEstourou) {
            await finalize(claimed.id, 'failed', MSG_TAREFA_SEM_ORCAMENTO)
            return
          }
        }

        
        const contextoRound = [blocoRelogio(new Date().toISOString(), tzRelogio), blocoRoster]
          .filter(Boolean)
          .join('\n\n')
        const round = await runRoundFn(agent, comContextoNaUltimaMsg(messages, contextoRound), {
          maxSteps,
          
          
          ...(investiga ? { fechamento: true, ...(papel === 'dono' ? { rodadaMaxMs: RODADA_DA_INVESTIGACAO_MS } : {}) } : {}),
          onStep: async () => {
            try { await updateTask(claimed.id, { heartbeat_at: new Date().toISOString() }) } catch {  }
          },
          
          
          
          onErroDoModelo: deps.registrarErroDoModelo ?? registrarSeAcionavel,
          
          
          
          
          
          onToolCall: ({ toolName }) => {
            if (ferramentaIngereTerceiro(toolName)) marcarTerceiroIngerido()
          },
        })

        steps += 1
        spent += costUsd(effectiveModel, round.inputTokens, round.outputTokens, round.cachedTokens ?? 0)
        try {
          await recordCost({
            kind: 'chat',
            model: effectiveModel,
            promptTokens: round.inputTokens,
            completionTokens: round.outputTokens,
            cachedTokens: round.cachedTokens,
            agent: claimed.agent_id, 
            task_id: claimed.id,
          })
        } catch {  }

        
        
        
        if (recusasSemPessoa.length > recusasRegistradas) {
          recusasRegistradas = recusasSemPessoa.length
          await registrarRecusasDeAtoDeDono(claimed.id, recusasSemPessoa)
        }

        if (round.text) messages = [...messages, { role: 'assistant', content: round.text }]

        
        await updateTask(claimed.id, {
          steps,
          spent_usd: spent,
          working_state: messages,
          heartbeat_at: new Date().toISOString(),
        })

        
        if (round.pendingApprovalId) {
          
          await linkApprovalToTask(round.pendingApprovalId, claimed.id, claimed.agent_id)
          await updateTask(claimed.id, { status: 'needs_approval', approval_id: round.pendingApprovalId }, 'Esperando você aprovar.')
          const fresh = await getTask(claimed.id)
          if (fresh) await reportTransition(fresh, 'needs_approval', 'Tarefa aguarda sua aprovação.')
          return
        }

        
        
        
        
        
        
        
        
        
        
        
        
        
        if (cortadoPeloPrazo(round)) {
          
          
          
          
          
          
          
          
          
          
          
          
          if (round.fechamentoEscreveu && round.text.trim()) {
            await finalize(claimed.id, 'done', resultadoComRemateDeDemora(round.text, round.fechamentoExpirou))
            return
          }
          await finalize(claimed.id, 'failed', MSG_TAREFA_DEMOROU)
          return
        }

        if (taskBudget != null && spent >= taskBudget) {
          await finalize(claimed.id, 'failed', `Orçamento de US$ ${taskBudget} esgotado.`)
          return
        }

        if (round.finished) {
          
          
          
          
          
          if (round.erroDoModelo) {
            
            
            await finalize(claimed.id, 'failed', MSG_TAREFA_MODELO_MUDO)
            return
          }
          if (!round.text && !round.rodouFerramenta) {
            
            
            
            
            if (vaziasSeguidas === 0) {
              vaziasSeguidas++
              continue
            }
            await finalize(claimed.id, 'failed', MSG_TAREFA_VAZIA)
            return
          }
          await finalize(
            claimed.id,
            'done',
            resultadoComRemateDeDemora(round.text, round.fechamentoExpirou) || MSG_TAREFA_SEM_TEXTO,
          )
          return
        }
        vaziasSeguidas = 0
        
      }
    }

    
    
    
    
    await runWithTurnContext(
      { conversationId: claimed.conversation_id, actingAgentId: claimed.agent_id, taskId: claimed.id,
        operatorId: claimed.operator_id ?? undefined,
        papel,
        
        
        recusasSemPessoa,
        
        
        
        
        
        
        
        
        terceiroIngerido: retomada || algumaNotaTrazTerceiro(notasInjetadas) || claimed.terceiro_ingerido === true,
        campanhaId: claimed.campanha_id ?? undefined,
        planoIndex: claimed.plano_index ?? undefined,
        origemSolicitante: resolverOrigemSolicitante(claimed.created_by, claimed.agent_id) },
      loop,
    )
  } catch (err) {
    
    try { await finalize(id, 'failed', `Erro inesperado: ${msg(err)}`) } catch {  }
  }
}


export async function resumeTaskAfterApproval(taskId: string, note: string, deps: RunTaskDeps = {}): Promise<void> {
  const t = await getTask(taskId)
  if (!t || t.status !== 'needs_approval') return 
  const state: Msg[] = Array.isArray(t.working_state) ? (t.working_state as Msg[]) : []
  const newState = [...state, { role: 'user', content: note }]
  await updateTask(taskId, { status: 'queued', working_state: newState, approval_id: null }, 'Aprovação concedida, retomando.')
  void runTask(taskId, deps)
}


export async function cancelTaskAfterRejection(taskId: string, _deps: RunTaskDeps = {}): Promise<void> {
  const t = await getTask(taskId)
  if (!t || t.status !== 'needs_approval') return
  await updateTask(taskId, { status: 'cancelled', result: 'Aprovação rejeitada pelo operador.' }, 'Aprovação rejeitada pelo operador.')
  const fresh = await getTask(taskId)
  if (fresh) {
    await reportTransition(fresh, 'cancelled', 'Tarefa cancelada (aprovação rejeitada).')
    
    
    try {
      await onChildTerminal({ id: fresh.id, parent_task_id: fresh.parent_task_id, status: fresh.status, result: fresh.result })
    } catch (err) {
      console.warn('[runTask] onChildTerminal (cancel) falhou (não-fatal):', err)
    }
  }
}
