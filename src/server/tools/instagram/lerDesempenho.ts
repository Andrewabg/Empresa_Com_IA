
import { getAutomacao as getAutomacaoDefault, listRuns as listRunsDefault } from '@/data/igAutomacoes'
import { getCanalDoInstagram as getCanalDefault } from '@/server/instagram/canalDoInstagram'
import { resumoDeDesempenho, avisoDeSaudeDoCanal, comAvisoDeSaude, TEXTOS_IG } from './formatar'

export interface LerDesempenhoIgInput {
  automacaoId: string
}

export interface LerDesempenhoIgDeps {
  getAutomacao?: typeof getAutomacaoDefault
  listRuns?: typeof listRunsDefault
  getCanal?: typeof getCanalDefault
  now?: () => string
}

export async function lerDesempenhoIg(
  input: LerDesempenhoIgInput,
  deps: LerDesempenhoIgDeps = {},
): Promise<string> {
  const buscarAutomacao = deps.getAutomacao ?? getAutomacaoDefault
  const listar = deps.listRuns ?? listRunsDefault
  const getCanal = deps.getCanal ?? getCanalDefault
  const now = deps.now ?? (() => new Date().toISOString())
  try {
    const automacao = await buscarAutomacao(input.automacaoId)
    if (!automacao) return TEXTOS_IG.automacaoNaoEncontrada
    const runs = await listar(input.automacaoId)
    let aviso = ''
    try { aviso = avisoDeSaudeDoCanal(await getCanal(), now()) }
    catch (e) { console.warn('[instagram/lerDesempenho] estado do canal fail-open:', e) }
    return comAvisoDeSaude(aviso, resumoDeDesempenho(runs, automacao.nome))
  } catch {
    return TEXTOS_IG.falhaLerDesempenho
  }
}
