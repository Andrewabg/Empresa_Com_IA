
import { z } from 'zod'
import { generateText, generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost } from '@/data/cost'
import type { TaskRow } from '@/data/tasks'
import { updateStep, type PlanStepRow } from '@/data/plans'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


function marcador(status: PlanStepRow['status']): string {
  if (status === 'done') return '[ok]'
  if (status === 'failed') return '[falhou]'
  return '[pulado]' 
}


function terminais(steps: PlanStepRow[]): PlanStepRow[] {
  return steps
    .filter((s) => s.status === 'done' || s.status === 'failed' || s.status === 'skipped')
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
}


function corpoDoPasso(s: PlanStepRow): string {
  return (
    s.result?.trim() ||
    (s.status === 'done'
      ? '(concluído sem resultado textual)'
      : s.status === 'failed'
        ? '(falhou sem detalhe)'
        : '(pulado: dependência não cumprida)')
  )
}


export function montarPromptSintese(rootTask: TaskRow, steps: PlanStepRow[]): string {
  const linhas = terminais(steps).map(
    (s) => `${marcador(s.status)} [${s.role}] ${s.sub_objective}\n${corpoDoPasso(s)}`,
  )
  return [
    'Você é o Chefe de Gabinete (COO) desta empresa. Um objetivo do operador foi',
    'decomposto num plano e seus passos foram executados por especialistas. Sintetize',
    'um ENTREGÁVEL final coerente, em português do Brasil, integrando o que cada passo',
    'entregou — um texto único e útil, não uma lista solta.',
    '',
    `OBJETIVO: ${rootTask.objective}`,
    '',
    'RESULTADOS DOS PASSOS (em ordem; [ok]=concluído, [falhou]=falhou, [pulado]=não executado):',
    ...linhas,
    '',
    'REGRAS:',
    '- Seja HONESTO sobre passos que falharam ou foram pulados — NUNCA finja que deram certo.',
    '- Diga claramente o que ficou pendente (e por quê, se o resultado indicar).',
    '- Integre os resultados; foque no que o operador precisa saber e nos próximos passos.',
    '- Objetivo e direto, sem enrolação nem markdown decorativo.',
  ].join('\n')
}


export function sinteseDeterministica(rootTask: TaskRow, steps: PlanStepRow[]): string {
  const linhas = terminais(steps).map(
    (s) => `${marcador(s.status)} [${s.role}] ${s.sub_objective}\n${corpoDoPasso(s)}`,
  )
  return [`Síntese do objetivo: ${rootTask.objective}`, '', ...linhas].join('\n')
}

interface GenUsage {
  inputTokens?: number
  outputTokens?: number
}

export interface AggregateDeps {
  
  generate: (prompt: string) => Promise<{ text: string; usage: GenUsage }>
  recordCost: typeof recordCost
}


async function openaiFromVault() {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  return createOpenAI({ apiKey })
}

async function defaultAggregateGenerate(prompt: string): Promise<{ text: string; usage: GenUsage }> {
  const openai = await openaiFromVault()
  const { text, usage } = await generateText({ model: openai(MODEL), prompt })
  return { text, usage }
}


export async function aggregate(
  rootTask: TaskRow,
  steps: PlanStepRow[],
  deps?: Partial<AggregateDeps>,
): Promise<string> {
  const term = terminais(steps)
  const houveSucesso = term.some((s) => s.status === 'done')
  
  
  if (!houveSucesso) return sinteseDeterministica(rootTask, term)

  const generate = deps?.generate ?? defaultAggregateGenerate
  const record = deps?.recordCost ?? recordCost

  const prompt = montarPromptSintese(rootTask, term)
  const { text, usage } = await generate(prompt)
  await record({
    kind: 'chat',
    model: MODEL,
    promptTokens: usage.inputTokens ?? 0,
    completionTokens: usage.outputTokens ?? 0,
    agent: 'coo',
    task_id: rootTask.id,
  })
  return text.trim() || sinteseDeterministica(rootTask, term)
}




const ReplanDecisaoSchema = z.object({
  decisoes: z.array(
    z.object({
      ordinal: z.number(),
      retry: z.boolean(),
      novo_sub_objetivo: z.string(), 
    }),
  ),
})

export interface ReplanDeps {
  
  generate: (prompt: string) => Promise<{ object: unknown; usage: GenUsage }>
  updateStep: typeof updateStep
  recordCost: typeof recordCost
}


export function montarPromptReplan(rootTask: TaskRow, falhos: PlanStepRow[]): string {
  const linhas = falhos.map(
    (s) => `- ordinal ${s.ordinal} [${s.role}] ${s.sub_objective}\n  resultado: ${corpoDoPasso(s)}`,
  )
  return [
    'Você é o Chefe de Gabinete (COO) desta empresa. Alguns passos do plano FALHARAM.',
    'Decida, para CADA passo falho, se vale a pena re-tentar UMA vez (retry=true) ou',
    'desistir dele (retry=false). Seja CONSERVADOR: só re-tente se houver chance real',
    'de sucesso (ex.: falha transitória, sub-objetivo ambíguo que dá pra esclarecer).',
    'Se o sub-objetivo precisar de um ajuste para dar certo, devolva "novo_sub_objetivo"',
    '(senão deixe vazio para manter o atual). NÃO adicione passos novos.',
    '',
    `OBJETIVO: ${rootTask.objective}`,
    '',
    'PASSOS FALHOS:',
    ...linhas,
    '',
    'Devolva uma decisão por passo falho (ordinal, retry, novo_sub_objetivo).',
  ].join('\n')
}

async function defaultReplanGenerate(prompt: string): Promise<{ object: unknown; usage: GenUsage }> {
  const openai = await openaiFromVault()
  const { object, usage } = await generateObject({ model: openai(MODEL), schema: ReplanDecisaoSchema, prompt })
  return { object, usage }
}


export async function replan(
  rootTask: TaskRow,
  steps: PlanStepRow[],
  deps?: Partial<ReplanDeps>,
): Promise<boolean> {
  const falhos = steps.filter((s) => s.status === 'failed')
  if (falhos.length === 0) return false 

  const generate = deps?.generate ?? defaultReplanGenerate
  const upd = deps?.updateStep ?? updateStep
  const record = deps?.recordCost ?? recordCost

  const prompt = montarPromptReplan(rootTask, falhos)
  const { object, usage } = await generate(prompt)
  await record({
    kind: 'chat',
    model: MODEL,
    promptTokens: usage.inputTokens ?? 0,
    completionTokens: usage.outputTokens ?? 0,
    agent: 'coo',
    task_id: rootTask.id,
  })

  const parsed = ReplanDecisaoSchema.parse(object)
  let retentou = false
  for (const dec of parsed.decisoes) {
    if (!dec.retry) continue
    const passo = falhos.find((s) => s.ordinal === dec.ordinal)
    if (!passo) continue
    const novo = dec.novo_sub_objetivo.trim()
    await upd(passo.id, {
      status: 'pending',
      sub_objective: novo || passo.sub_objective,
      child_task_id: null,
    })
    retentou = true
  }
  return retentou
}
