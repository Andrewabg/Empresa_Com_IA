

import type { ComposioClient } from '@/server/actions/composio'
import type { ActionResponse } from '@/server/actions/actions'
import { runAction, executeApprovedAction } from '@/server/actions/actions'
import { classifyAction } from '@/server/actions/classify'
import { summarizeAction } from '@/server/actions/summarize'
import { createApproval as createApprovalDefault } from '@/data/approvals'
import { recordEvent as recordEventDefault } from '@/data/events'
import { notificarAprovacao as notificarDefault } from '@/server/proativo/producers'
import { modoDaAcao, type AcaoModes, type ClassifyFn } from '@/lib/canais/acaoPolitica'

export interface OrigemCanal {
  agentId: string
  conversaId: string
  contatoId: string
  canalId: string
}


export type ExecuteInlineFn = (
  slug: string,
  args: Record<string, unknown>,
  userId: string,
  agent: string,
) => Promise<ActionResponse>

export interface RunActionCanalDeps {
  composio: ComposioClient | null
  modes: AcaoModes | null
  classify?: ClassifyFn
  createApproval?: typeof createApprovalDefault
  runActionRead?: typeof runAction
  executeInline?: ExecuteInlineFn
  notificar?: typeof notificarDefault
  recordEvent?: typeof recordEventDefault
  
  now?: () => number
}

export interface RunActionCanalInput {
  slug: string
  args: Record<string, unknown>
  toolkit: string | null
  userId: string
}

export async function runActionCanal(
  input: RunActionCanalInput,
  origem: OrigemCanal,
  deps: RunActionCanalDeps,
): Promise<ActionResponse> {
  if (!deps.composio) {
    return {
      data: { message: 'Ações externas ainda não estão configuradas.' },
      error: 'not_configured',
      successful: false,
    }
  }

  const classify = deps.classify ?? classifyAction
  const modo = modoDaAcao(input.slug, input.toolkit, deps.modes, classify)

  
  if (modo === 'read') {
    return await (deps.runActionRead ?? runAction)(
      { slug: input.slug, args: input.args, userId: input.userId, agent: origem.agentId },
      deps.composio,
    )
  }

  
  
  
  
  const executeInline: ExecuteInlineFn =
    deps.executeInline ??
    ((slug, args, _userId, agent) =>
      executeApprovedAction(
        { action_slug: slug, action_args: args, agent } as Parameters<typeof executeApprovedAction>[0],
        { composio: deps.composio! },
      ))

  
  if (modo === 'direto') {
    try {
      const res = await executeInline(input.slug, input.args, input.userId, origem.agentId)
      
      
      
      
      
      if (res.successful) {
        try {
          await (deps.recordEvent ?? recordEventDefault)({
            id: 'acao:direto:' + origem.conversaId + ':' + input.slug + ':' + (deps.now ?? Date.now)(),
            type: 'action',
            label: 'Ação executada p/ cliente: ' + summarizeAction(input.slug, input.args),
            agent: origem.agentId,
          })
        } catch {  }
        
        return { ...res, data: { ...res.data, message: 'Feito.' } }
      }
      
      return res
    } catch (err) {
      return {
        data: { message: 'Não consegui executar a ação agora.' },
        error: err instanceof Error ? err.message : 'erro',
        successful: false,
      }
    }
  }

  
  
  try {
    const approval = await (deps.createApproval ?? createApprovalDefault)({
      kind: 'tool_action',
      title: summarizeAction(input.slug, input.args),
      agent: origem.agentId,
      action_slug: input.slug,
      action_args: input.args,
      conversa_id: origem.conversaId,
      contato_id: origem.contatoId,
      canal_id: origem.canalId,
    })
    void (deps.notificar ?? notificarDefault)(approval)
    return {
      data: {
        status: 'pending_approval',
        approvalId: approval.id,
        message: 'Pedido enviado ao time — te confirmo assim que aprovarem.',
      },
      error: null,
      successful: true,
    }
  } catch (err) {
    return {
      data: { message: 'Não consegui registrar o pedido. Tente de novo.' },
      error: err instanceof Error ? err.message : 'erro',
      successful: false,
    }
  }
}
