










import { createHash } from 'node:crypto'
import { recordCost as recordCostImpl } from '@/data/cost'
import {
  getPecaComVersoes as getPecaImpl,
  appendVersao as appendVersaoImpl,
  setPecaStatus as setPecaStatusImpl,
} from '@/data/pecas'
import { createArtifact as createArtifactImpl, type CreateArtifactInput, type ArtifactRow } from '@/data/artifacts'
import { toCriativoView } from '@/lib/design/types'
import { getDirecaoArte as getDirecaoImpl } from '@/data/brandVoice'
import { getBrand as getBrandImpl } from '@/data/brands'
import { renderSize, tamanhoAlvo } from '@/lib/design/formatos'
import { comporArteFinal } from '@/server/design/compositor'
import { laudoDaArte, type FatoDoBloco } from '@/lib/qa/portoes'
import { lerMarcaDaPeca } from '@/server/design/marca'
import { promptAnuncioInteiro, alvoDoAnuncio } from '@/lib/design/promptAnuncioInteiro'
import { reprovaDoTexto, type TextoPedido } from '@/lib/design/conferenciaDoTexto'
import { promptDaArteFinal } from '@/lib/design/promptRemix'
import { conferirTextoDaArte as conferirImpl } from '@/server/design/conferirTextoDaArte'
import { removerCaudaAnterior } from '@/lib/design/promptFundo'
import { getArquetipoDeCena, clausulaDeTextoDiegetico } from '@/lib/design/arquetipos'
import { defaultGerarImagem, defaultBaixarReferencia, defaultUpload } from './gerarCriativo'
import type { EstudioPatch } from '@/lib/estudio/types'
import type { VariacaoCriativo } from '@/lib/design/types'
import { classificarFalhaDaImagem, textoDaFalhaDaImagem } from '@/lib/design/falhaDaImagem'
import { encurtarComSufixo } from '@/lib/encurtarTitulo'
import { SUFIXO_ARTE_FINAL } from '@/lib/design/legendaDaArte'

const IMAGE_MODEL = 'gpt-image-2'
const CALMA_INEXISTENTE = 'Não achei esse criativo.'

export const COPY_FINALIZAR = {
  semCompositor:
    'Não consegui aplicar a marca nem ajustar a arte para o tamanho exato da plataforma, então ela saiu no tamanho do render. O arquivo está válido e dá para usar.',
  reprovou: (problemas: string[]) =>
    `Conferi a arte pronta e ela tem problema: ${problemas.join('; ')}. Está no estúdio para você decidir, e dá para editar o texto ali mesmo sem gerar de novo.`,
  ressalva: (problemas: string[]) =>
    `Vale saber antes de publicar: ${problemas.join('; ')}.`,
  
  textoNaoConferido:
    'O texto desta arte foi desenhado junto com a imagem e eu não consegui conferir letra por letra desta vez. Dá uma lida antes de publicar.',
} as const


function textoDaArte(documento?: { blocos: Record<string, string | undefined> }): string | undefined {
  if (!documento) return undefined
  return Object.values(documento.blocos).filter(Boolean).join(' ')
}

export interface FinalizarCriativoInput { pecaId: string; variacao?: number; ajustes?: string }
export interface FinalizarCriativoCtx { operatorId?: string; actingAgentId?: string; conversationId?: string | null; taskId?: string | null }
export interface FinalizarCriativoResult { output: string; patch: EstudioPatch | null }

export interface FinalizarCriativoDeps {
  gerarImagem?: typeof defaultGerarImagem
  baixarReferencia?: typeof defaultBaixarReferencia
  upload?: typeof defaultUpload
  createArtifact?: (input: CreateArtifactInput) => Promise<ArtifactRow>
  getPecaComVersoes?: typeof getPecaImpl
  appendVersao?: typeof appendVersaoImpl
  setPecaStatus?: typeof setPecaStatusImpl
  recordCost?: typeof recordCostImpl
  getDirecaoArte?: typeof getDirecaoImpl
  getBrand?: typeof getBrandImpl
  compor?: typeof comporArteFinal
  
  conferirTexto?: typeof conferirImpl
}

export async function finalizarCriativo(
  input: FinalizarCriativoInput,
  ctx: FinalizarCriativoCtx,
  deps: FinalizarCriativoDeps = {},
): Promise<FinalizarCriativoResult> {
  
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }

  const render = deps.gerarImagem ?? defaultGerarImagem
  const baixar = deps.baixarReferencia ?? defaultBaixarReferencia
  const upload = deps.upload ?? defaultUpload
  const createArtifact = deps.createArtifact ?? createArtifactImpl
  const getPecaComVersoes = deps.getPecaComVersoes ?? getPecaImpl
  const appendVersao = deps.appendVersao ?? appendVersaoImpl
  const setPecaStatus = deps.setPecaStatus ?? setPecaStatusImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const getDirecaoArte = deps.getDirecaoArte ?? getDirecaoImpl
  const getBrand = deps.getBrand ?? getBrandImpl
  const compor = deps.compor ?? comporArteFinal
  const conferirTexto = deps.conferirTexto ?? conferirImpl
  const agentId = ctx.actingAgentId ?? 'designer'

  
  const peca = await getPecaComVersoes(input.pecaId)
  if (!peca) return { output: CALMA_INEXISTENTE, patch: null }

  
  if (peca.operator_id !== ctx.operatorId) return { output: CALMA_INEXISTENTE, patch: null }

  
  if (!peca.versoes.length) return { output: 'Esse criativo ainda não tem versões para finalizar.', patch: null }

  
  const ultimaVersao = peca.versoes[peca.versoes.length - 1]
  const view = toCriativoView(peca, ultimaVersao)

  
  const nVar = view.variacoes.length
  let idxEscolhida: number
  if (input.variacao !== undefined && input.variacao >= 0 && input.variacao < nVar) {
    idxEscolhida = input.variacao
  } else {
    const v = view.veredito.escolhida
    idxEscolhida = (v !== undefined && v >= 0 && v < nVar) ? v : 0
  }
  const variacaoEscolhida = view.variacoes[idxEscolhida]
  if (!variacaoEscolhida) return { output: 'Esse criativo não tem variações para finalizar.', patch: null }

  
  
  
  if (!input.ajustes) {
    const jaFinal = view.variacoes.find(
      (v) => v.final && v.quality === 'high' && v.promptImagem === variacaoEscolhida.promptImagem && !!v.artifactId,
    )
    if (jaFinal) {
      const output = `Arte final de "${peca.titulo}" já estava pronta em alta qualidade — está no estúdio pra baixar.`
      return { output, patch: { op: 'upsert', entidade: 'criativo', criativo: view } }
    }
  }

  
  
  
  
  
  
  
  
  
  let referencia: Buffer | undefined
  let avisoRef = ''
  const provaBytes = await baixar(variacaoEscolhida.artifactId).catch(() => null)
  if (provaBytes) {
    referencia = provaBytes
  } else {
    
    
    const referenciaId = typeof peca.brief?.referenciaId === 'string' ? peca.brief.referenciaId : undefined
    if (referenciaId) {
      const bytes = await baixar(referenciaId)
      if (bytes) referencia = bytes
      else avisoRef = ' (a foto de referência original não está mais disponível, finalizei sem ela)'
    }
    avisoRef += ' (não achei o arquivo da prova que você escolheu, então a arte final pode sair um pouco diferente dela)'
  }

  
  
  
  
  
  
  
  
  
  
  
  const pedidoDeTexto: TextoPedido = {
    ...(variacaoEscolhida.headline ? { headline: variacaoEscolhida.headline } : {}),
    ...(variacaoEscolhida.subheadline ? { subheadline: variacaoEscolhida.subheadline } : {}),
    ...(variacaoEscolhida.cta ? { cta: variacaoEscolhida.cta } : {}),
  }
  const temCopy = !!(pedidoDeTexto.headline || pedidoDeTexto.subheadline || pedidoDeTexto.cta)
  
  
  
  const promptDoAnuncio = provaBytes
    ? promptDaArteFinal(variacaoEscolhida.promptImagem)
    : variacaoEscolhida.promptImagem
  const prompt = promptDoAnuncio + (input.ajustes ? `\n\nADJUSTMENTS: ${input.ajustes}` : '')

  const renderHigh = async () =>
    render({ prompt, size: renderSize(peca.formato), quality: 'high', ...(referencia ? { referencia } : {}) })

  let base64: string
  let usage: { inputTokens?: number; outputTokens?: number }
  try {
    const result = await renderHigh()
    base64 = result.base64
    usage = result.usage
  } catch (e) {
    
    
    console.error('[design/finalizarCriativo] render falhou:', e)
    return { output: textoDaFalhaDaImagem(classificarFalhaDaImagem(e), 'a arte final'), patch: null }
  }

  
  
  let ressalvaDoTexto: string | null = null
  if (temCopy) {
    const laudo = await conferirTexto(Buffer.from(base64, 'base64'), pedidoDeTexto, { agentId })
    ressalvaDoTexto = laudo ? reprovaDoTexto(laudo, pedidoDeTexto) : 'não deu para conferir o texto desta vez'
    if (ressalvaDoTexto) {
      
      
      console.warn(`[finalizarCriativo] texto reprovado, refazendo 1x: ${ressalvaDoTexto}`)
      try {
        const r2 = await renderHigh()
        try {
          await recordCost({
            kind: 'action', model: IMAGE_MODEL,
            promptTokens: r2.usage.inputTokens ?? 0, completionTokens: r2.usage.outputTokens ?? 0,
            tool: 'finalizarCriativo', agent: agentId,
          })
        } catch {  }
        const laudo2 = await conferirTexto(Buffer.from(r2.base64, 'base64'), pedidoDeTexto, { agentId })
        const motivo2 = laudo2 ? reprovaDoTexto(laudo2, pedidoDeTexto) : 'não deu para conferir o texto desta vez'
        
        if (!motivo2) { base64 = r2.base64; ressalvaDoTexto = null }
      } catch {
        
        
      }
    }
  }

  
  
  
  try {
    await recordCost({
      kind: 'action', model: IMAGE_MODEL,
      promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0,
      tool: 'finalizarCriativo', agent: agentId,
    })
  } catch {  }

  
  
  
  const alvo = tamanhoAlvo(peca.formato)
  let sizeFinal = variacaoEscolhida.size
  let documentoFinal = variacaoEscolhida.documento
  const avisos: string[] = []
  let fatos: FatoDoBloco[] = []
  try {
    const marca = await lerMarcaDaPeca(
      { operatorId: ctx.operatorId, brandId: peca.brand_id },
      { getDirecaoArte, getBrand, baixar },
    )
    const fundoBytes = Buffer.from(base64, 'base64')
    
    
    let fundoRef: string | undefined
    if (documentoFinal) {
      const hashFundo = createHash('sha256').update(base64).digest('hex').slice(0, 16)
      fundoRef = await upload(`criativos/${ctx.conversationId ?? peca.id}/${hashFundo}-fundo.png`, base64)
    }
    
    
    
    
    
    
    
    const arte = await compor({ fundo: fundoBytes, formato: peca.formato })
    base64 = arte.png.toString('base64')
    sizeFinal = alvo.size
    if (documentoFinal && fundoRef) documentoFinal = { ...documentoFinal, fundoRef }
    avisos.push(...arte.avisos)
    fatos = arte.fatos ?? []
  } catch {
    avisos.push(COPY_FINALIZAR.semCompositor)
  }
  
  
  
  if (ressalvaDoTexto) avisos.push(COPY_FINALIZAR.textoNaoConferido)

  
  const hash = createHash('sha256').update(base64).digest('hex').slice(0, 16)
  const storagePath = `criativos/${ctx.conversationId ?? peca.id}/${hash}.png`
  const storageRef = await upload(storagePath, base64)
  const artifact = await createArtifact({
    conversation_id: ctx.conversationId ?? null,
    task_id: ctx.taskId ?? null,
    agent_id: agentId,
    kind: 'imagem',
    title: encurtarComSufixo(peca.titulo, SUFIXO_ARTE_FINAL, 80),
    storage_ref: storageRef,
  })

  
  
  
  
  const variacaoFinal: VariacaoCriativo = {
    ...variacaoEscolhida, quality: 'high', final: true, artifactId: artifact.id, size: sizeFinal,
    ...(documentoFinal ? { documento: documentoFinal } : {}),
  }
  const provasAnteriores = view.variacoes.filter((v) => !v.final)
  const variacoesNovas: VariacaoCriativo[] = [...provasAnteriores, variacaoFinal]
  
  
  
  
  
  const laudo = fatos.length ? laudoDaArte({ fatos, texto: textoDaArte(documentoFinal) }) : null
  if (laudo && !laudo.aprovado) avisos.push(COPY_FINALIZAR.reprovou(laudo.problemas))
  else if (laudo && laudo.problemas.length) avisos.push(COPY_FINALIZAR.ressalva(laudo.problemas))

  const versaoNova = await appendVersao(peca.id, {
    variacoes: variacoesNovas as never,
    veredito: { escolhida: provasAnteriores.length, porque: view.veredito.porque ?? '' } as never,
    critica: (laudo ? { aprovado: laudo.aprovado, problemas: laudo.problemas, portoes: laudo.portoes } : {}) as never,
  })

  
  await setPecaStatus(peca.id, ctx.operatorId, 'aprovada')

  
  const pecaAtualizada = { ...peca, status: 'aprovada' as const }
  const criativo = toCriativoView(pecaAtualizada, versaoNova)

  
  const tamanho = sizeFinal === alvo.size ? ` em ${alvo.largura}x${alvo.altura}` : ''
  const output = [
    `Arte final de "${peca.titulo}" pronta em alta qualidade${tamanho} — está no estúdio pra baixar.${avisoRef}`,
    ...avisos,
  ].join(' ')
  return { output, patch: { op: 'upsert', entidade: 'criativo', criativo } }
}
