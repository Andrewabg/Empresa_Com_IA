
import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getFichaJuridica as getFichaImpl } from '@/data/fichaJuridica'
import { createContrato as createContratoImpl, appendContratoVersao as appendVersaoImpl } from '@/data/contratos'
import { enqueueMemoryJob as enqueueImpl } from '@/data/memoryJobs'
import { blocoDaFichaJuridica } from '@/lib/juridico/ficha'
import { montarTextoContrato, extrairPendencias, consolidarPendencias, type Minuta } from '@/lib/juridico/minuta'
import { getModeloFabrica } from '@/lib/juridico/modelosFabrica'
import { toContratoView, type JuridicoPatch } from '@/lib/juridico/types'
import { promptRedator, promptCriticoContrato } from './prompts'
import { lerModeloBase as lerModeloBaseImpl } from './lerModeloBase'
import { lerNotasEmpresa as lerNotasImpl } from './lerNotasEmpresa'
import { espelharEntregavelDaTarefa } from '../espelharEntregavel'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
interface GenUsage { inputTokens?: number; outputTokens?: number }



const MinutaSchema = z.object({
  titulo: z.string(),
  preambulo: z.string(),
  partes: z.array(z.object({ papel: z.string(), nome: z.string(), qualificacao: z.string() })),
  clausulas: z.array(z.object({ numero: z.string(), titulo: z.string(), texto: z.string() })),
  fecho: z.string(),
  pendencias: z.array(z.string()),
})
const CriticaSchema = z.object({ aprovado: z.boolean(), problemas: z.array(z.string()), notas: z.string() })

export interface GerarContratoInput { tipo: string; briefing: string; titulo?: string }
export interface GerarContratoCtx { operatorId?: string; actingAgentId?: string; taskId?: string | null; conversationId?: string | null }
export interface GerarContratoDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage }>
  getFicha?: typeof getFichaImpl
  lerModeloBase?: typeof lerModeloBaseImpl
  lerNotasEmpresa?: typeof lerNotasImpl
  createContrato?: typeof createContratoImpl
  appendContratoVersao?: typeof appendVersaoImpl
  recordCost?: typeof recordCostImpl
  enqueueMemoryJob?: typeof enqueueImpl
  espelhar?: typeof espelharEntregavelDaTarefa
}
export interface GerarContratoResult { output: string; patch: JuridicoPatch | null }

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

export async function gerarContrato(
  input: GerarContratoInput, ctx: GerarContratoCtx, deps: GerarContratoDeps = {},
): Promise<GerarContratoResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const generate = deps.generate ?? defaultGenerate
  const getFicha = deps.getFicha ?? getFichaImpl
  const lerModelo = deps.lerModeloBase ?? lerModeloBaseImpl
  const lerNotas = deps.lerNotasEmpresa ?? lerNotasImpl
  const createContrato = deps.createContrato ?? createContratoImpl
  const appendVersao = deps.appendContratoVersao ?? appendVersaoImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const enqueue = deps.enqueueMemoryJob ?? enqueueImpl
  const espelhar = deps.espelhar ?? espelharEntregavelDaTarefa
  const agentId = ctx.actingAgentId ?? 'juridico'
  const operatorId = ctx.operatorId

  const record = async (u: GenUsage) => {
    try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: u.inputTokens ?? 0, completionTokens: u.outputTokens ?? 0, agent: agentId, tool: 'gerarContrato' }) } catch {  }
  }

  const ficha = blocoDaFichaJuridica(await getFicha(operatorId))
  const tipo = (input.tipo ?? '').trim().toLowerCase() || 'outro'
  const nomeTipo = getModeloFabrica(tipo)?.nome ?? input.tipo ?? 'contrato'
  const { texto: modeloBase } = await lerModelo(operatorId, tipo)
  let cerebro = ''
  try { cerebro = await lerNotas(operatorId) } catch (e) { console.warn('[gerarContrato] cérebro (fail-open):', e) }

  
  const p1 = promptRedator({ nomeTipo, tipo, modeloBase, ficha, cerebro, briefing: input.briefing })
  const g1 = await generate({ prompt: p1, schema: MinutaSchema })
  await record(g1.usage)
  let minuta = parse(g1.object, MinutaSchema)
  if (!minuta || !minuta.clausulas.length) {
    return { output: 'Não consegui redigir a minuta agora — tenta de novo em instantes?', patch: null }
  }

  
  const textoV1 = montarTextoContrato(minuta as Minuta)
  const g2 = await generate({ prompt: promptCriticoContrato({ nomeTipo, tipo, minutaTexto: textoV1, ficha }), schema: CriticaSchema })
  await record(g2.usage)
  const critica = parse(g2.object, CriticaSchema)
  if (critica && !critica.aprovado && critica.problemas.length) {
    const reprompt = `${p1}\n\nCORRIJA estes problemas apontados pelo sócio revisor:\n${critica.problemas.map((p) => `- ${p}`).join('\n')}`
    const g3 = await generate({ prompt: reprompt, schema: MinutaSchema })
    await record(g3.usage)
    const m2 = parse(g3.object, MinutaSchema)
    if (m2 && m2.clausulas.length) minuta = m2
  }

  
  const texto = montarTextoContrato(minuta as Minuta)
  
  const pendencias = consolidarPendencias(minuta.pendencias, extrairPendencias(texto))
  const titulo = minuta.titulo || input.titulo || nomeTipo
  const row = await createContrato({ operatorId, agentId, kind: 'gerado', tipo, titulo, partes: minuta.partes, status: 'rascunho', meta: { pendencias } })
  await appendVersao(row.id, { texto, nota: 'minuta inicial (redator + crítico interno)' })

  
  
  
  
  await espelhar(
    { taskId: ctx.taskId, conversationId: ctx.conversationId, actingAgentId: agentId },
    { kind: 'documento', title: titulo, content: texto },
  )

  try { await enqueue('reflect_juridico', operatorId) } catch (e) { console.warn('[gerarContrato] enqueue (fail-open):', e) }

  const view = toContratoView({ ...row, texto, versao_atual: 1, meta: { pendencias } })
  const patch: JuridicoPatch = { op: 'upsert', entidade: 'contrato', contrato: view }
  const output = `Redigi a minuta "${titulo}" (${nomeTipo}) — passou pelo crítico interno e está na Mesa.` +
    (pendencias.length
      ? ` Antes de finalizar, preciso que você me responda: ${pendencias.map((p) => `qual ${p}?`).join(' ')}`
      : ' Revise no palco e me diga o que ajustar.')
  return { output, patch }
}
