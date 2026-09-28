

import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getFichaJuridica as getFichaImpl, upsertFichaJuridica as upsertFichaImpl } from '@/data/fichaJuridica'
import { mergeFichaJuridica } from '@/lib/juridico/ficha'
import type { JuridicoPatch } from '@/lib/juridico/types'
import { promptAnotacaoFicha } from './prompts'
import { FichaPatchSchema, toFichaPatch } from './fichaSchema'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
interface GenUsage { inputTokens?: number; outputTokens?: number }

export interface AtualizarFichaInput { anotacao: string }
export interface AtualizarFichaCtx { operatorId?: string; actingAgentId?: string }
export interface AtualizarFichaDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage }>
  getFicha?: typeof getFichaImpl
  upsertFicha?: typeof upsertFichaImpl
  recordCost?: typeof recordCostImpl
  now?: () => string
}
export interface AtualizarFichaResult { output: string; patch: JuridicoPatch | null }

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

export async function atualizarFichaJuridica(
  input: AtualizarFichaInput, ctx: AtualizarFichaCtx, deps: AtualizarFichaDeps = {},
): Promise<AtualizarFichaResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const generate = deps.generate ?? defaultGenerate
  const getFicha = deps.getFicha ?? getFichaImpl
  const upsertFicha = deps.upsertFicha ?? upsertFichaImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const now = deps.now ?? (() => new Date().toISOString())
  const agentId = ctx.actingAgentId ?? 'juridico'
  const operatorId = ctx.operatorId

  const g = await generate({ prompt: promptAnotacaoFicha({ anotacao: input.anotacao }), schema: FichaPatchSchema })
  try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: g.usage.inputTokens ?? 0, completionTokens: g.usage.outputTokens ?? 0, agent: agentId, tool: 'atualizarFichaJuridica' }) } catch {  }
  const parsed = parse(g.object, FichaPatchSchema)
  if (!parsed) return { output: 'Não consegui entender a anotação pra Ficha agora — pode repetir?', patch: null }

  const patch = toFichaPatch(parsed)
  const next = mergeFichaJuridica(await getFicha(operatorId), patch, { origem: 'operador', at: now() })
  await upsertFicha(operatorId, next)

  const patchOut: JuridicoPatch = { op: 'upsert', entidade: 'ficha', ficha: next }
  return { output: 'Anotei na Ficha Jurídica.', patch: patchOut }
}
