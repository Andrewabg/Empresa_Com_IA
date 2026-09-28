
import { createHash } from 'node:crypto'
import {
  getPecaComVersoes as getPecaImpl,
  appendVersao as appendVersaoImpl,
} from '@/data/pecas'
import { createArtifact as createArtifactImpl, type CreateArtifactInput, type ArtifactRow } from '@/data/artifacts'
import { toCriativoView, type SlideDoCarrossel, type VariacaoCriativo } from '@/lib/design/types'
import { aplicarPatchDeArte, type PatchDeArte } from '@/lib/design/aplicarPatchDeArte'
import { comporArteFinal } from '@/server/design/compositor'
import { lerMarcaDaPeca } from '@/server/design/marca'
import { defaultBaixarStorage, defaultBaixarReferencia, defaultUpload } from './gerarCriativo'
import type { EstudioPatch } from '@/lib/estudio/types'
import { encurtarComSufixo } from '@/lib/encurtarTitulo'
import { SUFIXO_EDICAO } from '@/lib/design/legendaDaArte'

const CALMA_INEXISTENTE = 'Não achei esse criativo.'

export const COPY_RECOMPOR = {
  semCamadas:
    'Essa arte foi criada antes de o estúdio separar o texto da imagem, então não dá para editar o texto dela sem gerar de novo. Peça uma revisão e a nova já nasce editável.',
  semFundo:
    'O arquivo de fundo dessa arte não está mais disponível, então não consigo remontá-la. Peça uma revisão para gerar uma nova.',
  semMudanca: 'Não mudou nada nessa arte, então não criei versão nova.',
  naoRemontou: 'Não consegui remontar a arte agora. Tenta de novo?',
} as const

export interface RecomporCriativoInput {
  pecaId: string
  
  variacao?: number
  
  slide?: number
  patch: PatchDeArte
}
export interface RecomporCriativoCtx {
  operatorId?: string
  actingAgentId?: string
  conversationId?: string | null
  taskId?: string | null
}
export interface RecomporCriativoResult { output: string; patch: EstudioPatch | null }

export interface RecomporCriativoDeps {
  getPecaComVersoes?: typeof getPecaImpl
  appendVersao?: typeof appendVersaoImpl
  createArtifact?: (input: CreateArtifactInput) => Promise<ArtifactRow>
  upload?: typeof defaultUpload
  baixarFundo?: typeof defaultBaixarStorage
  baixarReferencia?: typeof defaultBaixarReferencia
  compor?: typeof comporArteFinal
  lerMarca?: typeof lerMarcaDaPeca
}

export async function recomporCriativo(
  input: RecomporCriativoInput,
  ctx: RecomporCriativoCtx,
  deps: RecomporCriativoDeps = {},
): Promise<RecomporCriativoResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }

  const getPeca = deps.getPecaComVersoes ?? getPecaImpl
  const appendVersao = deps.appendVersao ?? appendVersaoImpl
  const createArtifact = deps.createArtifact ?? createArtifactImpl
  const upload = deps.upload ?? defaultUpload
  const baixarFundo = deps.baixarFundo ?? defaultBaixarStorage
  const baixar = deps.baixarReferencia ?? defaultBaixarReferencia
  const compor = deps.compor ?? comporArteFinal
  const lerMarca = deps.lerMarca ?? lerMarcaDaPeca
  const agentId = ctx.actingAgentId ?? 'designer'

  const peca = await getPeca(input.pecaId)
  if (!peca) return { output: CALMA_INEXISTENTE, patch: null }
  
  if (peca.operator_id !== ctx.operatorId) return { output: CALMA_INEXISTENTE, patch: null }
  if (!peca.versoes.length) return { output: 'Essa arte ainda não tem versões para editar.', patch: null }

  const ultimaVersao = peca.versoes[peca.versoes.length - 1]
  const view = toCriativoView(peca, ultimaVersao)
  const n = view.variacoes.length
  const idx = (input.variacao !== undefined && input.variacao >= 0 && input.variacao < n)
    ? input.variacao
    : (view.veredito.escolhida !== undefined && view.veredito.escolhida >= 0 && view.veredito.escolhida < n ? view.veredito.escolhida : 0)
  const alvo = view.variacoes[idx]
  if (!alvo) return { output: 'Essa arte não tem variações para editar.', patch: null }

  
  
  
  const serie = Array.isArray(alvo.slides) && alvo.slides.length ? [...alvo.slides].sort((a, b) => a.ordem - b.ordem) : null
  const posNaSerie = serie
    ? Math.max(0, serie.findIndex((s) => s.ordem === (input.slide ?? serie[0]!.ordem)))
    : -1
  const slideAlvo: SlideDoCarrossel | null = serie ? serie[posNaSerie]! : null

  const documentoBase = slideAlvo ? slideAlvo.documento : alvo.documento
  if (!documentoBase) return { output: COPY_RECOMPOR.semCamadas, patch: null }
  
  
  
  if (!slideAlvo && !documentoBase.fundoRef) return { output: COPY_RECOMPOR.semFundo, patch: null }

  const { documento, mudou, recusas } = aplicarPatchDeArte(documentoBase, input.patch, peca.formato)
  if (!mudou) {
    return { output: [COPY_RECOMPOR.semMudanca, ...recusas].join(' '), patch: null }
  }

  let fundo: Buffer | null = null
  if (documentoBase.fundoRef) {
    fundo = await baixarFundo(documentoBase.fundoRef).catch(() => null)
    if (!fundo) return { output: COPY_RECOMPOR.semFundo, patch: null }
  }

  const marca = await lerMarca(
    { operatorId: ctx.operatorId, brandId: peca.brand_id },
    { baixar },
  ).catch(() => ({}))

  let png: Buffer
  let avisos: string[]
  try {
    const arte = await compor({ ...(fundo ? { fundo } : {}), formato: peca.formato, marca, documento })
    png = arte.png
    avisos = arte.avisos
  } catch {
    return { output: COPY_RECOMPOR.naoRemontou, patch: null }
  }

  const hash = createHash('sha256').update(png).digest('hex').slice(0, 16)
  const storageRef = await upload(`criativos/${ctx.conversationId ?? peca.id}/${hash}.png`, png.toString('base64'))
  const artifact = await createArtifact({
    conversation_id: ctx.conversationId ?? null,
    task_id: ctx.taskId ?? null,
    agent_id: agentId,
    kind: 'imagem',
    title: encurtarComSufixo(peca.titulo, SUFIXO_EDICAO, 80),
    storage_ref: storageRef,
  })

  
  
  
  
  
  const slidesNovos = serie && slideAlvo
    ? serie.map((s, i) => (i === posNaSerie ? { ...s, documento, artifactId: artifact.id } : s))
    : null
  const ehCapa = !!slidesNovos && posNaSerie === 0
  const variacaoNova: VariacaoCriativo = slidesNovos
    ? {
        ...alvo,
        slides: slidesNovos,
        ...(ehCapa ? { artifactId: artifact.id, documento } : {}),
      }
    : { ...alvo, artifactId: artifact.id, documento }
  const variacoes = view.variacoes.map((v, i) => (i === idx ? variacaoNova : v))
  const versaoNova = await appendVersao(peca.id, {
    variacoes: variacoes as never,
    veredito: { escolhida: idx, porque: view.veredito.porque ?? '' } as never,
    critica: view.critica as never,
    origemRevisao: 'edicao',
  })

  const criativo = toCriativoView(peca, { n: versaoNova.n, variacoes, veredito: { escolhida: idx, porque: view.veredito.porque ?? '' }, critica: view.critica })
  return {
    output: ['Arte atualizada, sem gerar imagem nova.', ...recusas, ...avisos].join(' '),
    patch: { op: 'upsert', entidade: 'criativo', criativo },
  }
}
