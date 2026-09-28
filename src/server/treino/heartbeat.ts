



import { drenarRegressaoPendente } from '@/data/treino'
import { rodarRegressao } from '@/server/treino/regression'
import { runTreinoReflexao } from '@/server/treino/reflexao'

export async function runTreinoHeartbeat(
  deps: {
    drenar?: typeof drenarRegressaoPendente
    rodar?: typeof rodarRegressao
    refletir?: typeof runTreinoReflexao
  } = {},
): Promise<{ rodados: number; refletidos: number }> {
  const drenar = deps.drenar ?? drenarRegressaoPendente
  const rodar = deps.rodar ?? rodarRegressao
  const ids = await drenar()
  let rodados = 0
  for (const agentId of ids) {
    try {
      await rodar(agentId)
      rodados++
    } catch (e) {
      console.warn('[treino] regressão fail-open:', e)
    }
  }
  let refletidos = 0
  try {
    refletidos = (await (deps.refletir ?? runTreinoReflexao)()).refletidos
  } catch (e) {
    console.warn('[treino] reflexão fail-open:', e)
  }
  return { rodados, refletidos }
}
