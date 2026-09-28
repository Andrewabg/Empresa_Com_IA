
import { listAutomacoes as listDefault } from '@/data/igAutomacoes'
import { getCanalDoInstagram as getCanalDefault } from '@/server/instagram/canalDoInstagram'
import { resumoDeAutomacoes, avisoDeSaudeDoCanal, comAvisoDeSaude, TEXTOS_IG } from './formatar'

export interface ListarAutomacoesIgDeps {
  getCanal?: typeof getCanalDefault
  listAutomacoes?: typeof listDefault
  
  now?: () => string
}

export async function listarAutomacoesIg(deps: ListarAutomacoesIgDeps = {}): Promise<string> {
  const getCanal = deps.getCanal ?? getCanalDefault
  const listar = deps.listAutomacoes ?? listDefault
  const now = deps.now ?? (() => new Date().toISOString())
  try {
    const canal = await getCanal()
    if (!canal) return TEXTOS_IG.semConexao
    return comAvisoDeSaude(
      avisoDeSaudeDoCanal(canal, now()),
      resumoDeAutomacoes(await listar(canal.id)),
    )
  } catch {
    return TEXTOS_IG.falhaListarAutomacoes
  }
}
