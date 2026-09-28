
import { getAgentRow as getAgentRowImpl } from '@/data/agents'
import { getTurnContext } from '../agent/turnContext'
import { origemDoAprendizado } from '@/lib/memory/origemDoEpisodico'
import { getDirectives as getDirectivesImpl, upsertDirectives as upsertDirectivesImpl } from '@/data/agentDirectives'
import { insertEpisodic as insertEpisodicImpl } from '@/data/episodicMemory'
import { addDiretriz, diretrizesAtivas, norm, DIRETRIZES_CAP } from '@/lib/directives'
import { createApproval as createApprovalImpl, type Approval } from '@/data/approvals'
import type { Brain } from '../brain/runtime'

export interface ApplyDirectiveDeps {
  getAgentRow?: typeof getAgentRowImpl
  getDirectives?: typeof getDirectivesImpl
  upsertDirectives?: typeof upsertDirectivesImpl
  now?: () => string
}


export const mensagemDiretrizSubstituida = (nome: string): string =>
  `Essa regra está guardada no histórico de ${nome} porque outra a substituiu, então ela não passou a valer. Para ela voltar a valer, abra a ficha de ${nome} e remova a regra que a substituiu.`


export async function applyDirective(
  input: { agentId: string; diretriz: string },
  deps: ApplyDirectiveDeps = {},
): Promise<{ ok: boolean; message: string }> {
  const getAgentRow = deps.getAgentRow ?? getAgentRowImpl
  const getDirectives = deps.getDirectives ?? getDirectivesImpl
  const upsertDirectives = deps.upsertDirectives ?? upsertDirectivesImpl
  const now = deps.now ?? (() => new Date().toISOString())

  const texto = input.diretriz.trim()
  if (!texto) return { ok: false, message: 'Diretriz vazia.' }
  const row = await getAgentRow(input.agentId)
  if (!row) return { ok: false, message: `Agente '${input.agentId}' não existe.` }

  const { diretrizes } = await getDirectives(input.agentId)
  if (diretrizes.some((d) => norm(d.texto) === norm(texto))) {
    const valendo = diretrizesAtivas(diretrizes).some((d) => norm(d.texto) === norm(texto))
    if (!valendo) return { ok: false, message: mensagemDiretrizSubstituida(row.name) }
    return { ok: true, message: `${row.name} já segue essa regra.` }
  }
  const next = addDiretriz(diretrizes, { texto, origem: 'operador', at: now() }, { cap: DIRETRIZES_CAP })
  if (next !== diretrizes) await upsertDirectives(input.agentId, next)
  return { ok: true, message: `Anotei pra ${row.name}: "${texto}".` }
}

export interface ProporDiretrizDeps {
  getAgentRow?: typeof getAgentRowImpl
  createApproval?: typeof createApprovalImpl
  
  notificar?: (a: Approval) => void
}


export async function proporDiretriz(
  input: { agentId: string; diretriz: string; actingAgentId?: string },
  deps: ProporDiretrizDeps = {},
): Promise<{ ok: boolean; message: string }> {
  const getAgentRow = deps.getAgentRow ?? getAgentRowImpl
  const createApproval = deps.createApproval ?? createApprovalImpl

  const texto = input.diretriz.trim()
  if (!texto) return { ok: false, message: 'Diretriz vazia.' }
  const row = await getAgentRow(input.agentId)
  if (!row) return { ok: false, message: `Agente '${input.agentId}' não existe.` }

  const proposer = input.actingAgentId ?? 'jarvis'
  const approval = await createApproval({
    kind: 'directive',
    title: `Fixar regra durável para ${row.name}`,
    agent: proposer,
    action_args: { agentId: input.agentId, diretriz: texto },
  })

  
  if (deps.notificar) {
    try { deps.notificar(approval) } catch {  }
  } else {
    try {
      const { notificarAprovacao } = await import('../proativo/producers')
      void notificarAprovacao(approval)
    } catch (e) { console.warn('[proporDiretriz] notificar falhou (não-fatal):', e) }
  }
  

  return { ok: true, message: `Propus a regra pra ${row.name} — preciso da sua aprovação em /aprovações antes de fixar.` }
}

export interface AnotarDeps { brain?: Brain; insertEpisodic?: typeof insertEpisodicImpl }


export async function anotarAprendizado(
  input: { agentId: string; aprendizado: string },
  deps: AnotarDeps = {},
): Promise<{ ok: boolean; message: string }> {
  const texto = input.aprendizado.trim()
  if (!texto || !input.agentId) return { ok: false, message: 'Aprendizado vazio.' }
  const brain = deps.brain ?? (await (await import('../brain/runtime')).getBrain())
  const insertEpisodic = deps.insertEpisodic ?? insertEpisodicImpl
  const [emb] = await brain.embedder.embedAll([texto])
  
  const origem = origemDoAprendizado(getTurnContext().terceiroIngerido)
  await insertEpisodic(brain.db, { conversation_id: null, summary: texto, embedding: emb, tags: ['aprendizado'], agentId: input.agentId, embeddingVersion: brain.embedder.version(), originClass: origem })
  return { ok: true, message: 'Anotado — vou lembrar disso.' }
}
