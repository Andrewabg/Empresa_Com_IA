

import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getDefaultBrand as getDefaultBrandImpl } from '@/data/brands'
import { getBrandVoice as getBrandVoiceImpl } from '@/data/brandVoice'
import { createPeca as createPecaImpl, appendVersao as appendVersaoImpl } from '@/data/pecas'
import { montarBlocos, renderBlocos, violacoesDosBlocos, falaDoRoteiro } from '@/lib/estudio/blocos'
import { laudoDaCopy, duracaoAlvoDoTexto } from '@/lib/qa/portoes'
import { updateCampanhaPlanoItem as updItemImpl, getCampanha as getCampanhaImpl, setCampanhaStatus as setCampanhaStatusImpl } from '@/data/campanhas'
import { getFormato, ehRoteiro as formatoEhRoteiro, type FormatoSpec } from '@/lib/estudio/formatos'
import { avaliarBrief } from '@/lib/estudio/smartBrief'
import { renderBrandVoice } from '@/lib/estudio/brandVoice'
import { renderRegistroVisual } from '@/lib/design/direcaoArte'
import { getDirecaoArte as getDirecaoArteImpl } from '@/data/brandVoice'
import { proximoStatusCampanha } from '@/lib/estudio/campanha'
import { promptEscrita, promptCritico, GANCHOS_POR_ROTEIRO } from './prompts'
import { generateBackgroundObject } from '../../cost/backgroundLLM'
import { BACKGROUND_MAX_OUTPUT } from '@/lib/llm-tuning'
import { listSwipes as listSwipesImpl, toSwipeView } from '@/data/swipes'
import { renderSwipesParaPrompt, selecionarSwipes } from '@/lib/estudio/selecionarSwipes'
import { consultaCerebroDaPeca } from '@/lib/estudio/consultaCerebro'
import { buscarCerebro } from '../buscarCerebro'
import { espelharEntregavelDaTarefa } from '../espelharEntregavel'
import type { Variacao, Veredito, Critica, EstudioPatch, PecaView, SwipeView } from '@/lib/estudio/types'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


async function defaultLerSwipes(operatorId: string, brandId: string, _formato: string): Promise<SwipeView[]> {
  const rows = await listSwipesImpl(operatorId, brandId)
  return rows.map(toSwipeView)
}


async function defaultLerCerebro(consulta: string): Promise<string> {
  try {
    const notas = await buscarCerebro(consulta, 5)
    return notas.map((n) => `## ${n.título ?? ''}\n${n.trecho}`).join('\n\n').trim()
  } catch (e) { console.warn('[gerarPeca] cérebro (fail-open):', e); return '' }
}


const FORMATO_GENERICO: FormatoSpec = {
  slug: 'generico', nome: 'Peça de copy', canal: 'generico',
  descricao: 'Peça de copy livre.', estrutura: ['gancho', 'corpo', 'CTA'],
  checklist: ['Promessa clara', 'Um CTA', 'Respeita a voz da marca'],
  compliance: ['Sem claim sem prova'], perguntas: [], variacoesSugeridas: 3,
}

interface GenUsage { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number }

export interface GerarPecaInput {
  formato: string
  brief?: Record<string, unknown>
  titulo?: string
}
export interface GerarPecaCtx { operatorId?: string; actingAgentId?: string; campanhaId?: string; planoIndex?: number; origemSolicitante?: string; taskId?: string | null; conversationId?: string | null }
export interface GerarPecaDeps {
  
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage; model?: string }>
  
  
  criticar?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage; model?: string }>
  getDefaultBrand?: typeof getDefaultBrandImpl
  getBrandVoice?: typeof getBrandVoiceImpl
  createPeca?: typeof createPecaImpl
  appendVersao?: typeof appendVersaoImpl
  getDirecaoArte?: typeof getDirecaoArteImpl
  recordCost?: typeof recordCostImpl
  now?: () => string
  lerSwipesRelevantes?: (operatorId: string, brandId: string, formato: string) => Promise<SwipeView[]>
  
  lerCerebro?: (consulta: string) => Promise<string>
  updateCampanhaPlanoItem?: typeof updItemImpl
  getCampanha?: typeof getCampanhaImpl
  setCampanhaStatus?: typeof setCampanhaStatusImpl
  espelhar?: typeof espelharEntregavelDaTarefa
}
export interface GerarPecaResult { output: string; patch: EstudioPatch | null }


const BlocoCruSchema = z.object({
  kind: z.string().describe('headline | subheadline | cta | primario | descricao | legenda | assunto | corpo | slide | beat'),
  rotulo: z.string().describe('o nome que a pessoa lê, PT-BR (ex.: "Headline 2", "Hook (0-3s)")'),
  texto: z.string(),
})
const VariacoesSchema = z.object({
  variacoes: z.array(z.object({
    angulo: z.string(),
    blocos: z.array(BlocoCruSchema).describe('os pedaços da peça, na ordem de leitura'),
    notas: z.string(),
  })),
})



const CenaCruaSchema = z.object({
  fala: z.string().describe('exatamente as palavras ditas em voz alta nesta cena; vazio em cena muda'),
  acao: z.string().describe('o que a câmera mostra e o que acontece em cena'),
  textoNaTela: z.string().describe('o que aparece ESCRITO na tela; vazio se nada aparece'),
  bRoll: z.string().describe('imagem de apoio sugerida; vazio se não houver'),
})
const BlocoDeRoteiroSchema = z.object({
  kind: z.string().describe('beat para cena; headline/cta/corpo para o resto'),
  rotulo: z.string().describe('o nome que a pessoa lê, PT-BR (ex.: "Cena 3", "Gancho")'),
  texto: z.string().describe('vazio nos beats: o texto da cena é derivado dos campos de "cena"'),
  cena: CenaCruaSchema,
})
const VariacoesRoteiroSchema = z.object({
  variacoes: z.array(z.object({
    angulo: z.string(),
    blocos: z.array(BlocoDeRoteiroSchema).describe('as cenas do roteiro, na ordem de exibição'),
    ganchos: z.array(z.string()).describe('aberturas alternativas, uma por entrada diferente'),
    notas: z.string(),
  })),
})



const VariacoesLegadoSchema = z.object({
  variacoes: z.array(z.object({ angulo: z.string(), texto: z.string(), notas: z.string() })),
})


const CriticaSchema = z.object({
  aprovado: z.boolean(), problemas: z.array(z.string()), notas: z.string(),
  escolhida: z.number(), porque: z.string(), teste: z.string(),
})







async function defaultGenerate({ prompt, schema }: { prompt: string; schema: z.ZodType<unknown> }): Promise<{ object: unknown; usage: GenUsage; model: string }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema, prompt })
  return { object, usage, model: MODEL }
}




async function defaultCriticar({ prompt, schema }: { prompt: string; schema: z.ZodType<unknown> }): Promise<{ object: unknown; usage: GenUsage; model: string }> {
  const { object, usage, model } = await generateBackgroundObject({ schema, prompt, maxOutputTokens: BACKGROUND_MAX_OUTPUT })
  return { object, usage, model }
}


function parse<T>(object: unknown, schema: z.ZodType<T>): T | null {
  const r = schema.safeParse(object)
  return r.success ? r.data : null
}

export async function gerarPeca(
  input: GerarPecaInput, ctx: GerarPecaCtx, deps: GerarPecaDeps = {},
): Promise<GerarPecaResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const generate = deps.generate ?? defaultGenerate
  
  
  const criticarLLM = deps.criticar ?? deps.generate ?? defaultCriticar
  const getDefaultBrand = deps.getDefaultBrand ?? getDefaultBrandImpl
  const getBrandVoice = deps.getBrandVoice ?? getBrandVoiceImpl
  const createPeca = deps.createPeca ?? createPecaImpl
  const appendVersao = deps.appendVersao ?? appendVersaoImpl
  const getDirecaoArte = deps.getDirecaoArte ?? getDirecaoArteImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const updateCampanhaPlanoItem = deps.updateCampanhaPlanoItem ?? updItemImpl
  const getCampanha = deps.getCampanha ?? getCampanhaImpl
  const setCampanhaStatus = deps.setCampanhaStatus ?? setCampanhaStatusImpl
  const espelhar = deps.espelhar ?? espelharEntregavelDaTarefa
  const agentId = ctx.actingAgentId ?? 'copywriter'
  const origem = ctx.origemSolicitante ?? agentId
  
  

  const brand = await getDefaultBrand(ctx.operatorId)
  if (!brand) return { output: 'Ainda não conheço a marca. Vamos fazer a entrevista de marca primeiro?', patch: null }
  const voice = await getBrandVoice(ctx.operatorId, brand.id)

  const formato = getFormato(input.formato) ?? FORMATO_GENERICO
  const brief = input.brief ?? {}

  
  const aval = avaliarBrief(formato, brief, voice)
  if (!aval.pronto) {
    return {
      output: `Antes de escrever, preciso saber:\n${aval.perguntas.map((q) => `• ${q}`).join('\n')}`,
      patch: null,
    }
  }

  const vozRender = renderBrandVoice(voice, formato.canal)
  
  
  let registroVisual = ''
  try {
    registroVisual = renderRegistroVisual(await getDirecaoArte(ctx.operatorId, brand.id))
  } catch (e) {
    console.warn('[gerarPeca] leitura da direção de arte falhou (fail-open):', e)
  }
  const briefStr = Object.entries(brief).map(([k, v]) => `${k}: ${String(v)}`).join('\n')
  const nVar = formato.variacoesSugeridas
  
  
  const roteiro = formatoEhRoteiro(formato)
  const esquemaDaEscrita = roteiro ? VariacoesRoteiroSchema : VariacoesSchema

  
  
  
  const lerCerebro = deps.lerCerebro ?? defaultLerCerebro
  let fatosBlock = ''
  try {
    fatosBlock = await lerCerebro(consultaCerebroDaPeca(brief, formato.nome))
  } catch (e) {
    console.warn('[gerarPeca] leitura do Cérebro falhou (fail-open):', e)
  }

  const lerSwipes = deps.lerSwipesRelevantes ?? defaultLerSwipes
  
  let swipesBlock = ''
  try {
    const todos = await lerSwipes(ctx.operatorId, brand.id, formato.slug)
    swipesBlock = renderSwipesParaPrompt(selecionarSwipes(todos, formato.slug, 3, formato.canal))
  } catch (e) {
    console.warn('[gerarPeca] leitura de swipes falhou (fail-open):', e)
  }

  
  
  const record = async (model: string, u: GenUsage) => {
    try { await recordCost({ kind: 'chat', model, promptTokens: u.inputTokens ?? 0, completionTokens: u.outputTokens ?? 0, cachedTokens: u.cachedInputTokens ?? 0, agent: agentId, tool: 'gerarPeca' }) } catch {  }
  }

  
  
  
  const materializar = (crus: unknown): Variacao[] => {
    
    
    if (roteiro) {
      const comCenas = parse(crus, VariacoesRoteiroSchema)?.variacoes
      if (comCenas?.length) {
        return comCenas.map((v) => {
          const blocos = montarBlocos(v.blocos, formato.limites)
          const ganchos = (v.ganchos ?? []).map((g) => g.trim()).filter(Boolean).slice(0, GANCHOS_POR_ROTEIRO)
          return {
            angulo: v.angulo, notas: v.notas, blocos, texto: renderBlocos(blocos),
            ...(ganchos.length ? { ganchos } : {}),
          }
        }).filter((v) => v.texto.trim().length > 0)
      }
    }
    const comBlocos = parse(crus, VariacoesSchema)?.variacoes
    if (comBlocos?.length) {
      return comBlocos.map((v) => {
        const blocos = montarBlocos(v.blocos, formato.limites)
        return { angulo: v.angulo, notas: v.notas, blocos, texto: renderBlocos(blocos) }
      }).filter((v) => v.texto.trim().length > 0)
    }
    
    
    return (parse(crus, VariacoesLegadoSchema)?.variacoes ?? [])
      .map((v) => ({ angulo: v.angulo, notas: v.notas, texto: v.texto }))
      .filter((v) => v.texto.trim().length > 0)
  }

  let variacoes: Variacao[] = []
  {
    const { object, usage, model } = await generate({ prompt: promptEscrita({ formato, vozRender, registroVisual, brief: briefStr, nVariacoes: nVar, swipes: swipesBlock, fatos: fatosBlock }), schema: esquemaDaEscrita })
    await record(model ?? MODEL, usage)
    variacoes = materializar(object)
  }
  if (!variacoes.length) return { output: 'Não consegui gerar as variações agora — tenta de novo?', patch: null }

  
  
  
  let critica: Critica = {}
  let veredito: Veredito = {}
  const criticar = async (vars: Variacao[]) => {
    try {
      const { object, usage, model } = await criticarLLM({
        prompt: promptCritico({ formato, vozRender, variacoesJson: JSON.stringify(vars) }),
        schema: CriticaSchema,
      })
      await record(model ?? MODEL, usage)
      return parse(object, CriticaSchema)
    } catch (e) {
      console.warn('[gerarPeca] crítico falhou (a peça segue sem laudo):', e)
      return null
    }
  }
  {
    let c = await criticar(variacoes)
    if (c && !c.aprovado) {
      const reprompt = promptEscrita({ formato, vozRender, registroVisual, brief: `${briefStr}\n\nCORRIJA estes problemas da versão anterior:\n${c.problemas.map((p) => `- ${p}`).join('\n')}`, nVariacoes: nVar, swipes: swipesBlock, fatos: fatosBlock })
      const { object: o2, usage: u2, model: m2 } = await generate({ prompt: reprompt, schema: esquemaDaEscrita })
      await record(m2 ?? MODEL, u2)
      const v2 = materializar(o2)
      if (v2.length) {
        variacoes = v2
        
        const c2 = await criticar(variacoes)
        if (c2) c = c2
      }
    }
    if (c) {
      critica = { aprovado: c.aprovado, problemas: c.problemas, notas: c.notas }
      veredito = { escolhida: c.escolhida, porque: c.porque, teste: c.teste }
    }
  }

  
  
  
  {
    const estouros = variacoes.flatMap((v, i) =>
      violacoesDosBlocos(v.blocos ?? []).map((x) => `variação ${i + 1} — ${x}`),
    )
    if (estouros.length) {
      critica = { ...critica, problemas: [...(critica.problemas ?? []), ...estouros] }
    }
  }

  
  
  
  
  {
    
    
    const alvo = duracaoAlvoDoTexto(briefStr) ?? formato.duracaoAlvoS ?? null
    const laudos = variacoes.map((v) => laudoDaCopy({
      texto: v.texto,
      ehRoteiro: roteiro,
      duracaoAlvoSegundos: alvo,
      textoFalado: falaDoRoteiro(v.blocos ?? []),
    }))
    const problemas = laudos.flatMap((l, i) => l.problemas.map((x) => `variação ${i + 1} — ${x}`))
    const portoes = laudos.flatMap((l) => l.portoes)
    if (problemas.length) critica = { ...critica, problemas: [...(critica.problemas ?? []), ...problemas] }
    if (portoes.length) critica = { ...critica, portoes }
    
    if (laudos.some((l) => !l.aprovado)) critica = { ...critica, aprovado: false }
  }

  
  const titulo = input.titulo ?? String(brief.titulo ?? `${formato.nome}`)
  
  const peca = await createPeca({ operatorId: ctx.operatorId, brandId: brand.id, agentId, formato: formato.slug, titulo, brief, origem, status: 'rascunho', campanhaId: ctx.campanhaId })
  await appendVersao(peca.id, { variacoes, veredito, critica })

  
  
  if (ctx.campanhaId && typeof ctx.planoIndex === 'number') {
    try {
      await updateCampanhaPlanoItem(ctx.campanhaId, ctx.planoIndex, { peca_id: peca.id, status: 'pronta' })
      const camp = await getCampanha(ctx.campanhaId)
      if (camp && proximoStatusCampanha(camp.plano) === 'concluida') {
        await setCampanhaStatus(ctx.campanhaId, 'concluida')
      }
    } catch (e) {
      console.warn('[gerarPeca] progresso de campanha falhou (não-fatal):', e)
    }
  }

  const view: PecaView = {
    id: peca.id, brandId: brand.id, formato: formato.slug, titulo, status: 'rascunho', origem,
    position: peca.position, versaoAtual: 1, variacoes, veredito, critica,
  }
  const patch: EstudioPatch = { op: 'upsert', entidade: 'peca', peca: view }

  const escolhida = typeof veredito.escolhida === 'number' ? variacoes[veredito.escolhida] : undefined

  
  
  
  await espelhar(
    { taskId: ctx.taskId, conversationId: ctx.conversationId, actingAgentId: agentId },
    { kind: 'documento', title: titulo, content: (escolhida ?? variacoes[0])?.texto ?? '' },
  )

  const output = `Montei a peça "${titulo}" (${formato.nome}) com ${variacoes.length} variações por ângulos diferentes.` +
    (escolhida ? ` Minha escolha: ângulo "${escolhida.angulo}" — ${veredito.porque}. Teste: ${veredito.teste}.` : '') +
    ' Está no Estúdio pra você revisar.'

  return { output, patch }
}
