
import { runAction as runActionDefault } from '../../actions/actions'
import { metaGraphGet as metaGraphGetDefault } from '../../actions/composio'
import { createApproval as createApprovalDefault } from '@/data/approvals'
import { listLatestSnapshots as listLatestSnapshotsDefault } from '@/data/trafego'
import { getSetting as getSettingDefault } from '@/data/settings'
import { getArtifact as getArtifactDefault } from '@/data/artifacts'
import { discoverAccountId as discoverAccountIdDefault, resolverContaParaAcao } from './buscarMetricas'
import {
  normalizarCta,
  extrairIgUserId,
  extrairLinkDeAnuncio,
  resolverLink,
  escolherPagina,
  type LancamentoResolvido,
  type PaginaMeta,
} from '@/lib/trafego/lancamentoCriativo'
import { gerarCopyLancamento as gerarCopyLancamentoDefault } from './gerarCopyLancamento'
import { notificarAprovacao as notificarAprovacaoDefault } from '@/server/proativo/producers'
import { montarContextoResumo, type ContextoConjuntoRaw } from '@/lib/trafego/contextoConjunto'
import { analisarEncaixe, type Aviso } from '@/lib/trafego/analiseConjunto'
import { RECUSA_ENTIDADE_DESCONHECIDA, DICA_DE_ENTIDADE_DO_PAINEL_PARA_O_MODELO } from '@/lib/trafego/guardrails'

const SENTINELA = 'AWAVE_META_LAUNCH_CREATIVE'

export interface ProporLancarCriativoInput {
  adsetId: string
  artifactId: string
  message: string
  link: string
  cta?: string
  pagina?: string
  name?: string
  headline?: string
}
export interface ProporLancarCriativoCtx { operatorId?: string; actingAgentId?: string }
export interface ProporLancarCriativoDeps {
  runAction?: typeof runActionDefault
  getSetting?: typeof getSettingDefault
  listLatestSnapshots?: typeof listLatestSnapshotsDefault
  getArtifact?: typeof getArtifactDefault
  metaGraphGet?: typeof metaGraphGetDefault
  createApproval?: typeof createApprovalDefault
  discoverAccountId?: typeof discoverAccountIdDefault
  notificarAprovacao?: typeof notificarAprovacaoDefault
  gerarCopyLancamento?: typeof gerarCopyLancamentoDefault
  lerLinkDoConjunto?: (adsetId: string, deps: { metaGraphGet: typeof metaGraphGetDefault }) => Promise<string[]>
  lerContextoDoConjunto?: (adsetId: string, deps: { metaGraphGet: typeof metaGraphGetDefault }) => Promise<ContextoConjuntoRaw | null>
}


async function lerLinkDoConjuntoDefault(
  adsetId: string,
  deps: { metaGraphGet: typeof metaGraphGetDefault },
): Promise<string[]> {
  const resp = await deps.metaGraphGet(
    `/${adsetId}/ads?fields=creative{object_story_spec{link_data{link}},asset_feed_spec{link_urls}}&limit=10`,
  ).catch(() => null)
  const ads = Array.isArray((resp as { data?: unknown } | null)?.data)
    ? (resp as { data: unknown[] }).data : []
  const out: string[] = []
  const seen = new Set<string>()
  for (const ad of ads) {
    const link = extrairLinkDeAnuncio(ad)
    if (link && !seen.has(link)) { seen.add(link); out.push(link) }
  }
  return out
}

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

export async function proporLancarCriativo(
  input: ProporLancarCriativoInput,
  ctx: ProporLancarCriativoCtx,
  deps: ProporLancarCriativoDeps = {},
): Promise<{ output: string }> {
  if (!ctx.operatorId) return { output: 'Não consegui identificar o operador. Recarregue a página e tente de novo.' }

  const run = deps.runAction ?? runActionDefault
  const getSetting = deps.getSetting ?? getSettingDefault
  const listLatest = deps.listLatestSnapshots ?? listLatestSnapshotsDefault
  const getArt = deps.getArtifact ?? getArtifactDefault
  const graphGet = deps.metaGraphGet ?? metaGraphGetDefault
  const doCreateApproval = deps.createApproval ?? createApprovalDefault
  const discoverAccount = deps.discoverAccountId ?? discoverAccountIdDefault
  const notificar = deps.notificarAprovacao ?? notificarAprovacaoDefault
  const gerarCopy = deps.gerarCopyLancamento ?? gerarCopyLancamentoDefault
  const lerLinkConjunto = deps.lerLinkDoConjunto ?? lerLinkDoConjuntoDefault
  const lerContexto = deps.lerContextoDoConjunto ?? lerContextoDoConjuntoDefault
  const agent = ctx.actingAgentId ?? 'gestor-trafego'

  
  
  
  if (!input.artifactId || !input.artifactId.trim())
    return { output: 'Preciso da arte pra subir. Gere ou finalize um criativo no /design primeiro.' }

  
  const accountId = await resolverContaParaAcao(agent, run, getSetting, discoverAccount)
  if (!accountId) return { output: 'Não encontrei uma conta de anúncios conectada. Conecte o Meta Ads em /config (toolkit Meta Ads).' }

  
  const idsConhecidos = new Set<string>()
  const nomePorId = new Map<string, string>()
  try {
    const snaps = await listLatest(ctx.operatorId, 'adset', 200)
    for (const s of snaps) {
      idsConhecidos.add(s.entity_id)
      if (s.entity_name) nomePorId.set(s.entity_id, s.entity_name)
    }
  } catch (e) { console.warn('[proporLancarCriativo] listLatestSnapshots falhou (não-fatal):', e) }
  if (!idsConhecidos.has(input.adsetId)) {
    
    
    
    return { output: `${RECUSA_ENTIDADE_DESCONHECIDA}\n${DICA_DE_ENTIDADE_DO_PAINEL_PARA_O_MODELO}` }
  }
  const nomeAdset = nomePorId.get(input.adsetId)

  
  let storageOk = false
  let arteNome: string | undefined
  try {
    const art = await getArt(input.artifactId)
    storageOk = !!art?.storage_ref && art.kind === 'imagem'
    if (art?.title) arteNome = String(art.title)
  } catch (e) { console.warn('[proporLancarCriativo] getArtifact falhou (não-fatal):', e) }
  if (!storageOk) {
    return { output: 'Essa arte não tem imagem pra subir (ou não é uma imagem). Finalize um criativo no /design antes.' }
  }

  
  const contasResp = await graphGet('/me/accounts?fields=id,name').catch(() => null)
  const rawPaginas = Array.isArray((contasResp as { data?: unknown } | null)?.data)
    ? (contasResp as { data: Array<{ id?: unknown; name?: unknown }> }).data : []
  const paginas: PaginaMeta[] = rawPaginas
    .filter((p) => p?.id)
    .map((p) => ({ id: String(p.id), name: String(p.name ?? p.id) }))
  const escolha = escolherPagina(paginas, input.pagina)
  if (!escolha.ok) return { output: escolha.motivo }
  const pageId = escolha.pagina.id

  
  const pageNode = await graphGet(`/${pageId}?fields=instagram_business_account{id,username},connected_instagram_account{id,username},instagram_accounts{id,username}`).catch(() => null)
  const igUserId = extrairIgUserId(pageNode)
  const avisoIg = igUserId ? '' : ' ⚠ Sua Página não tem um Instagram vinculado: o anúncio roda no Facebook; vincule um IG à Página pra rodar também no Instagram.'

  
  const linksConjunto = await lerLinkConjunto(input.adsetId, { metaGraphGet: graphGet })
  const linkRes = resolverLink({ linkDono: input.link, linksConjunto })
  if (!linkRes.ok) return { output: linkRes.motivo }
  const resolvedLink = linkRes.link
  const avisoLink = linkRes.aviso

  
  
  
  
  let contexto: ReturnType<typeof montarContextoResumo> | undefined
  let raw: ContextoConjuntoRaw | null = null
  try {
    raw = await lerContexto(input.adsetId, { metaGraphGet: graphGet })
    if (raw) contexto = montarContextoResumo(raw)
  } catch (e) {
    console.warn('[proporLancarCriativo] lerContextoDoConjunto falhou (fail-open):', e)
  }

  
  
  const donoMessage = input.message?.trim()
  const donoHeadline = input.headline?.trim()
  const donoCta = input.cta?.trim()
  let copy: { message: string; headline: string; ctaMeta: string } | null = null
  let liaEscreveu = false
  if (!(donoMessage && donoHeadline && donoCta)) {
    try {
      copy = await gerarCopy(
        { artifactId: input.artifactId, link: resolvedLink },
        { operatorId: ctx.operatorId, actingAgentId: agent },
      )
      liaEscreveu = true
    } catch (e) {
      console.warn('[proporLancarCriativo] gerarCopyLancamento falhou (fail-soft):', e)
    }
  }
  const message = donoMessage || copy?.message
  const headline = donoHeadline || copy?.headline
  const cta = normalizarCta(donoCta || copy?.ctaMeta)

  
  if (!message)
    return { output: 'Não consegui redigir a copy do anúncio. Me diga o texto do anúncio (a mensagem principal).' }

  
  let avisos: Aviso[] = []
  try { if (raw) avisos = analisarEncaixe(raw, { cta }) }
  catch (e) { console.warn('[proporLancarCriativo] analisarEncaixe falhou (fail-soft):', e) }

  
  const nomeAnuncio = (input.name ?? `Anúncio ${nomeAdset ?? input.adsetId}`).slice(0, 80)
  const resolvido: LancamentoResolvido = {
    accountId, adsetId: input.adsetId, pageId, artifactId: input.artifactId,
    message, link: resolvedLink, cta, name: nomeAnuncio,
    ...(igUserId ? { igUserId } : {}),
    ...(headline ? { headline } : {}),
    conjuntoNome: nomeAdset,
    paginaNome: escolha.pagina.name,
    ...(arteNome ? { arteNome } : {}),
  }

  
  const arteLabel = arteNome ?? input.artifactId
  const conjuntoLabel = nomeAdset ?? input.adsetId
  const titulo = `Lançar anúncio: arte "${arteLabel}" no conjunto "${conjuntoLabel}"`
  let approval
  try {
    approval = await doCreateApproval({
      kind: 'tool_action', title: titulo, agent,
      action_slug: SENTINELA,
      action_args: { ...(resolvido as unknown as Record<string, unknown>), ...(contexto ? { contexto } : {}), ...(avisos.length ? { avisos } : {}) },
    })
  } catch {
    return { output: 'Não consegui registrar a proposta de lançamento. Tente de novo.' }
  }
  void notificar(approval)

  const igLinha = igUserId ? 'Facebook e Instagram' : 'Facebook'
  const nomeParte = nomeAdset ? `"${nomeAdset}" ` : ''
  const avisoCopy = liaEscreveu ? ' Copy escrita pela Lia (edite na aprovação se quiser).' : ''
  const avisoLinkStr = avisoLink ? ` ${avisoLink}` : ''
  const linhaCtx = contexto ? [contexto.posicionamento, contexto.orcamento, contexto.otimizacao].filter(Boolean).join(' · ') : ''
  const avisoContexto = linhaCtx ? ` Contexto: ${linhaCtx}.` : ''
  const avisoObservacoes = avisos.length ? ` Observações: ${avisos.map((a) => a.texto).join(' · ')}.` : ''
  return { output: `Proposta criada: lançar um anúncio no conjunto ${nomeParte}[${input.adsetId}] com a arte [${input.artifactId}], na Página "${escolha.pagina.name}" (${igLinha}). Começa PAUSADO. Aprove em /aprovações pra subir. Eu não faço nada sem seu OK.${avisoCopy}${avisoLinkStr}${avisoContexto}${avisoObservacoes}${avisoIg}` }
}
