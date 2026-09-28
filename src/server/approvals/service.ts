
import {
  getApproval,
  listPending as dataListPending,
  claimResolucao,
  registrarErroResolucao,
  reverterResolucaoParaPending,
  type Approval,
} from '../../data/approvals'
import { recordEvent } from '../../data/events'
import { setPlanStatus } from '../../data/plans'
import { updateTask } from '../../data/tasks'
import { parsePrNumber, type GithubPR } from './github'
import { executeApprovedAction, isAuthError } from '../actions/actions'
import type { ComposioClient } from '../actions/composio'
import { resumeTaskAfterApproval, cancelTaskAfterRejection } from '../agent/executor/runTask'
import { cancelObjective } from '../agent/maestro/cancel'
import { applyDirective } from '../tools/registrarDiretriz'
import { executeCustomToolApproval, prepararCustomToolApproval } from './customTool'
import { textoDoResultado, textoDaFalha, resultadoFalhou, erroDoResultado } from '@/lib/approvals/resultado'
import { temCorrecao, notaDeReplanejamento } from '@/lib/aprovacoes/correcaoDoPlano'
import { appendMessage } from '../../data/messages'


function defaultRegistrarResultado(conversationId: string, texto: string, payload: unknown): Promise<unknown> {
  return appendMessage(conversationId, 'assistant', texto, payload)
}


async function defaultResumeRoot(taskId: string): Promise<void> {
  const m = await import('../agent/executor/runTask')
  await m.runTask(taskId)
}




export async function listPending(): Promise<Approval[]> {
  return dataListPending()
}



export interface ApproveOptions {
  
  github?: GithubPR
  
  reindex?: () => Promise<void>
  
  syncSkillsAfterMerge?: () => Promise<void>
  
  composio?: ComposioClient
  
  executeApprovedAction?: (approval: Approval, deps: { composio: ComposioClient }) => Promise<unknown>
  
  resumeTask?: (taskId: string, note: string, deps?: unknown) => Promise<void>
  
  resumeRoot?: (rootTaskId: string) => Promise<void>
  
  applyDirective?: (input: { agentId: string; diretriz: string }) => Promise<{ ok: boolean; message: string }>
  
  registrarResultadoNaConversa?: (conversationId: string, texto: string, payload: unknown) => Promise<unknown>
}


export async function approve(id: string, opts: ApproveOptions): Promise<Approval> {
  const approval = await loadOrThrow(id)

  
  if (approval.status !== 'pending') return approval

  
  if (approval.kind === 'tool_action') {
    if (!opts.composio) {
      throw new Error('approve(tool_action): composio client ausente')
    }
    const execApproved = opts.executeApprovedAction ?? executeApprovedAction
    let resultado: unknown

    
    
    
    const claimed = await claimResolucao(id, 'approved')
    if (!claimed) return loadOrThrow(id)

    try {
      resultado = await execApproved(approval, { composio: opts.composio })
    } catch (err) {
      
      
      
      
      if (isAuthError(err)) {
        await reverterResolucaoParaPending(id, err instanceof Error ? err.message : String(err))
        throw err
      }
      
      
      await registrarErroPosClaim(id, err)
      
      
      
      
      
      
      
      if (approval.conversation_id) {
        try {
          const registrar = opts.registrarResultadoNaConversa ?? defaultRegistrarResultado
          await registrar(approval.conversation_id, textoDaFalha(approval, err), {
            falha_aprovacao: { approval_id: approval.id, action_slug: approval.action_slug },
          })
        } catch (e) {
          console.warn('[approvals/service] registrar falha na conversa falhou (não-fatal):', e)
        }
      }
      throw err
    }

    const resolved = claimed

    
    
    
    
    
    
    const naoDeuCerto = resultadoFalhou(resultado)
    const rotulo = approval.title ?? approval.action_slug ?? 'ação externa'

    try {
      await recordEvent({
        id: 'apr:' + id + ':approved',
        type: 'action',
        label: (naoDeuCerto ? 'Ação falhou: ' : 'Ação executada: ') + rotulo,
        agent: approval.agent ?? 'jarvis',
      })
    } catch (err) {
      console.warn('[approvals/service] recordEvent falhou (não-fatal):', err)
    }

    
    
    
    
    
    
    
    if (approval.conversation_id) {
      try {
        const registrar = opts.registrarResultadoNaConversa ?? defaultRegistrarResultado
        await registrar(
          approval.conversation_id,
          naoDeuCerto
            ? textoDaFalha(approval, erroDoResultado(resultado))
            : textoDoResultado(approval, resultado),
          naoDeuCerto
            ? { falha_aprovacao: { approval_id: approval.id, action_slug: approval.action_slug, resultado } }
            : { resultado_aprovacao: { approval_id: approval.id, action_slug: approval.action_slug, resultado } },
        )
      } catch (err) {
        console.warn('[approvals/service] registrar resultado na conversa falhou (não-fatal):', err)
      }
    }

    
    
    if (approval.task_id) {
      
      
      
      const note = naoDeuCerto
        ? `A ação "${rotulo}" foi aprovada mas FALHOU. Motivo: ${erroDoResultado(resultado) || 'a ferramenta não devolveu detalhe.'} Corrija o que o erro aponta antes de tentar outra vez, e não conclua que a ferramenta é incapaz da tarefa.`
        : `A ação "${rotulo}" foi aprovada e executada.`
      try {
        await (opts.resumeTask ?? resumeTaskAfterApproval)(approval.task_id, note, {})
      } catch (err) {
        console.warn('[approvals/service] resumeTask falhou (não-fatal):', err)
      }
    }
    return resolved
  }

  
  
  
  
  if (approval.kind === 'plan') {
    if (!approval.plan_id) throw new Error('approve(plan): plan_id ausente')

    
    
    
    const claimed = await claimResolucao(id, 'approved')
    if (!claimed) return loadOrThrow(id)

    try {
      await setPlanStatus(approval.plan_id, 'approved')
      if (approval.task_id) {
        
        
        await updateTask(approval.task_id, { plan_id: approval.plan_id, status: 'queued', approval_id: null })
        void (opts.resumeRoot ?? defaultResumeRoot)(approval.task_id)
      }
    } catch (err) {
      await registrarErroPosClaim(id, err)
      throw err
    }

    const resolved = claimed
    try {
      await recordEvent({
        id: 'apr:' + id + ':approved',
        type: 'action',
        label: approval.title ? 'Plano aprovado: ' + approval.title : 'Plano aprovado',
        agent: approval.agent ?? 'coo',
      })
    } catch (err) {
      console.warn('[approvals/service] recordEvent falhou (não-fatal):', err)
    }
    return resolved
  }

  
  
  
  if (approval.kind === 'directive') {
    const claimed = await claimResolucao(id, 'approved')
    if (!claimed) return loadOrThrow(id)
    const args = (approval.action_args ?? {}) as { agentId?: string; diretriz?: string }
    try {
      const apply = opts.applyDirective ?? applyDirective
      if (args.agentId && args.diretriz) await apply({ agentId: args.agentId, diretriz: args.diretriz })
    } catch (err) {
      await registrarErroPosClaim(id, err)
      throw err
    }
    try {
      await recordEvent({ id: 'apr:' + id + ':approved', type: 'action', label: 'Regra fixada: ' + (approval.title ?? ''), agent: approval.agent ?? 'jarvis' })
    } catch (err) { console.warn('[approvals/service] recordEvent falhou (não-fatal):', err) }
    if (approval.task_id) {
      const note = `A regra "${approval.title ?? ''}" foi aprovada e fixada.`
      try { await (opts.resumeTask ?? resumeTaskAfterApproval)(approval.task_id, note, {}) } catch (err) { console.warn('[approvals/service] resumeTask falhou (não-fatal):', err) }
    }
    return claimed
  }

  
  
  if (approval.kind === 'custom_tool') {
    
    
    
    
    
    
    const preparo = prepararCustomToolApproval(approval)

    
    const claimed = await claimResolucao(id, 'approved')
    if (!claimed) return loadOrThrow(id)

    try {
      await executeCustomToolApproval(approval, preparo)
    } catch (err) {
      
      
      await registrarErroPosClaim(id, err)
      throw err
    }

    const resolved = claimed
    try {
      await recordEvent({
        id: 'apr:' + id + ':approved',
        type: 'action',
        label: 'Tool custom executada: ' + (approval.title ?? approval.action_slug ?? 'tool custom'),
        agent: approval.agent ?? 'jarvis',
      })
    } catch (err) {
      console.warn('[approvals/service] recordEvent falhou (não-fatal):', err)
    }

    
    if (approval.task_id) {
      const note = `A ação "${approval.title ?? approval.action_slug ?? 'tool custom'}" foi aprovada e executada.`
      try {
        await (opts.resumeTask ?? resumeTaskAfterApproval)(approval.task_id, note, {})
      } catch (err) {
        console.warn('[approvals/service] resumeTask falhou (não-fatal):', err)
      }
    }
    return resolved
  }

  
  
  
  if (approval.kind === 'brain_pr' && approval.path?.startsWith('skills/')) {
    if (!opts.github) {
      throw new Error('approve(skill brain_pr): github ausente')
    }
    const prNumber = resolvePrNumber(approval)

    
    await opts.github.mergePR(prNumber)

    
    
    const syncSkills =
      opts.syncSkillsAfterMerge ??
      (async () => {
        const { pullAndSyncSkillsAfterMerge } = await import('../brain/skillsSync')
        await pullAndSyncSkillsAfterMerge()
      })
    try {
      await syncSkills()
    } catch (err) {
      console.warn('[approvals/service] sync de skills falhou após merge (boot-sync reconcilia):', err)
    }

    
    
    const resolved = await claimResolucao(id, 'approved')
    if (!resolved) return loadOrThrow(id)
    try {
      await recordEvent({
        id: 'apr:' + id + ':approved',
        type: 'action',
        label: approval.title ? 'Skill aprovada e mesclada: ' + approval.title : 'Skill aprovada e mesclada',
        agent: approval.agent ?? 'jarvis',
      })
    } catch (err) {
      console.warn('[approvals/service] recordEvent falhou (não-fatal):', err)
    }

    
    
    if (approval.task_id) {
      const note = `A skill "${approval.title ?? ''}" foi aprovada e mesclada ao Cérebro.`
      try {
        await (opts.resumeTask ?? resumeTaskAfterApproval)(approval.task_id, note, {})
      } catch (err) {
        console.warn('[approvals/service] resumeTask falhou (não-fatal):', err)
      }
    }
    return resolved
  }

  
  if (!opts.github || !opts.reindex) {
    throw new Error('approve(brain_pr): github/reindex ausentes')
  }
  const prNumber = resolvePrNumber(approval)

  
  await opts.github.mergePR(prNumber)

  
  try {
    await opts.reindex()
  } catch (err) {
    console.warn('[approvals/service] reindex failed after merge (will reconcile via webhook):', err)
  }

  
  
  const resolved = await claimResolucao(id, 'approved')
  if (!resolved) return loadOrThrow(id)
  try {
    await recordEvent({
      id: 'apr:' + id + ':approved',
      type: 'action',
      label: approval.title ? 'Aprovado e mesclado: ' + approval.title : 'Aprovado e mesclado',
      agent: approval.agent ?? 'jarvis',
    })
  } catch (err) {
    console.warn('[approvals/service] recordEvent falhou (não-fatal):', err)
  }

  
  
  if (approval.task_id) {
    const note = `A proposta de memória "${approval.title ?? ''}" foi aprovada e mesclada ao Cérebro.`
    try {
      await (opts.resumeTask ?? resumeTaskAfterApproval)(approval.task_id, note, {})
    } catch (err) {
      console.warn('[approvals/service] resumeTask falhou (não-fatal):', err)
    }
  }
  return resolved
}



export interface RejectOptions {
  
  github?: GithubPR
  
  cancelTask?: (taskId: string, deps?: unknown) => Promise<void>
  
  cancelObjective?: (rootTaskId: string) => Promise<void>
  
  removeLiveSkill?: (slug: string) => void
  
  correcaoDoPlano?: string
  
  resumeTask?: (taskId: string, note: string, deps?: unknown) => Promise<void>
}


export async function reject(id: string, opts: RejectOptions): Promise<Approval> {
  const approval = await loadOrThrow(id)

  
  if (approval.status !== 'pending') return approval

  
  
  if (approval.kind === 'tool_action' || approval.kind === 'custom_tool') {
    const resolved = await claimResolucao(id, 'rejected')
    if (!resolved) return loadOrThrow(id) 
    try {
      await recordEvent({
        id: 'apr:' + id + ':rejected',
        type: 'action',
        label: approval.title ? 'Rejeitado: ' + approval.title : 'Rejeitado',
        agent: approval.agent ?? 'jarvis',
      })
    } catch (err) {
      console.warn('[approvals/service] recordEvent falhou (não-fatal):', err)
    }

    
    
    if (approval.task_id) {
      try {
        await (opts.cancelTask ?? cancelTaskAfterRejection)(approval.task_id, {})
      } catch (err) {
        console.warn('[approvals/service] cancelTask falhou (não-fatal):', err)
      }
    }
    return resolved
  }

  
  
  
  if (approval.kind === 'plan') {
    
    
    
    const resolved = await claimResolucao(id, 'rejected')
    if (!resolved) return loadOrThrow(id)

    
    
    
    
    
    const replaneja = temCorrecao(opts.correcaoDoPlano) && !!approval.task_id

    try {
      if (approval.plan_id) await setPlanStatus(approval.plan_id, 'failed')
      if (approval.task_id) {
        if (replaneja) {
          
          
          
          await (opts.resumeTask ?? resumeTaskAfterApproval)(
            approval.task_id, notaDeReplanejamento(opts.correcaoDoPlano as string), {},
          )
        } else {
          await (opts.cancelObjective ?? cancelObjective)(approval.task_id)
        }
      }
    } catch (err) {
      await registrarErroPosClaim(id, err)
      throw err
    }

    try {
      const rotulo = approval.title ?? ''
      await recordEvent({
        id: 'apr:' + id + ':rejected',
        type: 'action',
        label: replaneja
          ? (rotulo ? 'Plano recusado com correção: ' + rotulo : 'Plano recusado com correção')
          : (rotulo ? 'Plano rejeitado: ' + rotulo : 'Plano rejeitado'),
        agent: approval.agent ?? 'coo',
      })
    } catch (err) {
      console.warn('[approvals/service] recordEvent falhou (não-fatal):', err)
    }
    return resolved
  }

  
  if (approval.kind === 'directive') {
    const resolved = await claimResolucao(id, 'rejected')
    if (!resolved) return loadOrThrow(id)
    try {
      await recordEvent({ id: 'apr:' + id + ':rejected', type: 'action', label: approval.title ? 'Regra recusada: ' + approval.title : 'Regra recusada', agent: approval.agent ?? 'jarvis' })
    } catch (err) { console.warn('[approvals/service] recordEvent falhou (não-fatal):', err) }
    if (approval.task_id) {
      try { await (opts.cancelTask ?? cancelTaskAfterRejection)(approval.task_id, {}) } catch (err) { console.warn('[approvals/service] cancelTask falhou (não-fatal):', err) }
    }
    return resolved
  }

  
  
  
  if (approval.kind === 'brain_pr' && approval.path?.startsWith('skills/')) {
    if (!opts.github) {
      throw new Error('reject(skill brain_pr): github ausente')
    }
    const prNumber = resolvePrNumber(approval)

    
    await opts.github.closePR(prNumber)

    
    
    const removeSkill =
      opts.removeLiveSkill ??
      ((slug: string) => {
        void import('../brain/skillsSync')
          .then((m) => m.removeLiveSkill(slug))
          .catch((err) => console.warn('[approvals/service] removeLiveSkill falhou (não-fatal):', err))
      })
    try {
      removeSkill(slugFromPath(approval.path))
    } catch (err) {
      console.warn('[approvals/service] removeLiveSkill falhou (não-fatal):', err)
    }

    
    
    const resolved = await claimResolucao(id, 'rejected')
    if (!resolved) return loadOrThrow(id)
    try {
      await recordEvent({
        id: 'apr:' + id + ':rejected',
        type: 'action',
        label: approval.title ? 'Skill rejeitada: ' + approval.title : 'Skill rejeitada',
        agent: approval.agent ?? 'jarvis',
      })
    } catch (err) {
      console.warn('[approvals/service] recordEvent falhou (não-fatal):', err)
    }

    
    if (approval.task_id) {
      try {
        await (opts.cancelTask ?? cancelTaskAfterRejection)(approval.task_id, {})
      } catch (err) {
        console.warn('[approvals/service] cancelTask falhou (não-fatal):', err)
      }
    }
    return resolved
  }

  
  if (!opts.github) {
    throw new Error('reject(brain_pr): github ausente')
  }
  const prNumber = resolvePrNumber(approval)

  
  await opts.github.closePR(prNumber)

  
  
  const resolved = await claimResolucao(id, 'rejected')
  if (!resolved) return loadOrThrow(id)
  try {
    await recordEvent({
      id: 'apr:' + id + ':rejected',
      type: 'action',
      label: approval.title ? 'Rejeitado: ' + approval.title : 'Rejeitado',
      agent: approval.agent ?? 'jarvis',
    })
  } catch (err) {
    console.warn('[approvals/service] recordEvent falhou (não-fatal):', err)
  }

  
  
  if (approval.task_id) {
    try {
      await (opts.cancelTask ?? cancelTaskAfterRejection)(approval.task_id)
    } catch (err) {
      console.warn('[approvals/service] cancelTask falhou (não-fatal):', err)
    }
  }
  return resolved
}



async function loadOrThrow(id: string): Promise<Approval> {
  const approval = await getApproval(id)
  if (!approval) throw new Error(`Approval not found: ${id}`)
  return approval
}


async function registrarErroPosClaim(id: string, err: unknown): Promise<void> {
  try {
    await registrarErroResolucao(id, err instanceof Error ? err.message : String(err))
  } catch (e2) {
    console.warn('[approvals/service] registrarErroResolucao falhou (não-fatal):', e2)
  }
}


function slugFromPath(path: string | null): string {
  return (path ?? '').split('/')[1] ?? ''
}


function resolvePrNumber(approval: Approval): number {
  const num = approval.pr_number ?? parsePrNumber(approval.pr_url)
  if (num === null || num === undefined) {
    throw new Error(
      `Cannot resolve PR number for approval ${approval.id}: pr_number is null and pr_url did not contain /pull/<n>`,
    )
  }
  return num
}
