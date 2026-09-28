


import { resumoRegressao, type ResultadoTeste, type ResumoRegressao } from '@/lib/treino/regressao'
import {
  listarTestes as listarTestesReal,
  marcarInstavel as marcarInstavelReal,
  type TreinoCaso,
} from '@/data/treino'
import { getAgentRow } from '@/data/agents'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { replayCaso } from '@/server/treino/replay'
import { julgarCaso } from '@/server/treino/judge'
import type { AgentRow } from '@/data/agents'


export class RegressaoSemChave extends Error {
  constructor() {
    super('regressão do Treino: a chave da OpenAI não está configurada')
    this.name = 'RegressaoSemChave'
  }
}


export class ReplayVazio extends Error {
  constructor(casoId: string) {
    super(`replay do caso ${casoId} voltou sem texto`)
    this.name = 'ReplayVazio'
  }
}

export interface RegressaoDeps {
  listarTestes?: (agentId: string) => Promise<TreinoCaso[]>
  getRow?: typeof getAgentRow
  getApiKey?: () => Promise<string | null>
  replay?: (caso: TreinoCaso, row: AgentRow | null, key: string) => Promise<string>
  judge?: (
    criterio: string,
    resposta: string,
  ) => Promise<{ passou: boolean; porque: string; estavel: boolean }>
  marcarInstavel?: typeof marcarInstavelReal
  
  apenas?: string[]
}

export async function rodarRegressao(
  agentId: string,
  deps: RegressaoDeps = {},
): Promise<ResumoRegressao> {
  const listar = deps.listarTestes ?? listarTestesReal
  const getRow = deps.getRow ?? getAgentRow
  
  
  
  const getApiKey = deps.getApiKey ?? (() => getSecret(SECRET_KEYS.openai_api_key))
  const replay =
    deps.replay ??
    ((c: TreinoCaso, r: AgentRow | null, k: string) => replayCaso(c, r as AgentRow, k))
  const judge =
    deps.judge ??
    ((criterio: string, resposta: string) => julgarCaso(criterio, resposta, agentId))
  const marcar = deps.marcarInstavel ?? marcarInstavelReal

  let testes = await listar(agentId)
  if (deps.apenas?.length) testes = testes.filter((t) => deps.apenas!.includes(t.id))

  const row = await getRow(agentId)
  const key = (await getApiKey())?.trim()
  
  
  if (!key) throw new RegressaoSemChave()

  const resultados: ResultadoTeste[] = []
  for (const t of testes) {
    try {
      const resp = await replay(t, row, key)
      
      
      
      
      if (!resp.trim()) throw new ReplayVazio(t.id)
      const v = await judge(t.criterio!, resp)
      await marcar(t.id, v.estavel)
      resultados.push({ casoId: t.id, passou: v.passou, estavel: v.estavel })
    } catch {
      resultados.push({ casoId: t.id, passou: false, estavel: false })
    }
  }

  return resumoRegressao(resultados)
}
