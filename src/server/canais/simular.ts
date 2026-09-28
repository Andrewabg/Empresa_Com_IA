












import { buildCanalAgent, modeloDoCanal } from './agent'
import { runAgentRound, type HeadlessAgentLike, type RoundResult } from '@/server/agent/executor/headlessRun'
import { readLiveSnapshot as readLiveSnapshotReal } from './channelConfig'
import { getDraft as getDraftReal } from '@/data/agentConfigDrafts'
import { mergeDelta, type ChannelConfigSnapshot } from '@/lib/canais/configSnapshot'
import { getAgentRow as getAgentRowReal, type AgentRow } from '@/data/agents'
import { searchBase as searchBaseReal, listBaseByAgent as listBaseByAgentReal, type ResultadoBusca } from '@/data/baseConhecimento'
import { aplicarRascunhoNaBusca } from '@/lib/canais/baseRascunhoBusca'
import { dryToolDeps, type ArquivoPublico } from '@/server/treino/dryDeps'
import { listCanais as listCanaisReal } from '@/data/canais'
import { listCanalMidia as listCanalMidiaReal } from '@/data/canalMidia'
import { compilarPersona } from '@/lib/treino/persona'
import { renderFicha, type FichaContato } from '@/lib/canais/ficha'
import { recordCost as recordCostReal } from '@/data/cost'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getComposioClient, composioUserId, type ComposioClient } from '@/server/actions/composio'
import { aplicarTetoDeAcoes } from '@/lib/canais/tetoDeAcoes'
import { COMPOSIO_MAX_NO_CANAL, INTERLOCUTOR_DO_CANAL } from '@/lib/canais/turnoDoCanal'
import { buildComposioMastraTools as buildComposioMastraToolsReal } from '@/server/actions/mastraTools'
import { makeExecuteFnDry, type AcaoSimulada } from './simularCaptura'
import { avisoDeDemora, avisoDeFechamentoVazio, cortadoPeloPrazo, LINHA_DEMORA } from '@/lib/conversa/fechamentoDoTurno'
import { ateAUltimaFraseCompleta } from '@/lib/conversa/fraseCompleta'
import { AVISO_ESCALACAO } from '@/lib/canais/escalacao'
import type { Diretriz } from '@/lib/directives'

const MAX_STEPS = 6

type Msg = { role: 'user' | 'assistant'; content: string }

export interface SimularDeps {
  getAgentRow: typeof getAgentRowReal
  readLiveSnapshot: (agentId: string) => Promise<ChannelConfigSnapshot>
  getDraft: typeof getDraftReal
  searchBase: typeof searchBaseReal
  listBaseByAgent: typeof listBaseByAgentReal
  getComposio: () => Promise<ComposioClient | null>
  getApiKey: () => Promise<string | null>
  buildComposioMastraTools: typeof buildComposioMastraToolsReal
  buildAgent: typeof buildCanalAgent
  runRound: typeof runAgentRound
  recordCost: typeof recordCostReal
  
  listarArquivosDoAgente: (agentId: string) => Promise<ArquivoPublico[]>
}


async function arquivosDoAgente(agentId: string): Promise<ArquivoPublico[]> {
  try {
    const canais = await listCanaisReal()
    const canal = canais.find((c) => c.agent_id === agentId && c.enabled) ?? canais.find((c) => c.agent_id === agentId)
    if (!canal) return []
    const rows = await listCanalMidiaReal(canal.id, true)
    return rows.map((a) => ({ slug: a.slug, rotulo: a.rotulo, descricao: a.descricao }))
  } catch {
    return []
  }
}

function defaultDeps(): SimularDeps {
  return {
    getAgentRow: getAgentRowReal,
    readLiveSnapshot: (agentId) => readLiveSnapshotReal(agentId),
    getDraft: getDraftReal,
    searchBase: searchBaseReal,
    listBaseByAgent: listBaseByAgentReal,
    getComposio: getComposioClient,
    getApiKey: () => getSecret(SECRET_KEYS.openai_api_key),
    buildComposioMastraTools: buildComposioMastraToolsReal,
    buildAgent: buildCanalAgent,
    runRound: runAgentRound,
    recordCost: recordCostReal,
    listarArquivosDoAgente: arquivosDoAgente,
  }
}


const FICHA_TESTE: FichaContato = { perfil: {}, aprendizados: [] }


function paraDiretrizes(textos: string[], at: string): Diretriz[] {
  return textos.map((texto) => ({ texto, origem: 'operador' as const, at }))
}


export async function simular(
  agentId: string,
  mensagens: Msg[],
  opts: { origem?: 'rascunho' | 'publicado' } = {},
  depsOver: Partial<SimularDeps> = {},
): Promise<{ texto: string; acoesSimuladas: AcaoSimulada[]; arquivosSimulados: string[]; escalacoes?: Array<{ motivo: string }> }> {
  const deps: SimularDeps = { ...defaultDeps(), ...depsOver }
  const origem = opts.origem ?? 'rascunho'

  
  const realRow = await deps.getAgentRow(agentId)
  if (!realRow) throw new Error(`simular: agente ${agentId} não existe`)

  const vivo = await deps.readLiveSnapshot(agentId)
  let snapshot = vivo
  let draft: Awaited<ReturnType<typeof deps.getDraft>> = null
  if (origem === 'rascunho') {
    draft = await deps.getDraft(agentId)
    if (draft) snapshot = mergeDelta(vivo, draft.delta)
  }

  
  const syntheticRow: AgentRow = {
    ...realRow,
    name: snapshot.name,
    system_prompt: snapshot.system_prompt,
    model: snapshot.model,
    tools: snapshot.tools,
    skills: snapshot.skills,
    enabled: snapshot.enabled,
  }

  
  const apiKey = await deps.getApiKey()
  if (!apiKey) return { texto: '', acoesSimuladas: [], arquivosSimulados: [] }

  const now = new Date().toISOString()

  
  const personaBlock = compilarPersona(snapshot.personaCampos)
  const diretrizes = paraDiretrizes(snapshot.diretrizes, now)
  const fichaTexto = renderFicha(FICHA_TESTE)

  
  
  
  
  let searchBaseParaDry = deps.searchBase
  const baseOps = origem === 'rascunho' ? draft?.delta?.base ?? null : null
  if (baseOps) {
    const rows = await deps.listBaseByAgent(agentId).catch(() => [])
    const conhecidasPorId = new Map(
      rows
        .filter((r) => r.agent_id === agentId)
        .map((r) => [r.id, { id: r.id, titulo: r.titulo, conteudo: r.conteudo, tipo: r.tipo }] as const),
    )
    searchBaseParaDry = async (input) => {
      const publicados = await deps.searchBase(input)
      return aplicarRascunhoNaBusca(
        publicados, baseOps, conhecidasPorId, input.pergunta, input.tipo ?? null, input.k ?? 5,
      ) as ResultadoBusca[]
    }
  }
  
  
  const arquivosSimulados: string[] = []
  const catalogo = await deps.listarArquivosDoAgente(agentId).catch(() => [] as ArquivoPublico[])
  
  
  const escalacoes: Array<{ motivo: string }> = []
  const toolDeps = dryToolDeps({ searchBase: searchBaseParaDry }, { catalogo, coletor: arquivosSimulados }, escalacoes)

  
  const coletor: AcaoSimulada[] = []
  let composioTools: Record<string, unknown> = {}
  try {
    
    
    
    const composio = snapshot.tools?.composio ? await deps.getComposio() : null
    if (composio) {
      const modes = snapshot.tools?.composio_action_modes ?? null
      const toolkits = snapshot.tools?.composio_toolkits ?? null
      const todas = await deps.buildComposioMastraTools(
        { userId: composioUserId(), toolkits },
        composio,
        makeExecuteFnDry(coletor, { modes }),
      )
      const teto = aplicarTetoDeAcoes(todas, COMPOSIO_MAX_NO_CANAL)
      if (teto.cortadas.length > 0) {
        console.warn(`[simular] acoes acima do teto do canal (${COMPOSIO_MAX_NO_CANAL}); fora do ensaio: ${teto.cortadas.join(', ')}`)
      }
      composioTools = teto.tools
    }
  } catch (err) {
    console.warn('[simular] Composio indisponível (fail-open, base only):', err)
    composioTools = {}
  }

  
  const ctx = { agentId, conversaId: 'simulador', contatoId: 'simulador', canalId: 'simulador' }
  const agent = deps.buildAgent({
    row: syntheticRow, apiKey, diretrizes, fichaTexto, personaBlock, ctx, toolDeps, composioTools,
    
    
    
    aSeco: true,
    capturarSeco: (slug, args, requerAprovacao) =>
      coletor.push({ toolkit: null, slug, args, modo: requerAprovacao ? 'hitl' : 'direto' }),
  })

  
  const round: RoundResult = await deps.runRound(
    agent as unknown as HeadlessAgentLike, mensagens,
    
    
    
    
    { maxSteps: MAX_STEPS, fechamento: true, interlocutor: INTERLOCUTOR_DO_CANAL },
  )

  
  await deps.recordCost({
    kind: 'chat', model: modeloDoCanal(syntheticRow),
    promptTokens: round.inputTokens, completionTokens: round.outputTokens, cachedTokens: round.cachedTokens,
    agent: agentId, tool: 'simulador',
  })

  
  
  
  
  
  
  
  
  
  if (cortadoPeloPrazo(round)) {
    const remate = round.text.trim() ? LINHA_DEMORA : avisoDeDemora(false)
    return { texto: round.text + remate, acoesSimuladas: coletor, arquivosSimulados }
  }

  
  
  const texto = round.fechamentoExpirou ? ateAUltimaFraseCompleta(round.text) : round.text

  
  
  
  if (!texto.trim() && escalacoes.length > 0) {
    return { texto: AVISO_ESCALACAO, acoesSimuladas: coletor, arquivosSimulados, escalacoes }
  }

  
  
  
  if (!texto.trim() && round.fechamentoRodou) {
    return {
      texto: avisoDeFechamentoVazio(round.rodouFerramenta ?? false),
      acoesSimuladas: coletor, arquivosSimulados, escalacoes,
    }
  }

  return { texto, acoesSimuladas: coletor, arquivosSimulados, escalacoes }
}
