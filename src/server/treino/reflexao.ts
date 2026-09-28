


import { listarAgentesComRegrasOuro } from '@/data/treino'
import { reconsolidarRegrasOuro } from '@/server/treino/consolidacao'

export const REFLEXAO_AGENTES_POR_TICK = 3

export async function runTreinoReflexao(
  deps: {
    listarAgentes?: typeof listarAgentesComRegrasOuro
    reconsolidar?: typeof reconsolidarRegrasOuro
  } = {},
): Promise<{ refletidos: number }> {
  const listarAgentes = deps.listarAgentes ?? listarAgentesComRegrasOuro
  const reconsolidar = deps.reconsolidar ?? reconsolidarRegrasOuro

  const agentes = (await listarAgentes()).slice(0, REFLEXAO_AGENTES_POR_TICK)
  let refletidos = 0
  for (const agentId of agentes) {
    
    
    try {
      const r = await reconsolidar(agentId)
      if (r.mudou) refletidos++
    } catch (e) {
      console.warn('[treino] reflexão de agente fail-open:', agentId, e)
    }
  }
  return { refletidos }
}
