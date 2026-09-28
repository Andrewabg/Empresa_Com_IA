
import { createApproval, type Approval } from '@/data/approvals'
import { notificarAprovacao } from '@/server/proativo/producers'
import { getCustomTools } from '@/server/custom/registryTools'
import { construirCtxCustom } from '@/server/custom/contextoCustom'
import { FalhaPermanenteDaAprovacao } from '@/lib/aprovacoes/falhaPermanente'
import type { ToolCustom } from '@/server/custom/contrato'


export async function createCustomToolApproval(
  { toolId, titulo, args, agentId, conversationId, conversaExternaId }: {
    toolId: string; titulo: string; args: unknown; agentId?: string | null
    
    conversationId?: string | null
    
    conversaExternaId?: string | null
  },
): Promise<Approval> {
  const approval = await createApproval({
    kind: 'custom_tool',
    title: 'Tool custom: ' + titulo,
    agent: agentId ?? undefined,
    conversation_id: conversationId ?? null,
    conversa_id: conversaExternaId ?? null,
    action_slug: toolId,
    action_args: (args ?? {}) as Record<string, unknown>,
  })
  void notificarAprovacao(approval) 
  
  return approval
}


export function resolveCustomToolOrThrow(slug: string | null): ToolCustom {
  const def = slug ? getCustomTools().find((t) => t.id === slug) : undefined
  if (!def) throw new FalhaPermanenteDaAprovacao('tool_removida', slug ?? '')
  return def
}


export interface CustomToolPreparo {
  def: ToolCustom
  input: unknown
}


export function prepararCustomToolApproval(approval: Approval): CustomToolPreparo {
  const def = resolveCustomToolOrThrow(approval.action_slug)
  const parsed = def.inputSchema.safeParse(approval.action_args ?? {})
  if (!parsed.success) {
    throw new FalhaPermanenteDaAprovacao('formato_mudou', approval.action_slug ?? '')
  }
  return { def, input: parsed.data }
}


export async function executeCustomToolApproval(approval: Approval, preparo: CustomToolPreparo): Promise<unknown> {
  
  
  
  
  
  
  
  
  
  
  
  const ctx = construirCtxCustom({
    agentId: approval.agent ?? null,
    operatorId: null, 
    conversationId: approval.conversation_id ?? approval.conversa_id ?? null,
  })
  return preparo.def.execute(ctx, preparo.input)
}
