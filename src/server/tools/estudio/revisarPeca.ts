
import { z } from 'zod'
import { generateText, generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getPecaComVersoes as getPecaImpl, appendVersao as appendVersaoImpl } from '@/data/pecas'
import { atualizarFichaMarca as atualizarFichaImpl } from './atualizarFichaMarca'
import { classificarFallback, montarPatchAprendizado, type DecisaoAprendizado } from '@/lib/estudio/aprendizado'
import { getFormato } from '@/lib/estudio/formatos'
import { montarBlocos, renderBlocos } from '@/lib/estudio/blocos'
import type { Variacao, EstudioPatch, PecaView } from '@/lib/estudio/types'


import { applyDirective as registrarDiretrizImpl } from '../registrarDiretriz'
import { espelharEntregavelDaTarefa } from '../espelharEntregavel'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
interface GenUsage { inputTokens?: number; outputTokens?: number }

const BlocoCruSchema = z.object({
  kind: z.string().describe('headline | subheadline | cta | primario | descricao | legenda | assunto | corpo | slide | beat'),
  rotulo: z.string(),
  texto: z.string(),
})
const VariacoesSchema = z.object({
  variacoes: z.array(z.object({ angulo: z.string(), blocos: z.array(BlocoCruSchema), notas: z.string() })),
})

const VariacoesLegadoSchema = z.object({ variacoes: z.array(z.object({ angulo: z.string(), texto: z.string(), notas: z.string().optional() })) })
const DecisaoSchema = z.object({ escopo: z.enum(['voz_mae', 'dialeto', 'diretriz', 'pontual']), texto: z.string(), canal: z.string().nullable() })

async function defaultGenerate({ prompt }: { prompt: string }): Promise<{ text: string; usage: GenUsage }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { text, usage } = await generateText({ model: openai(MODEL), prompt })
  return { text, usage }
}
function parseJson<T>(text: string, schema: z.ZodType<T>): T | null {
  try { const m = text.match(/\{[\s\S]*\}/); return m ? schema.parse(JSON.parse(m[0])) : null } catch { return null }
}

function parseObj<T>(object: unknown, schema: z.ZodType<T>): T | null {
  const r = schema.safeParse(object)
  return r.success ? r.data : null
}


async function defaultReescrever({ prompt, schema }: { prompt: string; schema: z.ZodType<unknown> }): Promise<{ object: unknown; usage: GenUsage }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema, prompt })
  return { object, usage }
}


export const COPY_REVISAR = {
  naoAchei: 'Não achei essa peça.',
  naoReescreveu: 'Não consegui reescrever a peça agora, então não mexi nela. O texto anterior segue intacto.',
} as const

export interface RevisarPecaInput { pecaId: string; pedido: string }
export interface RevisarPecaCtx { operatorId?: string; actingAgentId?: string; taskId?: string | null; conversationId?: string | null }
export interface RevisarPecaDeps {
  generate?: (a: { prompt: string }) => Promise<{ text: string; usage: GenUsage }>
  reescrever?: (a: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage }>
  getPecaComVersoes?: typeof getPecaImpl
  appendVersao?: typeof appendVersaoImpl
  atualizarFichaMarca?: typeof atualizarFichaImpl
  registrarDiretriz?: (input: { agentId: string; diretriz: string }, deps?: unknown) => Promise<{ ok: boolean; message: string }>
  recordCost?: typeof recordCostImpl
  now?: () => string
  espelhar?: typeof espelharEntregavelDaTarefa
}
export interface RevisarPecaResult { output: string; patch: EstudioPatch | null }

export async function revisarPeca(
  input: RevisarPecaInput, ctx: RevisarPecaCtx, deps: RevisarPecaDeps = {},
): Promise<RevisarPecaResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const generate = deps.generate ?? defaultGenerate
  const getPeca = deps.getPecaComVersoes ?? getPecaImpl
  const appendVersao = deps.appendVersao ?? appendVersaoImpl
  const reescrever = deps.reescrever ?? defaultReescrever
  const atualizarFicha = deps.atualizarFichaMarca ?? atualizarFichaImpl
  const registrarDiretriz = deps.registrarDiretriz ?? ((i, d) => registrarDiretrizImpl(i as never, d as never))
  const recordCost = deps.recordCost ?? recordCostImpl
  const espelhar = deps.espelhar ?? espelharEntregavelDaTarefa
  const now = deps.now ?? (() => new Date().toISOString())
  const agentId = ctx.actingAgentId ?? 'copywriter'

  const peca = await getPeca(input.pecaId)
  if (!peca) return { output: COPY_REVISAR.naoAchei, patch: null }
  const ultima = peca.versoes[peca.versoes.length - 1]
  const formato = getFormato(peca.formato)
  const canal = formato?.canal ?? null

  const record = async (u: GenUsage) => { try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: u.inputTokens ?? 0, completionTokens: u.outputTokens ?? 0, agent: agentId, tool: 'revisarPeca' }) } catch {} }

  
  
  
  
  const anteriores: Variacao[] = ultima?.variacoes ?? []
  let variacoes: Variacao[] = []
  {
    const prompt = `Reescreva as variações abaixo aplicando o pedido do operador. Mantenha o que está bom.\n\nPEDIDO: ${input.pedido}\n\nVARIAÇÕES ATUAIS:\n${JSON.stringify(anteriores)}\n\nDevolva cada variação em BLOCOS: {angulo, blocos: [{kind, rotulo, texto}], notas}. kind é um de: headline, subheadline, cta, primario, descricao, legenda, assunto, corpo, slide, beat.`
    const { object, usage } = await reescrever({ prompt, schema: VariacoesSchema })
    await record(usage)
    const comBlocos = parseObj(object, VariacoesSchema)?.variacoes
    if (comBlocos?.length) {
      variacoes = comBlocos.map((v) => {
        const blocos = montarBlocos(v.blocos, formato?.limites)
        return { angulo: v.angulo, notas: v.notas, blocos, texto: renderBlocos(blocos) }
      }).filter((v) => v.texto.trim().length > 0)
    } else {
      variacoes = (parseObj(object, VariacoesLegadoSchema)?.variacoes ?? [])
        .map((v) => ({ angulo: v.angulo, notas: v.notas, texto: v.texto }))
        .filter((v) => v.texto.trim().length > 0)
    }
  }
  if (!variacoes.length) return { output: COPY_REVISAR.naoReescreveu, patch: null }

  
  let decisao: DecisaoAprendizado
  {
    const prompt = `Classifique o pedido de mudança abaixo quanto ao que ele ensina de DURÁVEL.\n\nPEDIDO: ${input.pedido}\nCANAL DA PEÇA: ${canal ?? 'genérico'}\n\nescopo = 'voz_mae' (regra da marca inteira), 'dialeto' (regra só deste canal), 'diretriz' (preferência pessoal do operador) ou 'pontual' (só desta peça, não durável).\ntexto = a regra normalizada, curta e imperativa (ex.: "Nunca usar emoji em headline").\ncanal = o slug do canal se escopo='dialeto', senão null.\nDevolva JSON { escopo, texto, canal }.`
    const { text, usage } = await generate({ prompt })
    await record(usage)
    decisao = parseJson(text, DecisaoSchema) ?? classificarFallback(input.pedido, canal)
  }

  
  let chip = ''
  const patchAp = montarPatchAprendizado(decisao)
  if (patchAp.brandVoicePatch) {
    await atualizarFicha({ patch: patchAp.brandVoicePatch }, { operatorId: ctx.operatorId }, { origem: 'revisao', now })
    const alvo = decisao.escopo === 'dialeto' ? `dialeto ${decisao.canal}` : 'voz-mãe'
    chip = `✓ Aprendi: ${decisao.texto} → ${alvo}`
  } else if (patchAp.diretriz) {
    await registrarDiretriz({ agentId, diretriz: patchAp.diretriz })
    chip = `✓ Aprendi: ${decisao.texto} → sua preferência`
  }

  
  const nova = await appendVersao(input.pecaId, { variacoes, veredito: ultima?.veredito ?? {}, critica: ultima?.critica ?? {}, origemRevisao: input.pedido })

  
  
  
  
  const escolhidaIdx = typeof nova.veredito?.escolhida === 'number' ? nova.veredito.escolhida : undefined
  const escolhida = escolhidaIdx != null ? variacoes[escolhidaIdx] : undefined
  await espelhar(
    { taskId: ctx.taskId, conversationId: ctx.conversationId, actingAgentId: agentId },
    { kind: 'documento', title: peca.titulo, content: (escolhida ?? variacoes[0])?.texto ?? '' },
  )

  const view: PecaView = {
    id: peca.id, brandId: peca.brand_id, formato: peca.formato, titulo: peca.titulo,
    status: peca.status, origem: peca.origem, position: peca.position,
    versaoAtual: nova.n, variacoes, veredito: nova.veredito, critica: nova.critica,
    
    
    adId: peca.ad_id ?? undefined,
    adPerf: peca.ad_perf ?? undefined,
    aprendido: peca.aprendido_ad_id != null && peca.aprendido_ad_id === peca.ad_id,
  }
  const output = `Pronto, revisei a peça.${chip ? `\n${chip}` : ''}`
  return { output, patch: { op: 'upsert', entidade: 'peca', peca: view } }
}
