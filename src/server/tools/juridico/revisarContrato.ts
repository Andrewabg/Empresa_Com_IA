


import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getFichaJuridica as getFichaImpl, upsertFichaJuridica as upsertFichaImpl } from '@/data/fichaJuridica'
import {
  getContrato as getContratoImpl,
  appendContratoVersao as appendVersaoImpl,
  setContratoStatus as setStatusImpl,
  mergeContratoMeta as mergeMetaImpl,
} from '@/data/contratos'
import { blocoDaFichaJuridica, mergeFichaJuridica } from '@/lib/juridico/ficha'
import { extrairPendencias } from '@/lib/juridico/minuta'
import { toContratoView, type JuridicoPatch } from '@/lib/juridico/types'
import { promptRevisao } from './prompts'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
interface GenUsage { inputTokens?: number; outputTokens?: number }


const RevisaoSchema = z.object({ texto: z.string(), nota: z.string(), aprendizado: z.string() })

export interface RevisarContratoInput { contratoId: string; pedido: string }
export interface RevisarContratoCtx { operatorId?: string; actingAgentId?: string }
export interface RevisarContratoDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage }>
  getContrato?: typeof getContratoImpl
  appendContratoVersao?: typeof appendVersaoImpl
  setContratoStatus?: typeof setStatusImpl
  mergeContratoMeta?: typeof mergeMetaImpl
  getFicha?: typeof getFichaImpl
  upsertFichaJuridica?: typeof upsertFichaImpl
  recordCost?: typeof recordCostImpl
  now?: () => string
}

export interface RevisarContratoResult { output: string; patches: JuridicoPatch[] }

async function defaultGenerate({ prompt, schema }: { prompt: string; schema: z.ZodType<unknown> }): Promise<{ object: unknown; usage: GenUsage }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema, prompt })
  return { object, usage }
}

function parse<T>(object: unknown, schema: z.ZodType<T>): T | null {
  const r = schema.safeParse(object)
  return r.success ? r.data : null
}

export async function revisarContrato(
  input: RevisarContratoInput, ctx: RevisarContratoCtx, deps: RevisarContratoDeps = {},
): Promise<RevisarContratoResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patches: [] }
  const generate = deps.generate ?? defaultGenerate
  const getContrato = deps.getContrato ?? getContratoImpl
  const appendVersao = deps.appendContratoVersao ?? appendVersaoImpl
  const setStatus = deps.setContratoStatus ?? setStatusImpl
  const mergeMeta = deps.mergeContratoMeta ?? mergeMetaImpl
  const getFicha = deps.getFicha ?? getFichaImpl
  const upsertFicha = deps.upsertFichaJuridica ?? upsertFichaImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const now = deps.now ?? (() => new Date().toISOString())
  const agentId = ctx.actingAgentId ?? 'juridico'
  const operatorId = ctx.operatorId

  const record = async (u: GenUsage) => {
    try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: u.inputTokens ?? 0, completionTokens: u.outputTokens ?? 0, agent: agentId, tool: 'revisarContrato' }) } catch {  }
  }

  
  const row = await getContrato(input.contratoId, operatorId)
  if (!row) return { output: 'Não achei esse contrato na Mesa — confere qual você quer que eu revise?', patches: [] }

  
  if (row.kind === 'analisado') {
    return { output: 'Esse é um contrato de terceiros — o que posso fazer é sugerir redlines no parecer, não reescrever a minuta deles.', patches: [] }
  }

  const ficha = blocoDaFichaJuridica(await getFicha(operatorId))

  
  const g = await generate({ prompt: promptRevisao({ textoAtual: row.texto, pedido: input.pedido, ficha }), schema: RevisaoSchema })
  await record(g.usage)
  const parsed = parse(g.object, RevisaoSchema)
  if (!parsed || !parsed.texto.trim()) {
    return { output: 'Não consegui aplicar a revisão agora — tenta de novo em instantes?', patches: [] }
  }

  
  await appendVersao(input.contratoId, { texto: parsed.texto, nota: input.pedido })
  await setStatus(input.contratoId, operatorId, 'em_revisao')
  const finalRow = await mergeMeta(input.contratoId, operatorId, { pendencias: extrairPendencias(parsed.texto) })
  const patches: JuridicoPatch[] = [{ op: 'upsert', entidade: 'contrato', contrato: toContratoView(finalRow) }]

  
  const aprendizado = parsed.aprendizado.trim()
  if (aprendizado) {
    const next = mergeFichaJuridica(await getFicha(operatorId), { aprendizados: [{ texto: aprendizado }] }, { origem: 'revisao', at: now() })
    await upsertFicha(operatorId, next)
    patches.push({ op: 'upsert', entidade: 'ficha', ficha: next })
  }

  const output = `${parsed.nota} Está na Mesa como revisão.` + (aprendizado ? ` E guardei como postura da casa: ${aprendizado}.` : '')
  return { output, patches }
}
