





import { z } from 'zod'
import { generateObject, generateImage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createHash } from 'node:crypto'
import { getSecret, SECRET_KEYS } from '../../secrets'
import { NotConfiguredError } from '../../brain/runtime'
import { serverDb } from '../../supabase'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getDirecaoArte as getDirecaoImpl, getBrandVoice as getBrandVoiceImpl } from '@/data/brandVoice'
import { getBrand as getBrandImpl } from '@/data/brands'
import { getPecaComVersoes as getPecaImpl, setPecaStatus as setPecaStatusImpl, appendVersao as appendVersaoImpl } from '@/data/pecas'
import { createArtifact as createArtifactImpl, getArtifact as getArtifactImpl, type CreateArtifactInput, type ArtifactRow } from '@/data/artifacts'
import { getFormatoDesign, renderSize } from '@/lib/design/formatos'
import { renderDirecaoArte } from '@/lib/design/direcaoArte'
import { renderBrandVoice } from '@/lib/estudio/brandVoice'
import { briefCoverage } from '@/lib/design/briefCoverage'
import { chaveImagem, settingKeyImagem } from '@/lib/design/imagemDedup'
import { avisoDeFalhaParcial, classificarFalhaDaImagem, motivoDominante, textoDaFalhaDaImagem, type MotivoFalhaImagem } from '@/lib/design/falhaDaImagem'
import { getSetting as getSettingImpl, setSetting as setSettingImpl } from '@/data/settings'
import { promptDiretorArte } from './prompts'
import { criticarProvas as criticarProvasImpl } from './criticarProvas'
import { escolherMelhorProva, resumirCriticaVisual } from '@/lib/design/criticaVisual'
import { TETO_DE_RODADAS } from '@/lib/qa/decisao'
import type { EstudioPatch } from '@/lib/estudio/types'
import { toCriativoView, type VariacaoCriativo, type BriefEstruturado, type DocumentoDeArte } from '@/lib/design/types'
import { resolverCoresDaPeca } from '@/lib/design/coresDaPeca'
import { distribuirTemplates } from '@/lib/design/templates'
import { comporArteFinal, type MarcaNaPeca } from '@/server/design/compositor'
import { cenaEsperada, getArquetipoDeCena, clausulaDeTextoDiegetico } from '@/lib/design/arquetipos'
import { promptAnuncioInteiro, alvoDoAnuncio } from '@/lib/design/promptAnuncioInteiro'
import { getSuporte } from '@/lib/design/suportes'
import { removerCaudaAnterior, INSTRUCAO_CRU } from '@/lib/design/promptFundo'
import { arquetiposRecentes } from '@/lib/design/diversidade'
import { listPecasComUltimaVersao as listPecasImpl } from '@/data/pecas'
import { fecharPromptFundo } from '@/lib/design/promptFundo'
import { lerMarcaDaPeca } from '@/server/design/marca'
import { encurtarTitulo, encurtarComSufixo } from '@/lib/encurtarTitulo'
import { sufixoDoConceito } from '@/lib/design/legendaDaArte'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
const IMAGE_MODEL = 'gpt-image-2'



const N_CONCEITOS = clampConceitos(process.env.DESIGN_N_CONCEITOS)
const PROVA_QUALITY = coerceQuality(process.env.DESIGN_PROVA_QUALITY, 'low')

function clampConceitos(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 && n <= 4 ? Math.floor(n) : 3
}
function coerceQuality(raw: string | undefined, fallback: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
  return raw === 'low' || raw === 'medium' || raw === 'high' ? raw : fallback
}


export const provaQuality: 'low' | 'medium' | 'high' = PROVA_QUALITY






export const PlanoDeArteSchema = z.object({
  titulo: z.string(),
  conceitos: z.array(z.object({
    conceito: z.string(),
    framework: z.string(),
    
    
    
    arquetipo: z.string(),
    suporte: z.string(),
    template: z.string(),
    headline: z.string(),
    subheadline: z.string(),
    cta: z.string(),
    selo: z.string(),
    promptFundo: z.string(),
  })),
  escolhida: z.number(),
  porque: z.string(),
})

interface GenUsage { inputTokens?: number; outputTokens?: number }

export interface GenImagemUsage { inputTokens?: number; outputTokens?: number }

export interface GerarCriativoInput { pecaId: string }
export interface GerarCriativoCtx { operatorId?: string; actingAgentId?: string; conversationId?: string | null; taskId?: string | null }
export interface GerarCriativoDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage }>
  gerarImagem?: (args: { prompt: string; size: string; quality: 'low' | 'medium' | 'high'; referencia?: Buffer }) => Promise<{ base64: string; usage: GenImagemUsage }>
  baixarReferencia?: (artifactId: string) => Promise<Buffer | null>
  upload?: (path: string, base64: string) => Promise<string>
  createArtifact?: (input: CreateArtifactInput) => Promise<ArtifactRow>
  getPecaComVersoes?: typeof getPecaImpl
  
  listPecas?: typeof listPecasImpl
  setPecaStatus?: typeof setPecaStatusImpl
  getDirecaoArte?: typeof getDirecaoImpl
  getBrandVoice?: typeof getBrandVoiceImpl
  
  getBrand?: typeof getBrandImpl
  appendVersao?: typeof appendVersaoImpl
  recordCost?: typeof recordCostImpl
  getCache?: (key: string) => Promise<string | null>
  setCache?: (key: string, value: string) => Promise<void>
  
  criticar?: typeof criticarProvasImpl
  compor?: typeof comporArteFinal
  baixarFundo?: typeof defaultBaixarStorage
}

export const COPY_GERAR = {
  refeitas: (n: number) =>
    n === 1
      ? 'Uma prova saiu com defeito e eu refiz ela antes de te mostrar.'
      : `${n} provas saíram com defeito e eu refiz elas antes de te mostrar.`,
  aindaComDefeito: (n: number) =>
    n === 1
      ? 'Uma prova continuou com defeito depois de eu refazer, e eu parei por aí em vez de ficar gastando.'
      : `${n} provas continuaram com defeito depois de eu refazer, e eu parei por aí em vez de ficar gastando.`,
  semComposicao: (n: number) =>
    n === 1
      ? 'Uma das provas saiu só com a cena, sem o texto por cima, porque a montagem falhou nela.'
      : `${n} provas saíram só com a cena, sem o texto por cima, porque a montagem falhou nelas.`,
} as const

export interface GerarCriativoResult { output: string; patch: EstudioPatch | null }

export async function defaultGenerate({ prompt, schema }: { prompt: string; schema: z.ZodType<unknown> }): Promise<{ object: unknown; usage: GenUsage }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema, prompt })
  return { object, usage }
}


export async function defaultGerarImagem(args: { prompt: string; size: string; quality: 'low' | 'medium' | 'high'; referencia?: Buffer }): Promise<{ base64: string; usage: GenImagemUsage }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { image, usage } = await generateImage({
    model: openai.image(IMAGE_MODEL),
    prompt: args.referencia ? { text: args.prompt, images: [args.referencia] } : args.prompt,
    size: args.size as `${number}x${number}`,
    providerOptions: { openai: { quality: args.quality } },
  })
  return { base64: image.base64, usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } }
}

export async function defaultBaixarReferencia(artifactId: string): Promise<Buffer | null> {
  const art = await getArtifactImpl(artifactId)
  if (!art?.storage_ref) return null
  const { data, error } = await serverDb().storage.from('artifacts').download(art.storage_ref)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}


export async function defaultBaixarStorage(ref: string): Promise<Buffer | null> {
  const { data, error } = await serverDb().storage.from('artifacts').download(ref)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

export async function defaultUpload(path: string, base64: string): Promise<string> {
  const bytes = Buffer.from(base64, 'base64')
  const { error } = await serverDb().storage.from('artifacts').upload(path, bytes, { contentType: 'image/png', upsert: true })
  if (error) throw new Error(`upload criativo: ${error.message}`)
  return path
}

function parse<T>(object: unknown, schema: z.ZodType<T>): T | null {
  const r = schema.safeParse(object)
  return r.success ? r.data : null
}



export interface ConceitoParaRender {
  conceito: string; promptImagem: string
  framework?: string; headline?: string; subheadline?: string; cta?: string
  
  arquetipo?: string
  
  documento?: DocumentoDeArte
}

export async function renderProvas(args: {
  conceitos: ConceitoParaRender[]
  size: string; quality: 'low' | 'medium' | 'high'
  referencia?: Buffer
  formato: string
  marca?: MarcaNaPeca
  conversationId: string | null | undefined
  taskId?: string | null
  agentId: string; tituloBase: string; toolName: string
  render: NonNullable<GerarCriativoDeps['gerarImagem']>
  upload: NonNullable<GerarCriativoDeps['upload']>
  createArtifact: NonNullable<GerarCriativoDeps['createArtifact']>
  recordCost: typeof recordCostImpl
  compor?: typeof comporArteFinal
  baixarFundo?: typeof defaultBaixarStorage
  getCache?: (key: string) => Promise<string | null>
  setCache?: (key: string, value: string) => Promise<void>
}): Promise<{ variacoes: VariacaoCriativo[]; falhas: number; motivo: MotivoFalhaImagem | null; reusados: number; semComposicao: number }> {
  const { conceitos, size, quality, referencia, formato, conversationId, taskId, agentId, tituloBase, toolName, render, upload, createArtifact, recordCost, getCache, setCache } = args
  const compor = args.compor ?? comporArteFinal
  const baixarFundo = args.baixarFundo ?? defaultBaixarStorage
  let reusados = 0
  let semComposicao = 0

  
  const comporSobre = async (
    c: ConceitoParaRender, fundo: Buffer, fundoRef: string,
  ): Promise<{ ref: string; documento?: DocumentoDeArte }> => {
    if (!c.documento) return { ref: fundoRef }
    try {
      const arte = await compor({ fundo, formato, marca: args.marca, documento: c.documento })
      const hash = createHash('sha256').update(arte.png).digest('hex').slice(0, 16)
      const ref = await upload(`criativos/${conversationId ?? 'sem-conversa'}/${hash}.png`, arte.png.toString('base64'))
      return { ref, documento: { ...c.documento, fundoRef } }
    } catch {
      
      
      semComposicao++
      return { ref: fundoRef }
    }
  }
  const settled = await Promise.allSettled(conceitos.map(async (c) => {
    const dedupKey = getCache ? settingKeyImagem(chaveImagem({ prompt: c.promptImagem, size, quality, referencia })) : null

    
    
    if (dedupKey) {
      const cachedRef = await getCache!(dedupKey).catch(() => null)
      if (cachedRef) {
        const bytes = c.documento ? await baixarFundo(cachedRef).catch(() => null) : null
        
        if (!c.documento || bytes) {
          reusados++
          const feito = bytes ? await comporSobre(c, bytes, cachedRef) : { ref: cachedRef }
          const artifact = await createArtifact({
            conversation_id: conversationId ?? null, task_id: taskId ?? null, agent_id: agentId, kind: 'imagem',
            title: encurtarComSufixo(tituloBase, sufixoDoConceito(c.conceito), 80), storage_ref: feito.ref,
          })
          return {
            conceito: c.conceito, promptImagem: c.promptImagem, artifactId: artifact.id, size, quality,
            ...(c.framework ? { framework: c.framework } : {}),
            ...(c.headline ? { headline: c.headline } : {}),
            ...(c.subheadline ? { subheadline: c.subheadline } : {}),
            ...(c.cta ? { cta: c.cta } : {}),
            ...(c.arquetipo ? { arquetipo: c.arquetipo } : {}),
            ...(feito.documento ? { documento: feito.documento } : {}),
          } satisfies VariacaoCriativo
        }
      }
    }

    const { base64, usage } = await render({ prompt: c.promptImagem, size, quality, ...(referencia ? { referencia } : {}) })
    
    
    
    try { await recordCost({ kind: 'action', model: IMAGE_MODEL, promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0, tool: toolName, agent: agentId }) } catch {  }
    const hash = createHash('sha256').update(base64).digest('hex').slice(0, 16)
    
    
    const sufixo = c.documento ? '-fundo' : ''
    const fundoRef = await upload(`criativos/${conversationId ?? 'sem-conversa'}/${hash}${sufixo}.png`, base64)
    
    if (dedupKey && setCache) { try { await setCache(dedupKey, fundoRef) } catch {  } }
    const feito = await comporSobre(c, Buffer.from(base64, 'base64'), fundoRef)
    const artifact = await createArtifact({
      conversation_id: conversationId ?? null, task_id: taskId ?? null, agent_id: agentId, kind: 'imagem',
      title: encurtarComSufixo(tituloBase, sufixoDoConceito(c.conceito), 80), storage_ref: feito.ref,
    })
    return {
      conceito: c.conceito, promptImagem: c.promptImagem, artifactId: artifact.id, size, quality,
      ...(c.framework ? { framework: c.framework } : {}),
      ...(c.headline ? { headline: c.headline } : {}),
      ...(c.subheadline ? { subheadline: c.subheadline } : {}),
      ...(c.cta ? { cta: c.cta } : {}),
      ...(c.arquetipo ? { arquetipo: c.arquetipo } : {}),
      ...(feito.documento ? { documento: feito.documento } : {}),
    } satisfies VariacaoCriativo
  }))
  const variacoes: VariacaoCriativo[] = []
  let falhas = 0
  const motivos: Array<MotivoFalhaImagem | null> = []
  for (const s of settled) {
    if (s.status === 'fulfilled') variacoes.push(s.value)
    else {
      falhas++
      
      
      console.error(`[design/${toolName}] render falhou:`, s.reason)
      motivos.push(classificarFalhaDaImagem(s.reason))
    }
  }
  return { variacoes, falhas, motivo: motivoDominante(motivos), reusados, semComposicao }
}

const CALMA_INEXISTENTE = 'Não achei esse criativo.'

export async function gerarCriativo(
  input: GerarCriativoInput, ctx: GerarCriativoCtx, deps: GerarCriativoDeps = {},
): Promise<GerarCriativoResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const generate = deps.generate ?? defaultGenerate
  const render = deps.gerarImagem ?? defaultGerarImagem
  const baixar = deps.baixarReferencia ?? defaultBaixarReferencia
  const criticar = deps.criticar ?? criticarProvasImpl
  const upload = deps.upload ?? defaultUpload
  const createArtifact = deps.createArtifact ?? createArtifactImpl
  const getPeca = deps.getPecaComVersoes ?? getPecaImpl
  const setPecaStatus = deps.setPecaStatus ?? setPecaStatusImpl
  const getDirecao = deps.getDirecaoArte ?? getDirecaoImpl
  const getBrandVoice = deps.getBrandVoice ?? getBrandVoiceImpl
  const appendVersao = deps.appendVersao ?? appendVersaoImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const getCache = deps.getCache ?? getSettingImpl
  const setCache = deps.setCache ?? setSettingImpl
  const agentId = ctx.actingAgentId ?? 'designer'

  
  const peca = await getPeca(input.pecaId)
  if (!peca) return { output: CALMA_INEXISTENTE, patch: null }
  if (peca.operator_id !== ctx.operatorId) return { output: CALMA_INEXISTENTE, patch: null }

  
  
  
  if (peca.status !== 'brief') return { output: 'Esse anúncio já saiu do briefing — peça uma revisão ou finalize a arte.', patch: null }

  
  const brief = (peca.brief ?? {}) as BriefEstruturado
  if (!briefCoverage(brief).minDone) {
    return { output: 'Antes de gerar, me diz o objetivo e a oferta desse anúncio.', patch: null }
  }

  
  
  
  
  if (peca.formato === 'carrossel') {
    const { gerarCarrossel } = await import('./gerarCarrossel')
    return gerarCarrossel({ pecaId: input.pecaId }, ctx, {
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
      ...(deps.baixarFundo ? { baixarFundo: deps.baixarFundo } : {}),
      ...(deps.compor ? { compor: deps.compor } : {}),
    })
  }

  const formato = getFormatoDesign(peca.formato)

  
  
  
  const [direcao, voice, referenciaBytes] = await Promise.all([
    getDirecao(ctx.operatorId, peca.brand_id),
    getBrandVoice(ctx.operatorId, peca.brand_id),
    brief.referenciaId ? baixar(brief.referenciaId) : Promise.resolve(null),
  ])
  if (brief.referenciaId && !referenciaBytes) {
    return { output: `Não achei a foto de referência (${brief.referenciaId}). Envia de novo pelo estúdio?`, patch: null }
  }
  
  const referencia: Buffer | undefined = referenciaBytes ?? undefined
  const direcaoRender = renderDirecaoArte(direcao)
  const dnaVerbal = renderBrandVoice(voice)

  
  
  
  const usados = await (deps.listPecas ?? listPecasImpl)(ctx.operatorId, peca.brand_id, peca.agent_id)
    .then((lista) => arquetiposRecentes(
      [...lista].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    ))
    .catch(() => [] as string[])
  const { object, usage } = await generate({
    prompt: promptDiretorArte({ direcaoRender, dnaVerbal, brief, formato, nConceitos: N_CONCEITOS, temReferencia: !!referencia, usarRosto: !!brief.usarRosto, arquetiposUsados: usados }),
    schema: PlanoDeArteSchema,
  })
  try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0, agent: agentId, tool: 'gerarCriativo' }) } catch {  }
  const plano = parse(object, PlanoDeArteSchema)
  if (!plano || !plano.conceitos.length) return { output: 'Não consegui montar os conceitos agora — tenta de novo?', patch: null }
  const brutos = plano.conceitos.slice(0, N_CONCEITOS)
  const titulo = encurtarTitulo(peca.titulo || plano.titulo || formato.nome, 80)

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const marcaDaPeca: MarcaNaPeca = await lerMarcaDaPeca(
    { operatorId: ctx.operatorId, brandId: peca.brand_id },
    { getDirecaoArte: getDirecao, baixar, ...(deps.getBrand ? { getBrand: deps.getBrand } : {}) },
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

  
  
  

  
  const { variacoes, falhas, motivo, semComposicao } = await renderProvas({
    conceitos, size: renderSize(peca.formato), quality: PROVA_QUALITY, referencia,
    formato: peca.formato,
    conversationId: ctx.conversationId, taskId: ctx.taskId, agentId, tituloBase: titulo, toolName: 'gerarCriativo',
    render, upload, createArtifact, recordCost, compor: deps.compor, baixarFundo: deps.baixarFundo, getCache, setCache,
  })

  if (!variacoes.length) {
    return { output: textoDaFalhaDaImagem(motivo, 'as imagens'), patch: null }
  }

  
  const escolhidaOriginal = conceitos[plano.escolhida]?.conceito
  let escolhida = variacoes.findIndex((v) => v.conceito === escolhidaOriginal)
  if (escolhida < 0) escolhida = 0

  
  
  
  
  const olhar = (vars: VariacaoCriativo[]) => criticar(
    vars.map((v, i) => {
      
      
      
      const arq = getArquetipoDeCena(v.arquetipo ?? '')
      return {
        indice: i, conceito: v.conceito, artifactId: v.artifactId,
        ...(v.headline ? { headline: v.headline } : {}),
        ...(v.cta ? { cta: v.cta } : {}),
        ...(arq ? { cenaEsperada: cenaEsperada(arq) } : {}),
      }
    }),
    { agentId },
    { baixar },
  )
  let avaliacoes = await olhar(variacoes)
  let porque = plano.porque
  let critica: { aprovado: boolean; problemas: string[] } = { aprovado: true, problemas: [] }
  let refeitas = 0
  let insistentes = 0

  if (avaliacoes?.length) {
    let decisao = escolherMelhorProva(avaliacoes, escolhida, variacoes.length)

    
    
    
    
    
    
    for (let rodada = 1; rodada < TETO_DE_RODADAS && decisao.reroll.length; rodada++) {
      const alvo = decisao.reroll.filter((i) => conceitos[i])
      if (!alvo.length) break
      const { variacoes: refeitasVars } = await renderProvas({
        conceitos: alvo.map((i) => conceitos[i]!),
        size: renderSize(peca.formato), quality: PROVA_QUALITY, referencia,
        formato: peca.formato,
        conversationId: ctx.conversationId, taskId: ctx.taskId, agentId, tituloBase: titulo, toolName: 'gerarCriativo',
        render, upload, createArtifact, recordCost, compor: deps.compor, baixarFundo: deps.baixarFundo,
        
        
      })
      if (!refeitasVars.length) break
      
      
      alvo.forEach((i, k) => { if (refeitasVars[k]) variacoes[i] = refeitasVars[k]! })
      refeitas += refeitasVars.length
      const novas = await olhar(variacoes)
      if (!novas?.length) break
      avaliacoes = novas
      decisao = escolherMelhorProva(avaliacoes, escolhida, variacoes.length)
    }

    insistentes = decisao.reroll.length
    critica = resumirCriticaVisual(avaliacoes)
    if (decisao.escolhida !== escolhida) {
      porque = `${plano.porque} (troquei a escolha depois de olhar os renders: a prova anterior tinha problema de execução)`
      escolhida = decisao.escolhida
    }
  }
  const veredito = { escolhida, porque }

  
  await setPecaStatus(peca.id, ctx.operatorId, 'rascunho')
  const versaoNova = await appendVersao(peca.id, { variacoes: variacoes as never, veredito: veredito as never, critica: critica as never })

  
  
  const criativo = toCriativoView({ ...peca, status: 'rascunho' }, { n: versaoNova.n, variacoes, veredito, critica })
  const aviso = (falhas > 0 ? ` (${falhas} prova(s) falharam no render — segui com ${variacoes.length})${avisoDeFalhaParcial(motivo)}` : '')
    + (semComposicao > 0 ? ` ${COPY_GERAR.semComposicao(semComposicao)}` : '')
    + (refeitas > 0 ? ` ${COPY_GERAR.refeitas(refeitas)}` : '')
    + (insistentes > 0 ? ` ${COPY_GERAR.aindaComDefeito(insistentes)}` : '')
  
  const avisoQa = critica.problemas.length
    ? ` No controle de qualidade eu achei: ${critica.problemas.join('; ')}.`
    : ''
  const output = `Criei "${titulo}" (${formato.nome}) com ${variacoes.length} provas em qualidade de rascunho${aviso}. ` +
    `Minha escolha: "${variacoes[escolhida].conceito}" — ${porque}.${avisoQa} ` +
    `Está no estúdio: escolhe uma pra eu finalizar em alta, ou me pede mudança.`
  return { output, patch: { op: 'upsert', entidade: 'criativo', criativo } }
}
