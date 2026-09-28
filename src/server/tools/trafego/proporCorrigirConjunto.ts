
import { metaGraphGet as metaGraphGetDefault } from '../../actions/composio'
import { runAction as runActionDefault } from '../../actions/actions'
import { createApproval as createApprovalDefault, listPending as listPendingDefault } from '@/data/approvals'
import { listLatestSnapshots as listLatestSnapshotsDefault } from '@/data/trafego'
import { getSetting as getSettingDefault } from '@/data/settings'
import { discoverAccountId as discoverAccountIdDefault, resolverContaParaAcao } from './buscarMetricas'
import { contaEndpoint } from '@/lib/trafego/lancamentoCriativo'
import { decidirCorrecaoOtimizacao } from '@/lib/trafego/correcaoConjunto'
import { notificarAprovacao as notificarAprovacaoDefault } from '@/server/proativo/producers'
import type { ContextoConjuntoRaw } from '@/lib/trafego/contextoConjunto'
import { RECUSA_ENTIDADE_DESCONHECIDA, DICA_DE_ENTIDADE_DO_PAINEL_PARA_O_MODELO } from '@/lib/trafego/guardrails'

const SENTINELA = 'AWAVE_META_DUPLICATE_ADSET'


const MAX_ADS = 3

const CONTEXTO_FIELDS =
  'name,billing_event,optimization_goal,promoted_object{pixel_id,custom_event_type,product_set_id,product_catalog_id},' +
  'daily_budget,lifetime_budget,targeting,campaign{objective,daily_budget,lifetime_budget,bid_strategy,name}'


async function lerContextoDoConjuntoDefault(
  adsetId: string,
  deps: { metaGraphGet: typeof metaGraphGetDefault },
): Promise<ContextoConjuntoRaw | null> {
  const resp = await deps.metaGraphGet(`/${adsetId}?fields=${CONTEXTO_FIELDS}`).catch(() => null)
  return (resp as ContextoConjuntoRaw | null) ?? null
}


async function discoverPixelDefault(
  accountId: string,
  deps: { metaGraphGet: typeof metaGraphGetDefault },
): Promise<string | undefined> {
  const resp = await deps.metaGraphGet(`${contaEndpoint(accountId)}/adspixels?fields=id`).catch(() => null)
  const rows = Array.isArray((resp as { data?: unknown } | null)?.data)
    ? (resp as { data: Array<{ id?: unknown }> }).data : []
  if (rows.length !== 1) return undefined
  const id = rows[0]?.id
  return id ? String(id) : undefined
}

export interface ProporCorrigirConjuntoInput { adsetId: string }
export interface ProporCorrigirConjuntoCtx { operatorId?: string; actingAgentId?: string }
export interface ProporCorrigirConjuntoDeps {
  getSetting?: typeof getSettingDefault
  listLatestSnapshots?: typeof listLatestSnapshotsDefault
  metaGraphGet?: typeof metaGraphGetDefault
  discoverAccountId?: typeof discoverAccountIdDefault
  createApproval?: typeof createApprovalDefault
  listPending?: typeof listPendingDefault
  notificarAprovacao?: typeof notificarAprovacaoDefault
  runAction?: typeof runActionDefault
  lerContextoDoConjunto?: (adsetId: string, deps: { metaGraphGet: typeof metaGraphGetDefault }) => Promise<ContextoConjuntoRaw | null>
  discoverPixel?: (accountId: string, deps: { metaGraphGet: typeof metaGraphGetDefault }) => Promise<string | undefined>
}

export async function proporCorrigirConjunto(
  input: ProporCorrigirConjuntoInput,
  ctx: ProporCorrigirConjuntoCtx,
  deps: ProporCorrigirConjuntoDeps = {},
): Promise<{ output: string }> {
  if (!ctx.operatorId) return { output: 'Não consegui identificar o operador. Recarregue a página e tente de novo.' }

  const getSetting = deps.getSetting ?? getSettingDefault
  const listLatest = deps.listLatestSnapshots ?? listLatestSnapshotsDefault
  const graphGet = deps.metaGraphGet ?? metaGraphGetDefault
  const discoverAccount = deps.discoverAccountId ?? discoverAccountIdDefault
  const doCreateApproval = deps.createApproval ?? createApprovalDefault
  const listPend = deps.listPending ?? listPendingDefault
  const notificar = deps.notificarAprovacao ?? notificarAprovacaoDefault
  const run = deps.runAction ?? runActionDefault
  const lerContexto = deps.lerContextoDoConjunto ?? lerContextoDoConjuntoDefault
  const discoverPixel = deps.discoverPixel ?? discoverPixelDefault
  const agent = ctx.actingAgentId ?? 'gestor-trafego'

  
  const idsConhecidos = new Set<string>()
  const nomePorId = new Map<string, string>()
  try {
    const snaps = await listLatest(ctx.operatorId, 'adset', 200)
    for (const s of snaps) {
      idsConhecidos.add(s.entity_id)
      if (s.entity_name) nomePorId.set(s.entity_id, s.entity_name)
    }
  } catch (e) { console.warn('[proporCorrigirConjunto] listLatestSnapshots falhou (não-fatal):', e) }
  if (!idsConhecidos.has(input.adsetId)) {
    
    
    
    return { output: `${RECUSA_ENTIDADE_DESCONHECIDA}\n${DICA_DE_ENTIDADE_DO_PAINEL_PARA_O_MODELO}` }
  }
  const nome = nomePorId.get(input.adsetId)

  
  const raw = await lerContexto(input.adsetId, { metaGraphGet: graphGet })
  if (!raw) return { output: 'Não consegui ler esse conjunto agora. Tente de novo.' }

  
  const accountId = await resolverContaParaAcao(agent, run, getSetting, discoverAccount)
  if (!accountId) return { output: 'Não encontrei uma conta de anúncios conectada. Conecte o Meta Ads em /config (toolkit Meta Ads).' }

  
  const adsResp = await graphGet('/' + input.adsetId + '/ads?fields=id&limit=5').catch(() => null)
  const nAds = Array.isArray((adsResp as { data?: unknown } | null)?.data)
    ? (adsResp as { data: unknown[] }).data.length : 0
  if (nAds > MAX_ADS) {
    return { output: 'Esse conjunto tem mais de 3 anúncios, acima do limite de cópia automática. Por ora não duplico esse.' }
  }

  
  let pixelId = raw.promoted_object?.pixel_id
  if (!pixelId) {
    pixelId = await discoverPixel(accountId, { metaGraphGet: graphGet })
  }

  
  const dec = decidirCorrecaoOtimizacao(raw, pixelId)
  if (!dec) {
    return { output: 'Não achei uma correção clara de otimização nesse conjunto (ou falta um pixel pra apontar). Não vou duplicar à toa.' }
  }

  
  const pend = await listPend().catch(() => [])
  if (pend.some((p) => p.action_slug === SENTINELA && (p.action_args as { adsetId?: string } | null)?.adsetId === input.adsetId)) {
    return { output: 'Já tem uma proposta de correção pendente pra esse conjunto. Aprove ou rejeite ela em /aprovações.' }
  }

  
  const conjuntoLabel = nome ?? input.adsetId
  let approval
  try {
    approval = await doCreateApproval({
      kind: 'tool_action',
      title: 'Duplicar conjunto corrigido: "' + conjuntoLabel + '"',
      agent,
      action_slug: SENTINELA,
      action_args: {
        adsetId: input.adsetId,
        correcao: dec.correcao,
        conjuntoNome: nome,
        antesPt: dec.antesPt,
        depoisPt: dec.depoisPt,
      },
    })
  } catch {
    return { output: 'Não consegui registrar a proposta de correção. Tente de novo.' }
  }
  void notificar(approval)

  return {
    output:
      'Proposta criada: duplicar o conjunto ' + (nome ? '"' + nome + '" ' : '') +
      'corrigindo a otimização (de ' + dec.antesPt + ' pra ' + dec.depoisPt + '), pausado. ' +
      'O original fica intacto. Aprove em /aprovações pra subir a cópia.',
  }
}
