
import { assembleStableMemory, assembleRecallMemory } from './inject'
import { AMBIENT_RECALL_K } from '@/lib/memory/recallBudget'
import { recall as recallImpl, type RecallResult } from './recall'
import { applyScopes, type NotaCitada } from '../tools/buscarCerebro'
import { getAgentRow as getAgentRowImpl, type AgentRow } from '@/data/agents'


export interface AgentContextParts {
  stable: string
  recall: string
}


type ScopeRow = Pick<AgentRow, 'id' | 'is_primary' | 'brain_read_scopes'>

export interface AssembleAgentContextDeps {
  getAgentRow?: (id: string) => Promise<ScopeRow | null>
  
  recall?: (query: string, k: number, agentId: string | null) => Promise<RecallResult>
  
  assembleStable?: (opts: { operatorId?: string }) => Promise<string>
  
  assembleRecall?: (
    userText: string,
    k: number,
    recallFn: (query: string, k: number) => Promise<RecallResult>,
  ) => Promise<string>
}

export interface AssembleAgentContextOpts {
  operatorId?: string
  k?: number
  
  notasInjetadas?: NotaCitada[]
}


export function deriveScope(row: ScopeRow | null): { episodicAgentId: string | null; scopes: string[] } {
  if (!row) return { episodicAgentId: null, scopes: [] }
  return {
    episodicAgentId: row.is_primary ? null : row.id,
    scopes: row.brain_read_scopes ?? [],
  }
}


export function recallEscopadoDoAgente(
  row: ScopeRow | null,
  opts: { excluirCaminho?: (caminho: string) => boolean } = {},
  deps: Pick<AssembleAgentContextDeps, 'recall'> = {},
): (query: string, n: number) => Promise<RecallResult> {
  const { episodicAgentId, scopes } = deriveScope(row)
  const rawRecall =
    deps.recall ??
    ((q: string, k: number, aid: string | null) =>
      recallImpl(q, k, { agentId: aid, scopes, excluirCaminho: opts.excluirCaminho }))
  return async (query: string, n: number): Promise<RecallResult> => {
    const { notes, degraded } = await rawRecall(query, n, episodicAgentId)
    
    
    const filtradas: NotaCitada[] = applyScopes(notes, scopes, { episodicAgentId })
    return { notes: filtradas, degraded }
  }
}


export async function assembleAgentContext(
  agentId: string,
  prompt: string,
  opts: AssembleAgentContextOpts = {},
  deps: AssembleAgentContextDeps = {},
): Promise<AgentContextParts> {
  const getAgentRow = deps.getAgentRow ?? (getAgentRowImpl as (id: string) => Promise<ScopeRow | null>)
  
  
  
  
  
  let scopesForRecall: string[] = []
  const rawRecall =
    deps.recall ??
    ((q: string, k: number, aid: string | null) =>
      recallImpl(q, k, { agentId: aid, scopes: scopesForRecall }))
  const assembleStable = deps.assembleStable ?? ((o) => assembleStableMemory(o))
  const assembleRecall =
    deps.assembleRecall ?? ((text, k, fn) => assembleRecallMemory(text, k, { recall: fn }))
  const k = opts.k ?? AMBIENT_RECALL_K

  
  let row: ScopeRow | null = null
  try {
    row = await getAgentRow(agentId)
  } catch (e) {
    console.warn('[assembleAgentContext] getAgentRow fail-open:', e)
    row = null
  }
  const { episodicAgentId, scopes } = deriveScope(row)
  scopesForRecall = scopes

  
  
  
  
  const scopedRecall = async (query: string, n: number): Promise<RecallResult> => {
    const { notes, degraded } = await rawRecall(query, n, episodicAgentId)
    const filtradas: NotaCitada[] = applyScopes(notes, scopes, { episodicAgentId }) 
    if (opts.notasInjetadas) opts.notasInjetadas.push(...filtradas)
    return { notes: filtradas, degraded }
  }

  const [stable, recall] = await Promise.all([
    assembleStable({ operatorId: opts.operatorId }).catch((e) => {
      console.warn('[assembleAgentContext] stable fail-open:', e)
      return ''
    }),
    assembleRecall(prompt, k, scopedRecall).catch((e) => {
      console.warn('[assembleAgentContext] recall fail-open:', e)
      return ''
    }),
  ])

  return { stable, recall }
}
