
import type { ComposioClient } from '@/server/actions/composio'
import { executeApprovedAction, recordActionCost as recordActionCostDefault, isAuthError, type ActionResponse, type ExecuteApprovedDeps } from '@/server/actions/actions'
import { metaGraphPost as metaGraphPostDefault } from '@/server/actions/composio'
import { recordEvent as recordEventDefault } from '@/data/events'
import type { ExecPayload } from './proporAcaoMeta'




export type LinhaPlano =
  | (Extract<ExecPayload, { kind: 'composio' }> & { title: string })
  | (Extract<ExecPayload, { kind: 'graph' }> & { title: string })

export interface ExecutarPlanoArgs {
  acoes: LinhaPlano[]
}

export interface ExecutarPlanoCtx {
  agent: string
  composio: ComposioClient
}

export interface ExecutarPlanoResultado {
  total: number
  sucesso: number
  falha: number
  linhas: Array<{ title: string; ok: true } | { title: string; ok: false; erro: string }>
}

export interface ExecutarPlanoDeps {
  executeApprovedAction?: typeof executeApprovedAction
  metaGraphPost?: typeof metaGraphPostDefault
  recordActionCost?: typeof recordActionCostDefault
  recordEvent?: typeof recordEventDefault
  
  resolveConnectedAccountId?: (composio: ComposioClient) => Promise<string | null>
}



async function defaultResolveConnectedAccountId(c: ComposioClient): Promise<string | null> {
  try {
    const conns = await (c.connectedAccounts as { list: (q: unknown, o?: unknown) => Promise<{ items?: Array<{ id?: string; toolkit?: { slug?: string }; toolkitSlug?: string }> }> })
      .list({ userIds: [process.env.COMPOSIO_USER_ID ?? 'operator'] }, { signal: AbortSignal.timeout(10000) })
    const items = conns?.items ?? []
    return items.find((a) => (a?.toolkit?.slug ?? a?.toolkitSlug) === 'metaads')?.id ?? null
  } catch {
    return null
  }
}



export async function executarPlano(
  args: ExecutarPlanoArgs,
  ctx: ExecutarPlanoCtx,
  deps: ExecutarPlanoDeps = {},
): Promise<ExecutarPlanoResultado> {
  const execApproved = deps.executeApprovedAction ?? executeApprovedAction
  const postGraph = deps.metaGraphPost ?? metaGraphPostDefault
  const recCost = deps.recordActionCost ?? recordActionCostDefault
  const recEvent = deps.recordEvent ?? recordEventDefault
  const resolveConn = deps.resolveConnectedAccountId ?? defaultResolveConnectedAccountId

  
  const hasGraph = args.acoes.some((a) => a.kind === 'graph')
  let connectedAccountId: string | null = null
  if (hasGraph) {
    connectedAccountId = await resolveConn(ctx.composio)
  }

  const resultadoLinhas: ExecutarPlanoResultado['linhas'] = []
  let falhasAuth = 0 

  for (const linha of args.acoes) {
    try {
      if (linha.kind === 'composio') {
        
        const pseudoApproval = {
          id: 'batch-exec',
          kind: 'tool_action',
          action_slug: linha.slug,
          action_args: linha.args,
          agent: ctx.agent,
        } as Parameters<typeof executeApprovedAction>[0]
        const execDeps: ExecuteApprovedDeps = { composio: ctx.composio }
        await execApproved(pseudoApproval, execDeps)
      } else {
        
        const res = await postGraph(linha.endpoint, linha.body, { composio: ctx.composio, connectedAccountId })
        if (!res.ok) {
          throw Object.assign(new Error(res.error ?? 'falha no Graph'), { status: res.status })
        }
        await recCost('METAADS_GRAPH_WRITE', ctx.agent)
      }
      resultadoLinhas.push({ title: linha.title, ok: true })
    } catch (err) {
      
      
      
      if (isAuthError(err)) falhasAuth++
      resultadoLinhas.push({ title: linha.title, ok: false, erro: err instanceof Error ? err.message : String(err) })
    }
  }

  const sucesso = resultadoLinhas.filter((l) => l.ok).length
  const falha = resultadoLinhas.filter((l) => !l.ok).length

  
  
  
  if (falha > 0 && falha === resultadoLinhas.length && falhasAuth === falha) {
    throw Object.assign(new Error('Autenticação falhou em todas as ações do plano — corrija a chave em /config e reaprove.'), { status: 401 })
  }

  const resumo = sucesso === resultadoLinhas.length
    ? `Plano aplicado: ${sucesso} de ${resultadoLinhas.length} ok.`
    : `Plano aplicado: ${sucesso} de ${resultadoLinhas.length} ok; falharam: ${resultadoLinhas.filter((l) => !l.ok).map((l) => l.title).join(', ')}.`

  try {
    await recEvent({ id: `plano:exec:${Date.now()}`, type: 'action', label: resumo, agent: ctx.agent })
  } catch {  }

  return { total: resultadoLinhas.length, sucesso, falha, linhas: resultadoLinhas }
}
