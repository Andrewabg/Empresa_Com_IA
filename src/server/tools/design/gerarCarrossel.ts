











import { z } from 'zod'
import { createHash } from 'node:crypto'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getDirecaoArte as getDirecaoImpl, getBrandVoice as getBrandVoiceImpl } from '@/data/brandVoice'
import { getPecaComVersoes as getPecaImpl, setPecaStatus as setPecaStatusImpl, appendVersao as appendVersaoImpl } from '@/data/pecas'
import { createArtifact as createArtifactImpl, type CreateArtifactInput, type ArtifactRow } from '@/data/artifacts'
import { getSetting as getSettingImpl, setSetting as setSettingImpl } from '@/data/settings'
import { getFormatoDesign, renderSize } from '@/lib/design/formatos'
import { fecharPromptFundo } from '@/lib/design/promptFundo'
import { renderDirecaoArte } from '@/lib/design/direcaoArte'
import { renderBrandVoice } from '@/lib/estudio/brandVoice'
import { briefCoverage } from '@/lib/design/briefCoverage'
import { chaveImagem, settingKeyImagem } from '@/lib/design/imagemDedup'
import { resolverCoresDaPeca } from '@/lib/design/coresDaPeca'
import {
  COPY_CARROSSEL, SLIDES_MAX, SLIDES_MIN, montarRoteiroDeSlides, renderesDoRoteiro,
  type SlidePlanejado,
} from '@/lib/design/carrossel'
import { laudoDaArte, type ResultadoDoPortao } from '@/lib/qa/portoes'
import { promptDiretorDeCarrossel } from './prompts'
import { comporArteFinal, type MarcaNaPeca } from '@/server/design/compositor'
import { lerMarcaDaPeca } from '@/server/design/marca'
import {
  defaultBaixarReferencia, defaultBaixarStorage, defaultGenerate, defaultGerarImagem, defaultUpload,
  type GenImagemUsage, type GerarCriativoResult,
} from './gerarCriativo'
import { toCriativoView, type BriefEstruturado, type DocumentoDeArte, type SlideDoCarrossel, type VariacaoCriativo } from '@/lib/design/types'
import { avisoDeFalhaParcial, classificarFalhaDaImagem, motivoDominante, textoDaFalhaDaImagem, type MotivoFalhaImagem } from '@/lib/design/falhaDaImagem'
import { encurtarTitulo, encurtarComSufixo } from '@/lib/encurtarTitulo'
import { sufixoDoSlide } from '@/lib/design/legendaDaArte'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
const IMAGE_MODEL = 'gpt-image-2'


const CARROSSEL_QUALITY = coerce(process.env.DESIGN_CARROSSEL_QUALITY, 'high')

const N_SLIDES = clampSlides(process.env.DESIGN_N_SLIDES)

function coerce(raw: string | undefined, fallback: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
  return raw === 'low' || raw === 'medium' || raw === 'high' ? raw : fallback
}
function clampSlides(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isFinite(n) && n >= SLIDES_MIN && n <= SLIDES_MAX ? Math.floor(n) : 7
}


export const PlanoDeCarrosselSchema = z.object({
  titulo: z.string(),
  bigIdea: z.string(),
  slides: z.array(z.object({
    papel: z.string().describe('capa | miolo | prova | cta'),
    template: z.string(),
    headline: z.string(),
    subheadline: z.string(),
    cta: z.string(),
    selo: z.string(),
    promptFundo: z.string().describe('EM INGLÊS, só na capa (e no slide de prova). Vazio nos demais.'),
  })),
})

interface GenUsage { inputTokens?: number; outputTokens?: number }

export interface GerarCarrosselInput {
  pecaId: string
  
  ajuste?: string
}
export interface GerarCarrosselCtx { operatorId?: string; actingAgentId?: string; conversationId?: string | null; taskId?: string | null }
export interface GerarCarrosselDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage }>
  gerarImagem?: (args: { prompt: string; size: string; quality: 'low' | 'medium' | 'high'; referencia?: Buffer }) => Promise<{ base64: string; usage: GenImagemUsage }>
  baixarReferencia?: (artifactId: string) => Promise<Buffer | null>
  upload?: (path: string, base64: string) => Promise<string>
  createArtifact?: (input: CreateArtifactInput) => Promise<ArtifactRow>
  getPecaComVersoes?: typeof getPecaImpl
  setPecaStatus?: typeof setPecaStatusImpl
  getDirecaoArte?: typeof getDirecaoImpl
  getBrandVoice?: typeof getBrandVoiceImpl
  appendVersao?: typeof appendVersaoImpl
  recordCost?: typeof recordCostImpl
  getCache?: (key: string) => Promise<string | null>
  setCache?: (key: string, value: string) => Promise<void>
  baixarFundo?: typeof defaultBaixarStorage
  compor?: typeof comporArteFinal
}

export const COPY_GERAR_CARROSSEL = {
  naoEhCarrossel: 'Essa peça não é um carrossel. Para uma série de slides, comece um briefing de carrossel.',
  jaSaiu: 'Esse carrossel já saiu do briefing. Peça uma mudança, ou edite os textos direto nos slides.',
  semPlano: 'Não consegui montar o roteiro dos slides agora. Tenta de novo?',
  semSlides: 'Não consegui montar nenhum slide agora. Tenta de novo?',
  faltouBrief: 'Antes de montar o carrossel, me diz o objetivo e a oferta dessa série.',
  slideSemArte: (n: number) =>
    n === 1
      ? 'Um slide não pôde ser montado e ficou de fora da série.'
      : `${n} slides não puderam ser montados e ficaram de fora da série.`,
} as const

const CALMA_INEXISTENTE = 'Não achei esse criativo.'


interface SlidePronto { slide: SlideDoCarrossel; portoes: ResultadoDoPortao[]; problemas: string[] }


function textoDoSlide(doc: DocumentoDeArte): string {
  return [doc.blocos.selo, doc.blocos.headline, doc.blocos.subheadline, doc.blocos.cta]
    .filter(Boolean).join(' ')
}

export async function gerarCarrossel(
  input: GerarCarrosselInput, ctx: GerarCarrosselCtx, deps: GerarCarrosselDeps = {},
): Promise<GerarCriativoResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const generate = deps.generate ?? defaultGenerate
  const render = deps.gerarImagem ?? defaultGerarImagem
  const baixar = deps.baixarReferencia ?? defaultBaixarReferencia
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
  const baixarFundo = deps.baixarFundo ?? defaultBaixarStorage
  const compor = deps.compor ?? comporArteFinal
  const agentId = ctx.actingAgentId ?? 'designer'
  const ajuste = (input.ajuste ?? '').trim()

  
  const peca = await getPeca(input.pecaId)
  if (!peca || peca.operator_id !== ctx.operatorId) return { output: CALMA_INEXISTENTE, patch: null }
  if (peca.formato !== 'carrossel') return { output: COPY_GERAR_CARROSSEL.naoEhCarrossel, patch: null }
  
  
  if (!ajuste && peca.status !== 'brief') return { output: COPY_GERAR_CARROSSEL.jaSaiu, patch: null }

  const brief = (peca.brief ?? {}) as BriefEstruturado
  if (!briefCoverage(brief).minDone) return { output: COPY_GERAR_CARROSSEL.faltouBrief, patch: null }

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

  
  
  const { object, usage } = await generate({
    prompt: promptDiretorDeCarrossel({
      direcaoRender: renderDirecaoArte(direcao), dnaVerbal: renderBrandVoice(voice),
      brief, formato, nSlides: N_SLIDES, temReferencia: !!referencia, usarRosto: !!brief.usarRosto,
      ...(ajuste ? { ajuste } : {}),
    }),
    schema: PlanoDeCarrosselSchema,
  })
  try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0, agent: agentId, tool: 'gerarCarrossel' }) } catch {  }
  const plano = PlanoDeCarrosselSchema.safeParse(object)
  if (!plano.success || !plano.data.slides.length) return { output: COPY_GERAR_CARROSSEL.semPlano, patch: null }

  const { slides: roteiro, avisos } = montarRoteiroDeSlides(plano.data.slides, SLIDES_MAX)
  if (!roteiro.length) return { output: COPY_GERAR_CARROSSEL.semSlides, patch: null }

  
  
  const cores = resolverCoresDaPeca(direcao.paleta)
  const fontes = { display: direcao.tipografia?.display ?? '', corpo: direcao.tipografia?.corpo ?? '' }
  const titulo = encurtarTitulo(peca.titulo || plano.data.titulo || formato.nome, 80)
  const marca: MarcaNaPeca = await lerMarcaDaPeca(
    { operatorId: ctx.operatorId, brandId: peca.brand_id },
    { getDirecaoArte: getDirecao, baixar },
  ).catch(() => ({}))

  
  
  const size = renderSize(peca.formato)
  const fundos = new Map<number, { bytes: Buffer; ref: string }>()
  const motivosDeFundo: Array<MotivoFalhaImagem | null> = []
  let capaBytes: Buffer | undefined
  for (const s of roteiro) {
    
    
    const promptDaCapa = fecharPromptFundo(s.promptFundo, null)
    if (!promptDaCapa) continue
    try {
      const ref = s.ordem === 1 ? referencia : (capaBytes ?? referencia)
      const feito = await renderizarFundo({
        prompt: s.promptFundo, size, quality: CARROSSEL_QUALITY, referencia: ref,
        conversationId: ctx.conversationId, agentId,
        render, upload, recordCost, getCache, setCache, baixarFundo,
      })
      fundos.set(s.ordem, feito)
      if (s.ordem === 1) capaBytes = feito.bytes
    } catch (e) {
      
      
      
      console.error('[design/gerarCarrossel] fundo do slide falhou:', e)
      motivosDeFundo.push(classificarFalhaDaImagem(e))
    }
  }

  
  
  const prontos: SlidePronto[] = []
  for (const s of roteiro) {
    const fundo = fundos.get(s.ordem)
    const documento: DocumentoDeArte = {
      template: s.template,
      blocos: s.blocos,
      cores, fontes, v: 1,
      ...(fundo ? { fundoRef: fundo.ref } : {}),
    }
    try {
      const arte = await compor({ ...(fundo ? { fundo: fundo.bytes } : {}), formato: peca.formato, marca, documento })
      const hash = createHash('sha256').update(arte.png).digest('hex').slice(0, 16)
      const ref = await upload(`criativos/${ctx.conversationId ?? 'sem-conversa'}/${hash}.png`, arte.png.toString('base64'))
      const artifact = await createArtifact({
        conversation_id: ctx.conversationId ?? null, task_id: ctx.taskId ?? null, agent_id: agentId, kind: 'imagem',
        title: encurtarComSufixo(titulo, sufixoDoSlide(s.ordem), 80), storage_ref: ref,
      })
      const laudo = laudoDaArte({ fatos: arte.fatos ?? [], texto: textoDoSlide(documento) })
      prontos.push({
        slide: { ordem: s.ordem, papel: s.papel, documento, artifactId: artifact.id },
        portoes: laudo.portoes,
        problemas: laudo.problemas.map((p) => `slide ${s.ordem}: ${p}`),
      })
    } catch {
      
    }
  }
  if (!prontos.length) return { output: COPY_GERAR_CARROSSEL.semSlides, patch: null }

  
  
  const capa = prontos[0]!.slide
  const slides = prontos.map((p) => p.slide)
  const variacao: VariacaoCriativo = {
    conceito: plano.data.bigIdea.trim() || titulo,
    promptImagem: roteiro[0]?.promptFundo ?? '',
    artifactId: capa.artifactId,
    size, quality: CARROSSEL_QUALITY,
    final: true,
    ...(capa.documento.blocos.headline ? { headline: capa.documento.blocos.headline } : {}),
    ...(capa.documento.blocos.subheadline ? { subheadline: capa.documento.blocos.subheadline } : {}),
    documento: capa.documento,
    slides,
  }
  const problemas = prontos.flatMap((p) => p.problemas)
  const portoes = prontos.flatMap((p) => p.portoes)
  const critica = { aprovado: problemas.length === 0, problemas, portoes }
  const veredito = { escolhida: 0, porque: plano.data.bigIdea.trim() }

  await setPecaStatus(peca.id, ctx.operatorId, 'rascunho')
  const versaoNova = await appendVersao(peca.id, { variacoes: [variacao] as never, veredito: veredito as never, critica: critica as never })
  const criativo = toCriativoView({ ...peca, status: 'rascunho' }, { n: versaoNova.n, variacoes: [variacao], veredito, critica })

  const motivoDosFundos = motivoDominante(motivosDeFundo)
  const perdidos = roteiro.length - prontos.length
  const renders = renderesDoRoteiro(roteiro)
  const partes = [
    `Montei "${titulo}" em ${slides.length} slides${renders ? ` (${renders} com foto, o resto em tipografia sobre a cor da marca)` : ' em tipografia sobre a cor da marca'}.`,
    `O fio da série: ${plano.data.bigIdea.trim() || 'o argumento que costura os slides'}.`,
    ...(slides.length < SLIDES_MIN ? [COPY_CARROSSEL.poucosSlides(slides.length, SLIDES_MIN)] : []),
    ...(perdidos > 0 ? [COPY_GERAR_CARROSSEL.slideSemArte(perdidos)] : []),
    
    
    ...(fundos.size === 0 && motivoDosFundos
      ? [textoDaFalhaDaImagem(motivoDosFundos, 'as fotos dos slides')]
      
      : motivoDosFundos ? [avisoDeFalhaParcial(motivoDosFundos).trim()] : []),
    ...avisos,
    ...(problemas.length ? [`No controle de qualidade eu achei: ${problemas.join('; ')}.`] : []),
    'Está no estúdio: dá para editar o texto de qualquer slide sem gastar nada, e baixar a série inteira.',
  ]
  return { output: partes.join(' '), patch: { op: 'upsert', entidade: 'criativo', criativo } }
}


async function renderizarFundo(args: {
  prompt: string; size: string; quality: 'low' | 'medium' | 'high'; referencia?: Buffer
  conversationId: string | null | undefined
  agentId: string
  render: NonNullable<GerarCarrosselDeps['gerarImagem']>
  upload: NonNullable<GerarCarrosselDeps['upload']>
  recordCost: typeof recordCostImpl
  getCache?: (key: string) => Promise<string | null>
  setCache?: (key: string, value: string) => Promise<void>
  baixarFundo?: typeof defaultBaixarStorage
}): Promise<{ bytes: Buffer; ref: string }> {
  const chave = args.getCache
    ? settingKeyImagem(chaveImagem({ prompt: args.prompt, size: args.size, quality: args.quality, referencia: args.referencia }))
    : null
  if (chave && args.baixarFundo) {
    const guardado = await args.getCache!(chave).catch(() => null)
    if (guardado) {
      const bytes = await args.baixarFundo(guardado).catch(() => null)
      if (bytes) return { bytes, ref: guardado }
    }
  }
  const { base64, usage } = await args.render({
    prompt: args.prompt, size: args.size, quality: args.quality,
    ...(args.referencia ? { referencia: args.referencia } : {}),
  })
  try {
    await args.recordCost({ kind: 'action', model: IMAGE_MODEL, promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0, tool: 'gerarCarrossel', agent: args.agentId })
  } catch {  }
  const bytes = Buffer.from(base64, 'base64')
  const hash = createHash('sha256').update(base64).digest('hex').slice(0, 16)
  const ref = await args.upload(`criativos/${args.conversationId ?? 'sem-conversa'}/${hash}-fundo.png`, base64)
  if (chave && args.setCache) { try { await args.setCache(chave, ref) } catch {  } }
  return { bytes, ref }
}

export type { SlidePlanejado }
