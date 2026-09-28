




import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import {
  getPecaComVersoes as getPecaImpl,
  appendVersao as appendVersaoImpl,
  setPecaStatus as setPecaStatusImpl,
} from '@/data/pecas'
import {
  getDirecaoArte as getDirecaoImpl,
  upsertDirecaoArte as upsertDirecaoImpl,
  getBrandVoice as getBrandVoiceImpl,
} from '@/data/brandVoice'
import { createArtifact as createArtifactImpl, type CreateArtifactInput, type ArtifactRow } from '@/data/artifacts'
import { toCriativoView } from '@/lib/design/types'
import { renderDirecaoArte, mergeDirecaoArte, type DirecaoArte } from '@/lib/design/direcaoArte'
import { renderSize } from '@/lib/design/formatos'
import { getArquetipoDeCena, clausulaDeTextoDiegetico } from '@/lib/design/arquetipos'
import { removerCaudaAnterior, INSTRUCAO_CRU } from '@/lib/design/promptFundo'
import { promptAnuncioInteiro, alvoDoAnuncio } from '@/lib/design/promptAnuncioInteiro'
import { getSuporte } from '@/lib/design/suportes'
import { lerMarcaDaPeca } from '@/server/design/marca'
import type { comporArteFinal, MarcaNaPeca } from '@/server/design/compositor'
import { renderBrandVoice } from '@/lib/estudio/brandVoice'
import { promptRevisaoCriativo } from './prompts'
import {
  defaultGerarImagem,
  defaultBaixarReferencia,
  defaultUpload,
  renderProvas,
  provaQuality,
  defaultBaixarStorage,
} from './gerarCriativo'
import { getSetting as getSettingImpl, setSetting as setSettingImpl } from '@/data/settings'
import type { EstudioPatch } from '@/lib/estudio/types'
import { avisoDeFalhaParcial, textoDaFalhaDaImagem } from '@/lib/design/falhaDaImagem'
import { conceitosQueMudam, AVISO_REVISAO_SEM_MUDANCA } from '@/lib/design/revisaoMudouAlgo'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


const N_CONCEITOS = clampConceitosRevisao(process.env.DESIGN_N_CONCEITOS_REVISAO)
const CALMA_INEXISTENTE = 'Não achei esse criativo.'

function clampConceitosRevisao(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 && n <= 4 ? Math.floor(n) : 2
}

interface GenUsage { inputTokens?: number; outputTokens?: number }


const RevisaoSchema = z.object({
  conceitos: z.array(z.object({
    conceito: z.string(), framework: z.string(), template: z.string(), headline: z.string(),
    subheadline: z.string(), cta: z.string(), selo: z.string(), promptFundo: z.string(),
    
    arquetipo: z.string(),
    
    
    suporte: z.string(),
  })),
  escolhida: z.number(),
  porque: z.string(),
  aprendizado: z.string(),
})

export interface RevisarCriativoInput { pecaId: string; pedido: string }
export interface RevisarCriativoCtx { operatorId?: string; actingAgentId?: string; conversationId?: string | null; taskId?: string | null }
export interface RevisarCriativoResult { output: string; patches: EstudioPatch[] }

export interface RevisarCriativoDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage }>
  gerarImagem?: typeof defaultGerarImagem
  baixarReferencia?: typeof defaultBaixarReferencia
  upload?: typeof defaultUpload
  createArtifact?: (input: CreateArtifactInput) => Promise<ArtifactRow>
  getPecaComVersoes?: typeof getPecaImpl
  appendVersao?: typeof appendVersaoImpl
  setPecaStatus?: typeof setPecaStatusImpl
  getDirecaoArte?: typeof getDirecaoImpl
  upsertDirecaoArte?: typeof upsertDirecaoImpl
  getBrandVoice?: typeof getBrandVoiceImpl
  recordCost?: typeof recordCostImpl
  getCache?: (key: string) => Promise<string | null>
  setCache?: (key: string, value: string) => Promise<void>
  compor?: typeof comporArteFinal
  baixarFundo?: typeof defaultBaixarStorage
  now?: () => string
}

async function defaultGenerate(
  { prompt, schema }: { prompt: string; schema: z.ZodType<unknown> },
): Promise<{ object: unknown; usage: GenUsage }> {
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

export async function revisarCriativo(
  input: RevisarCriativoInput,
  ctx: RevisarCriativoCtx,
  deps: RevisarCriativoDeps = {},
): Promise<RevisarCriativoResult> {
  
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patches: [] }

  const generate = deps.generate ?? defaultGenerate
  const render = deps.gerarImagem ?? defaultGerarImagem
  const baixar = deps.baixarReferencia ?? defaultBaixarReferencia
  const upload = deps.upload ?? defaultUpload
  const createArtifact = deps.createArtifact ?? createArtifactImpl
  const getPecaComVersoes = deps.getPecaComVersoes ?? getPecaImpl
  const appendVersao = deps.appendVersao ?? appendVersaoImpl
  const setPecaStatus = deps.setPecaStatus ?? setPecaStatusImpl
  const getDirecao = deps.getDirecaoArte ?? getDirecaoImpl
  const upsertDirecao = deps.upsertDirecaoArte ?? upsertDirecaoImpl
  const getBrandVoice = deps.getBrandVoice ?? getBrandVoiceImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const getCache = deps.getCache ?? getSettingImpl
  const setCache = deps.setCache ?? setSettingImpl
  const now = deps.now ?? (() => new Date().toISOString())
  const agentId = ctx.actingAgentId ?? 'designer'

  
  const peca = await getPecaComVersoes(input.pecaId)
  if (!peca) return { output: CALMA_INEXISTENTE, patches: [] }

  
  
  if (peca.operator_id !== ctx.operatorId) return { output: CALMA_INEXISTENTE, patches: [] }

  
  
  
  if (peca.formato === 'carrossel') {
    const { gerarCarrossel } = await import('./gerarCarrossel')
    const r = await gerarCarrossel({ pecaId: input.pecaId, ajuste: input.pedido }, ctx, {
      ...(deps.generate ? { generate: deps.generate } : {}),
      ...(deps.gerarImagem ? { gerarImagem: deps.gerarImagem } : {}),
      ...(deps.baixarReferencia ? { baixarReferencia: deps.baixarReferencia } : {}),
      ...(deps.upload ? { upload: deps.upload } : {}),
      ...(deps.createArtifact ? { createArtifact: deps.createArtifact } : {}),
      ...(deps.getPecaComVersoes ? { getPecaComVersoes: deps.getPecaComVersoes } : {}),
      ...(deps.setPecaStatus ? { setPecaStatus: deps.setPecaStatus } : {}),
      ...(deps.getDirecaoArte ? { getDirecaoArte: deps.getDirecaoArte } : {}),
      ...(deps.getBrandVoice ? { getBrandVoice: deps.getBrandVoice } : {}),
      ...(deps.appendVersao ? { appendVersao: deps.appendVersao } : {}),
      ...(deps.recordCost ? { recordCost: deps.recordCost } : {}),
      ...(deps.getCache ? { getCache: deps.getCache } : {}),
      ...(deps.setCache ? { setCache: deps.setCache } : {}),
    })
    return { output: r.output, patches: r.patch ? [r.patch] : [] }
  }

  
  if (!peca.versoes.length) return { output: 'Esse criativo ainda não tem versões para revisar.', patches: [] }

  
  const ultimaVersao = peca.versoes[peca.versoes.length - 1]
  const view = toCriativoView(peca, ultimaVersao)

  
  const nVar = view.variacoes.length
  const idxBase = (view.veredito.escolhida !== undefined && view.veredito.escolhida >= 0 && view.veredito.escolhida < nVar)
    ? view.veredito.escolhida : 0
  const variacaoBase = view.variacoes[idxBase]
  const promptAtual = variacaoBase?.promptImagem ?? ''
  
  
  
  
  const size = renderSize(peca.formato)

  
  const [direcaoAtual, voice] = await Promise.all([
    getDirecao(ctx.operatorId, peca.brand_id),
    getBrandVoice(ctx.operatorId, peca.brand_id),
  ])
  const direcaoRender = renderDirecaoArte(direcaoAtual)
  const dnaVerbal = renderBrandVoice(voice)

  
  
  
  const temReferenciaBrief = typeof peca.brief?.referenciaId === 'string' && !!peca.brief.referenciaId

  const { object, usage } = await generate({
    prompt: promptRevisaoCriativo({
      direcaoRender, dnaVerbal, pedido: input.pedido, promptAtual, nConceitos: N_CONCEITOS,
      temReferencia: temReferenciaBrief, usarRosto: peca.brief?.usarRosto === true,
      formato: peca.formato,
      textoAtual: {
        ...(variacaoBase?.documento?.template ? { template: variacaoBase.documento.template } : {}),
        ...(variacaoBase?.headline ? { headline: variacaoBase.headline } : {}),
        ...(variacaoBase?.subheadline ? { subheadline: variacaoBase.subheadline } : {}),
        ...(variacaoBase?.cta ? { cta: variacaoBase.cta } : {}),
        ...(variacaoBase?.documento?.blocos.selo ? { selo: variacaoBase.documento.blocos.selo } : {}),
      },
    }),
    schema: RevisaoSchema,
  })
  try {
    await recordCost({
      kind: 'chat', model: MODEL,
      promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0,
      agent: agentId, tool: 'revisarCriativo',
    })
  } catch {  }

  
  const revisao = parse(object, RevisaoSchema)
  if (!revisao || !revisao.conceitos.length) {
    return { output: 'Não consegui montar a revisão agora — tenta de novo?', patches: [] }
  }

  
  let referencia: Buffer | undefined
  let avisoRef = ''
  const referenciaId = typeof peca.brief?.referenciaId === 'string' ? peca.brief.referenciaId : undefined
  if (referenciaId) {
    const bytes = await baixar(referenciaId)
    if (bytes) {
      referencia = bytes
    } else {
      avisoRef = ' (a foto de referência original não está mais disponível — revisei sem ela)'
    }
  }

  
  
  
  
  
  
  
  
  
  
  
  
  const brutos = revisao.conceitos.slice(0, N_CONCEITOS)
  const marcaDaPeca: MarcaNaPeca = await lerMarcaDaPeca(
    { operatorId: ctx.operatorId, brandId: peca.brand_id },
    { getDirecaoArte: getDirecao, baixar },
  ).catch(() => ({}))
  const nomeDaMarca = marcaDaPeca.nome?.trim() || undefined
  const alvoDoFormato = alvoDoAnuncio(peca.formato)
  const conceitos = brutos.map((c) => {
    const arq = getArquetipoDeCena(c.arquetipo)
    const cenaBase = removerCaudaAnterior(c.promptFundo)
    const cena = arq
      ? [cenaBase, clausulaDeTextoDiegetico(arq), ...(arq.polimento === 'cru' ? [INSTRUCAO_CRU] : [])].join(' ').trim()
      : cenaBase
    return {
      conceito: c.conceito,
      promptImagem: promptAnuncioInteiro({
        cena,
        ...(arq ? { camera: arq.camera } : {}),
        ...(c.headline ? { headline: c.headline } : {}),
        ...(c.subheadline ? { subheadline: c.subheadline } : {}),
        ...(c.cta ? { cta: c.cta } : {}),
        alvo: alvoDoFormato,
        ...(arq?.polimento === 'cru' ? { cru: true } : {}),
        ...(nomeDaMarca ? { marca: nomeDaMarca } : {}),
        ...(getSuporte(c.suporte) ? { suporte: getSuporte(c.suporte)! } : {}),
      }),
      framework: c.framework,
      headline: c.headline,
      subheadline: c.subheadline,
      cta: c.cta,
      ...(arq ? { arquetipo: arq.slug } : {}),
    }
  })

  
  
  
  
  
  const conceitosNovos = conceitosQueMudam(conceitos, promptAtual)
  if (!conceitosNovos.length) {
    return { output: AVISO_REVISAO_SEM_MUDANCA, patches: [] }
  }

  const { variacoes, falhas, motivo, semComposicao } = await renderProvas({
    conceitos: conceitosNovos,
    size, quality: provaQuality, referencia,
    formato: peca.formato,
    conversationId: ctx.conversationId, taskId: ctx.taskId, agentId, tituloBase: peca.titulo, toolName: 'revisarCriativo',
    render, upload, createArtifact, recordCost, compor: deps.compor, baixarFundo: deps.baixarFundo, getCache, setCache,
  })

  
  if (!variacoes.length) {
    return { output: textoDaFalhaDaImagem(motivo, 'as revisões'), patches: [] }
  }

  
  const escolhidaOriginal = revisao.conceitos[revisao.escolhida]?.conceito
  let escolhida = variacoes.findIndex((v) => v.conceito === escolhidaOriginal)
  if (escolhida < 0) escolhida = 0
  const veredito = { escolhida, porque: revisao.porque }

  
  const versaoNova = await appendVersao(peca.id, {
    variacoes: variacoes as never,
    veredito: veredito as never,
    critica: {} as never,
    origemRevisao: input.pedido,
  })
  await setPecaStatus(peca.id, ctx.operatorId, 'revisao')

  
  const pecaAtualizada = { ...peca, status: 'revisao' as const }
  const criativo = toCriativoView(pecaAtualizada, versaoNova)
  const patches: EstudioPatch[] = [{ op: 'upsert', entidade: 'criativo', criativo }]

  
  const nProvas = variacoes.length
  const avisoProvas = falhas > 0 ? ` (${falhas} prova(s) falharam — ${nProvas} renderizadas)${avisoDeFalhaParcial(motivo)}` : ''
  let output = `Revisei "${peca.titulo}" com ${nProvas} nova${nProvas !== 1 ? 's' : ''} prova${nProvas !== 1 ? 's' : ''} aplicando o pedido.${avisoProvas}${avisoRef}`

  
  const textoAprendido = revisao.aprendizado.trim()
  if (textoAprendido) {
    const direcaoNext = mergeDirecaoArte(
      direcaoAtual as DirecaoArte,
      { aprendizados: [{ texto: textoAprendido }] },
      { origem: 'revisao', at: now() },
    )
    await upsertDirecao(ctx.operatorId, peca.brand_id, direcaoNext)
    patches.push({ op: 'upsert', entidade: 'direcao', direcao: direcaoNext })
    output += `\n✓ Aprendi: ${textoAprendido}`
  }

  return { output, patches }
}
