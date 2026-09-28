

import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getContrato as getContratoImpl, createContrato as createContratoImpl, appendContratoVersao as appendVersaoImpl } from '@/data/contratos'
import { toContratoView, type JuridicoPatch } from '@/lib/juridico/types'
import { promptAnonimizarModelo } from './prompts'
import { espelharModeloNoCerebro } from './espelhoJuridico'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
interface GenUsage { inputTokens?: number; outputTokens?: number }

const ModeloSchema = z.object({ titulo: z.string(), texto: z.string() })

export interface SalvarComoModeloInput { contratoId: string; nome?: string }
export interface SalvarComoModeloCtx { operatorId?: string; actingAgentId?: string }
export interface SalvarComoModeloDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage }>
  getContrato?: typeof getContratoImpl
  createContrato?: typeof createContratoImpl
  appendContratoVersao?: typeof appendVersaoImpl
  espelharModelo?: typeof espelharModeloNoCerebro
  recordCost?: typeof recordCostImpl
}
export interface SalvarComoModeloResult { output: string; patch: JuridicoPatch | null }

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

export async function salvarComoModelo(
  input: SalvarComoModeloInput, ctx: SalvarComoModeloCtx, deps: SalvarComoModeloDeps = {},
): Promise<SalvarComoModeloResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const generate = deps.generate ?? defaultGenerate
  const getContrato = deps.getContrato ?? getContratoImpl
  const createContrato = deps.createContrato ?? createContratoImpl
  const appendVersao = deps.appendContratoVersao ?? appendVersaoImpl
  const espelharModelo = deps.espelharModelo ?? espelharModeloNoCerebro
  const recordCost = deps.recordCost ?? recordCostImpl
  const agentId = ctx.actingAgentId ?? 'juridico'
  const operatorId = ctx.operatorId

  const row = await getContrato(input.contratoId, operatorId)
  if (!row) return { output: 'Não achei esse contrato pra virar modelo.', patch: null }
  if (row.kind === 'analisado') {
    return { output: 'Modelo se faz de um contrato NOSSO, não de um contrato recebido de terceiros.', patch: null }
  }

  const g = await generate({ prompt: promptAnonimizarModelo({ texto: row.texto }), schema: ModeloSchema })
  try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: g.usage.inputTokens ?? 0, completionTokens: g.usage.outputTokens ?? 0, agent: agentId, tool: 'salvarComoModelo' }) } catch {  }
  const parsed = parse(g.object, ModeloSchema)
  if (!parsed || !parsed.texto.trim()) {
    return { output: 'Não consegui montar o modelo agora — tenta de novo em instantes?', patch: null }
  }

  const titulo = input.nome?.trim() || parsed.titulo || `Modelo — ${row.titulo}`
  const novo = await createContrato({ operatorId, agentId, kind: 'modelo', tipo: row.tipo, titulo, status: 'finalizado', meta: { origemContratoId: row.id } })
  await appendVersao(novo.id, { texto: parsed.texto, nota: 'modelo da casa' })

  const view = toContratoView({ ...novo, texto: parsed.texto, versao_atual: 1, meta: { origemContratoId: row.id } })
  try { await espelharModelo(view) } catch (e) { console.warn('[salvarComoModelo] espelho (fail-open):', e) }

  const patch: JuridicoPatch = { op: 'upsert', entidade: 'contrato', contrato: view }
  const output = `Guardei '${titulo}' como modelo da casa — vou reusar da próxima vez.`
  return { output, patch }
}
