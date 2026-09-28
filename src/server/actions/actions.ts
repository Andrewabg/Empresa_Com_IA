
import type { LancamentoResolvido } from '@/lib/trafego/lancamentoCriativo'

import { getComposioClient, composioUserId, type ComposioClient, metaGraphPost } from './composio'
import { CATALOG_LIMIT, COMPOSIO_TOOLS_LIMIT, toolkitsForSource, perToolkitLimit, interleaveRoundRobin, isActionAllowed } from '@/lib/toolkit-gating'
import { listarContasConectadas, type ClientDeContas } from './contasConectadas'
import { recordEvent } from '@/data/events'
import { listNoAuthToolkitSlugs } from '../config/noAuthToolkits'
import { classifyAction } from './classify'
import { summarizeAction } from './summarize'
import { createApproval, type Approval } from '../../data/approvals'
import { getAgentRow } from '../../data/agents'
import { recordCost } from '../../data/cost'
import { notificarAprovacao } from '../proativo/producers'


export interface ActionResponse {
  data: Record<string, unknown>
  error: string | null
  successful: boolean
  logId?: string
  sessionInfo?: unknown
}

export interface RunActionInput {
  slug: string
  args: Record<string, unknown>
  userId: string
  agent: string
  
  title?: string
  
  reason?: string
  
  conversationId?: string | null
  
  buscarAgente?: (id: string) => Promise<{ tools?: { composio_toolkits?: string[] | null } } | null>
}


export async function recordActionCost(slug: string, agent: string): Promise<void> {
  await recordCost({
    kind: 'action', model: 'composio', promptTokens: 0, completionTokens: 0,
    tool: slug, agent, amountUsdOverride: 0,
  })
}


async function acaoPermitida(
  agentId: string,
  slug: string,
  buscarAgente: (id: string) => Promise<{ tools?: { composio_toolkits?: string[] | null } } | null>,
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  if (slug.startsWith('AWAVE_')) return { ok: true }
  let row: { tools?: { composio_toolkits?: string[] | null } } | null
  try {
    row = await buscarAgente(agentId)
  } catch {
    return { ok: false, motivo: 'Não consegui conferir as permissões desta ferramenta agora. Tente de novo em instantes.' }
  }
  const toolkits = row?.tools?.composio_toolkits ?? null
  if (isActionAllowed(slug, toolkits)) return { ok: true }
  return {
    ok: false,
    motivo: `A ferramenta ${slug} está fora do que foi liberado para este agente. Em Agentes, o dono pode liberar essa integração para ele.`,
  }
}

export async function runAction(input: RunActionInput, composio?: ComposioClient | null): Promise<ActionResponse> {
  const c = composio === undefined ? await getComposioClient() : composio
  if (!c) {
    return { data: { message: 'Ações externas ainda não estão configuradas — adicione a chave Composio em /config.' }, error: 'not_configured', successful: false }
  }

  
  const permitida = await acaoPermitida(input.agent, input.slug, input.buscarAgente ?? getAgentRow)
  if (!permitida.ok) {
    return { data: { message: permitida.motivo }, error: 'nao_permitida', successful: false }
  }

  if (classifyAction(input.slug) === 'read') {
    try {
      
      
      
      const res = (await c.tools.execute(input.slug, { userId: input.userId, arguments: input.args, dangerouslySkipVersionCheck: true }, { signal: AbortSignal.timeout(15000) })) as ActionResponse
      await recordActionCost(input.slug, input.agent)
      return res
    } catch (err) {
      
      
      
      
      
      
      
      
      const message = isAuthError(err)
        ? `A chave do Composio está inválida — corrija em /config para usar ${input.slug}.`
        : `A chamada a ${input.slug} falhou. Isto foi o que a ferramenta respondeu: ${briefError(err)}. Use este erro para corrigir a chamada; não conclua por conta própria que a ferramenta é incapaz da tarefa.`
      return { data: { message }, error: err instanceof Error ? err.message : 'erro', successful: false }
    }
  }

  
  const label = input.title ?? summarizeAction(input.slug, input.args)
  let approval: Approval
  try {
    approval = await createApproval({
      kind: 'tool_action',
      title: label,
      agent: input.agent,
      ...(input.reason ? { reason: input.reason } : {}),
      action_slug: input.slug,
      action_args: input.args,
      conversation_id: input.conversationId ?? null,
    })
  } catch (err) {
    
    
    return { data: { message: 'Não consegui registrar a proposta de ação. Tente de novo.' }, error: err instanceof Error ? err.message : 'erro', successful: false }
  }
  void notificarAprovacao(approval) 
  

  return { data: { status: 'pending_approval', approvalId: approval.id, message: 'Proposta criada — preciso da sua aprovação em /aprovações antes de executar.' }, error: null, successful: true }
}

export interface ExecuteApprovedDeps {
  composio: ComposioClient
  
  metaGraphPost?: typeof metaGraphPost
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executarPlano?: (args: { acoes: any[] }, ctx: { agent: string; composio: ComposioClient }, deps?: any) => Promise<any>
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lancarCriativo?: (payload: any, ctx: { agent: string; composio: ComposioClient }, deps?: any) => Promise<any>
  
  vincularLancamento?: (input: { artifactId?: string | null; adId?: string | null }) => Promise<{ vinculou: boolean; pecaId?: string }>
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  duplicarConjuntoCorrigido?: (payload: any, ctx: { agent: string; composio: ComposioClient }, deps?: any) => Promise<any>
}

export async function executeApprovedAction(approval: Approval, deps: ExecuteApprovedDeps): Promise<ActionResponse> {
  if (!approval.action_slug) {
    throw new Error(`executeApprovedAction: aprovação ${approval.id} sem action_slug`)
  }

  
  
  
  if (approval.action_slug.startsWith('AWAVE_META_')) {
    switch (approval.action_slug) {
      case 'AWAVE_META_GRAPH_WRITE': {
        const args = approval.action_args ?? {}
        const endpoint = String(args.endpoint ?? '')
        const body = (args.body ?? {}) as Record<string, unknown>
        const postFn = deps.metaGraphPost ?? metaGraphPost
        const res = await postFn(endpoint, body, { composio: deps.composio })
        if (!res.ok) {
          
          
          
          throw Object.assign(new Error(res.error ?? 'falha no Graph'), { status: res.status })
        }
        
        
        await recordActionCost('METAADS_GRAPH_WRITE', approval.agent ?? 'jarvis')
        return { data: (res.data ?? {}) as Record<string, unknown>, error: null, successful: true }
      }
      case 'AWAVE_META_PLAN_BATCH': {
        
        const { executarPlano: executarPlanoDefault } = await import('../tools/trafego/executarPlano')
        const executarPlanoDeps = deps.executarPlano ?? executarPlanoDefault
        const acoes = (approval.action_args as { acoes?: unknown[] })?.acoes ?? []
        
        const extraDeps = deps.metaGraphPost ? { metaGraphPost: deps.metaGraphPost } : {}
        const resultado = await (executarPlanoDeps as typeof executarPlanoDefault)(
          { acoes: acoes as Parameters<typeof executarPlanoDefault>[0]['acoes'] },
          { agent: approval.agent ?? 'jarvis', composio: deps.composio },
          extraDeps,
        )
        return {
          data: resultado as unknown as Record<string, unknown>,
          error: null,
          successful: true,
        }
      }
      case 'AWAVE_META_LAUNCH_CREATIVE': {
        
        const { lancarCriativo: lancarCriativoDefault } = await import('../tools/trafego/lancarCriativo')
        const exec = deps.lancarCriativo ?? lancarCriativoDefault
        const payload = approval.action_args as LancamentoResolvido | null
        if (!payload?.adsetId || !payload?.artifactId) {
          throw new Error(`executeApprovedAction: AWAVE_META_LAUNCH_CREATIVE sem payload (${approval.id})`)
        }
        const resultado = await (exec as typeof lancarCriativoDefault)(
          payload,
          { agent: approval.agent ?? 'gestor-trafego', composio: deps.composio },
          deps.metaGraphPost ? { metaGraphPost: deps.metaGraphPost } : {},
        )
        
        
        
        
        const vincular = deps.vincularLancamento
          ?? (await import('../design/vincularLancamento')).vincularLancamentoAPeca
        await vincular({
          artifactId: payload.artifactId,
          adId: (resultado as { adId?: string } | null)?.adId ?? null,
        })
        return { data: resultado as unknown as Record<string, unknown>, error: null, successful: true }
      }
      case 'AWAVE_META_DUPLICATE_ADSET': {
        
        const { duplicarConjuntoCorrigido: dupDefault } = await import('../tools/trafego/duplicarConjuntoCorrigido')
        const exec = deps.duplicarConjuntoCorrigido ?? dupDefault
        const args = approval.action_args ?? {}
        const adsetId = String(args.adsetId ?? '')
        const correcao = args.correcao as { optimization_goal?: string; promoted_object?: { pixel_id?: string; custom_event_type?: string } } | undefined
        
        
        if (!adsetId || !correcao?.optimization_goal || !correcao.promoted_object?.pixel_id || !correcao.promoted_object?.custom_event_type) {
          throw new Error(`executeApprovedAction: AWAVE_META_DUPLICATE_ADSET sem payload (${approval.id})`)
        }
        const resultado = await (exec as typeof dupDefault)(
          { adsetId, correcao } as never,
          { agent: approval.agent ?? 'gestor-trafego', composio: deps.composio },
        )
        return { data: resultado as unknown as Record<string, unknown>, error: null, successful: true }
      }
      default:
        
        throw new Error(`executeApprovedAction: sentinela desconhecido '${approval.action_slug}'`)
    }
  }

  
  const res = (await deps.composio.tools.execute(approval.action_slug, {
    userId: composioUserId(),
    arguments: approval.action_args ?? {},
    dangerouslySkipVersionCheck: true, 
  }, { signal: AbortSignal.timeout(15000) })) as ActionResponse
  await recordActionCost(approval.action_slug, approval.agent ?? 'jarvis')
  return res
}




const ACTIONS_TTL_MS = 60_000
type ActionsCacheEntry = { at: number; tools: Awaited<ReturnType<typeof rawList>> }
const _actionsCache = new Map<string, ActionsCacheEntry>()
export function invalidateActionsCache(): void { _actionsCache.clear() }


function actionsCacheKey(userId: string, toolkits: string[] | null | undefined, limit: number): string {
  const norm = (toolkits && toolkits.length)
    ? [...new Set(toolkits.map((t) => t.toLowerCase()))].sort().join(',')
    : '*'
  return `${userId}::${norm}::${limit}`
}

async function rawList(c: ComposioClient, userId: string, limit: number, allowlist?: string[] | null) {
  
  
  const contas = await listarContasConectadas(
    c as unknown as ClientDeContas, userId, { signal: AbortSignal.timeout(CONTAS_TIMEOUT_MS) },
  )
  
  
  
  
  
  const connected = [...new Set(
    contas.filter((a) => a.status.toUpperCase() === 'ACTIVE').map((a) => a.slug),
  )]
  
  
  
  const conectados = toolkitsForSource(connected, allowlist)
  
  
  
  const semLogin: string[] = []
  if (allowlist && allowlist.length > 0) {
    const jaNaFonte = new Set(conectados.map((s) => s.toLowerCase()))
    const permitidos = new Set(allowlist.map((a) => a.toLowerCase()))
    
    for (const slug of await listNoAuthToolkitSlugs({ getClient: async () => c })) {
      const s = slug.toLowerCase()
      if (permitidos.has(s) && !jaNaFonte.has(s)) { semLogin.push(slug); jaNaFonte.add(s) }
    }
  }
  const slugs = [...conectados, ...semLogin]
  if (slugs.length === 0) return []
  
  if (slugs.length === 1) {
    return await ferramentasDoToolkit(c, slugs[0], limit)
  }
  
  
  
  
  
  
  
  
  const porConectado = perToolkitLimit(limit, conectados.length)
  const porSemLogin = perToolkitLimit(limit, semLogin.length)
  const lists = await Promise.all(
    slugs.map(async (slug, i) => {
      try {
        return await ferramentasDoToolkit(c, slug, i < conectados.length ? porConectado : porSemLogin)
      } catch (err) {
        console.warn(`[rawList] descoberta do toolkit ${slug} falhou (não-fatal): ${briefError(err)}`)
        return []
      }
    }),
  )
  const interleaved = interleaveRoundRobin(lists)
  if (interleaved.length > limit) {
    console.warn(`[rawList] catálogo truncado: ${interleaved.length} actions descobertas > limit ${limit} — ${interleaved.length - limit} não ficarão buscáveis. Suba CATALOG_LIMIT se necessário.`)
  }
  return interleaved.slice(0, limit)
}


const DESCOBERTA_TIMEOUT_MS = 20_000

const CONTAS_TIMEOUT_MS = 20_000


async function ferramentasDoToolkit(c: ComposioClient, slug: string, limit: number) {
  const buscar = (important?: boolean) =>
    comRetry(() => c.tools.getRawComposioTools(
      { toolkits: [slug], limit, ...(important ? { important: true } : {}) },
      undefined,
      { signal: AbortSignal.timeout(DESCOBERTA_TIMEOUT_MS) },
    ))
  const todas = await buscar()
  if (todas.length < limit) return todas
  return await buscar(true)
}


async function comRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (isAuthError(err)) throw err
    console.warn(`[rawList] descoberta falhou, tentando mais uma vez: ${briefError(err)}`)
    return await fn()
  }
}


export function isAuthError(err: unknown): boolean {
  let cur: unknown = err
  for (let depth = 0; cur != null && depth < 6; depth++) {
    const e = cur as { status?: number; statusCode?: number; name?: string; message?: unknown; cause?: unknown; constructor?: { name?: string } }
    if (e.status === 401 || e.status === 403 || e.statusCode === 401 || e.statusCode === 403) return true
    const name = e.name ?? e.constructor?.name
    if (name === 'AuthenticationError' || name === 'PermissionDeniedError') return true
    
    
    if (typeof e.message === 'string' && /\b40[13]\b/.test(e.message)) return true
    cur = e.cause
  }
  return false
}


function briefError(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 180)
}


export async function listAvailableActions(
  opts: { userId?: string; limit?: number; toolkits?: string[] | null } = {},
  composio?: ComposioClient | null,
  now: () => number = Date.now,
) {
  const c = composio === undefined ? await getComposioClient() : composio
  if (!c) return []
  const userId = opts.userId ?? composioUserId()
  
  
  const limit = opts.limit ?? COMPOSIO_TOOLS_LIMIT
  const cacheKey = actionsCacheKey(userId, opts.toolkits, limit)
  const cached = _actionsCache.get(cacheKey)
  if (cached && now() - cached.at < ACTIONS_TTL_MS) return cached.tools
  try {
    const tools = await rawList(c, userId, limit, opts.toolkits)
    _actionsCache.set(cacheKey, { at: now(), tools }) 
    return tools
  } catch (err) {
    if (isAuthError(err)) {
      
      
      
      
      _actionsCache.set(cacheKey, { at: now(), tools: [] })
      console.warn(`[listAvailableActions] chave Composio inválida — ações externas off até corrigir em /config (${briefError(err)})`)
      return []
    }
    
    
    
    
    
    
    
    
    
    console.warn(`[listAvailableActions] falhou (não-fatal, transitório): ${briefError(err)}`)
    void registrarCatalogoIndisponivel(err, now)
    return []
  }
}


export async function listarAcoesConectadas(composio?: ComposioClient | null) {
  return listAvailableActions({ userId: composioUserId(), limit: CATALOG_LIMIT }, composio)
}


async function registrarCatalogoIndisponivel(err: unknown, now: () => number): Promise<void> {
  try {
    const minuto = Math.floor(now() / 60_000)
    await recordEvent({
      id: `composio:catalogo-indisponivel:${minuto}`,
      type: 'tool',
      label: 'Ferramentas externas indisponíveis agora — o agente rodou sem elas.',
      agent: 'jarvis',
    })
  } catch {  }
}
