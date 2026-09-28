


import { buildCanalAgent, modeloDoCanal } from '@/server/canais/agent'
import { runAgentRound, type HeadlessAgentLike } from '@/server/agent/executor/headlessRun'
import { getDirectives } from '@/data/agentDirectives'
import { carregarPersonaBlock } from '@/server/treino/personaLoad'
import { dryToolDeps } from '@/server/treino/dryDeps'
import { renderFicha } from '@/lib/canais/ficha'
import { comContextoNaUltimaMsg, blocoRelogio, tzSegura } from '@/lib/relogio'
import { recuperarEInjetar } from '@/server/canais/recuperar'
import { recordCost } from '@/data/cost'
import type { TreinoCaso } from '@/data/treino'
import type { AgentRow } from '@/data/agents'
import type { FichaContato } from '@/lib/canais/ficha'

export class ReplayIncompleto extends Error {
  
  constructor(motivo = 'o agente não terminou dentro do limite de steps') {
    super(`replayCaso: ${motivo}`)
  }
}

const MAX_STEPS = 6

export async function replayCaso(
  caso: TreinoCaso,
  rowAtual: AgentRow,
  apiKey: string,
  deps: {
    getDirectives?: typeof getDirectives
    carregarPersona?: typeof carregarPersonaBlock
    recordCost?: typeof recordCost
    recuperar?: typeof recuperarEInjetar
    tz?: string
  } = {},
): Promise<string> {
  
  const { diretrizes } = await (deps.getDirectives ?? getDirectives)(rowAtual.id)
  const personaBlock = await (deps.carregarPersona ?? carregarPersonaBlock)(rowAtual.id)

  
  const fichaTexto = renderFicha(caso.estimulo.ficha as FichaContato)

  const ctx = {
    agentId: rowAtual.id,
    conversaId: caso.conversa_id ?? 'replay',
    contatoId: 'replay',
    canalId: caso.canal_id ?? 'replay',
  }

  const agent = buildCanalAgent({
    row: rowAtual,
    apiKey,
    diretrizes,
    fichaTexto,
    personaBlock,
    ctx,
    toolDeps: dryToolDeps(),
    
    
    
    
    composioTools: {},
    
    
    aSeco: true,
  })

  
  const tz = tzSegura(deps.tz)
  const blocoConhecimento = await (deps.recuperar ?? recuperarEInjetar)(rowAtual.id, caso.estimulo.mensagens)
  const suffix = [blocoRelogio(caso.estimulo.agora, tz), blocoConhecimento].filter((s) => s.trim()).join('\n\n')
  const msgs = comContextoNaUltimaMsg(caso.estimulo.mensagens, suffix)

  const round = await runAgentRound(agent as unknown as HeadlessAgentLike, msgs, { maxSteps: MAX_STEPS })

  
  await (deps.recordCost ?? recordCost)({
    kind: 'chat', model: modeloDoCanal(rowAtual),
    promptTokens: round.inputTokens, completionTokens: round.outputTokens, cachedTokens: round.cachedTokens,
    agent: rowAtual.id, tool: 'treinoReplay',
  })

  if (!round.finished) {
    throw new ReplayIncompleto(
      round.fimAnormal === 'prazo' ? 'o agente demorou demais e o replay não terminou' : undefined,
    )
  }

  return round.text
}
