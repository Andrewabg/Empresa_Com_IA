



















import { createHash } from 'node:crypto'
import { recordCost as recordCostImpl } from '@/data/cost'
import {
  getPecaComVersoes as getPecaImpl,
  appendVersao as appendVersaoImpl,
  setPecaStatus as setPecaStatusImpl,
} from '@/data/pecas'
import { createArtifact as createArtifactImpl, type CreateArtifactInput, type ArtifactRow } from '@/data/artifacts'
import { toCriativoView, type VariacaoCriativo } from '@/lib/design/types'
import { promptRemix } from '@/lib/design/promptRemix'
import { alvoDoAnuncio } from '@/lib/design/promptAnuncioInteiro'
import { renderSize } from '@/lib/design/formatos'
import { lerMarcaDaPeca } from '@/server/design/marca'
import {
  defaultGerarImagem,
  defaultBaixarReferencia,
  defaultUpload,
} from './gerarCriativo'
import type { EstudioPatch } from '@/lib/estudio/types'
import { classificarFalhaDaImagem, textoDaFalhaDaImagem } from '@/lib/design/falhaDaImagem'
import { encurtarComSufixo } from '@/lib/encurtarTitulo'
import { SUFIXO_AJUSTE } from '@/lib/design/legendaDaArte'

const IMAGE_MODEL = 'gpt-image-2'
const CALMA_INEXISTENTE = 'Não achei esse criativo.'

export const COPY_REMIX = {
  semVersao: 'Esse anúncio ainda não tem arte para ajustar. Gere as provas primeiro.',
  semVariacao: 'Esse criativo não tem variações para ajustar.',
  semPedido: 'Me diz o que mudar nessa arte e eu ajusto.',
  semImagem:
    'O arquivo dessa arte não está mais disponível, então não consigo ajustá-la. Peça uma revisão para gerar uma nova.',
  naoSaiu: 'Não consegui aplicar esse ajuste agora. Nada foi feito, então dá para tentar de novo.',
  ok: (titulo: string, pedido: string) =>
    `Ajustei "${titulo}": ${pedido}. A arte nova está no estúdio, ao lado da anterior.`,
} as const

export interface RemixarCriativoInput {
  pecaId: string
  
  pedido: string
  
  variacao?: number
}
export interface RemixarCriativoCtx {
  operatorId?: string
  actingAgentId?: string
  conversationId?: string | null
  taskId?: string | null
}
export interface RemixarCriativoResult { output: string; patch: EstudioPatch | null }

export interface RemixarCriativoDeps {
  gerarImagem?: typeof defaultGerarImagem
  baixarReferencia?: typeof defaultBaixarReferencia
  upload?: typeof defaultUpload
  createArtifact?: (input: CreateArtifactInput) => Promise<ArtifactRow>
  getPecaComVersoes?: typeof getPecaImpl
  appendVersao?: typeof appendVersaoImpl
  setPecaStatus?: typeof setPecaStatusImpl
  recordCost?: typeof recordCostImpl
  lerMarca?: typeof lerMarcaDaPeca
}

export async function remixarCriativo(
  input: RemixarCriativoInput,
  ctx: RemixarCriativoCtx,
  deps: RemixarCriativoDeps = {},
): Promise<RemixarCriativoResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }

  const render = deps.gerarImagem ?? defaultGerarImagem
  const baixar = deps.baixarReferencia ?? defaultBaixarReferencia
  const upload = deps.upload ?? defaultUpload
  const createArtifact = deps.createArtifact ?? createArtifactImpl
  const getPecaComVersoes = deps.getPecaComVersoes ?? getPecaImpl
  const appendVersao = deps.appendVersao ?? appendVersaoImpl
  const setPecaStatus = deps.setPecaStatus ?? setPecaStatusImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const lerMarca = deps.lerMarca ?? lerMarcaDaPeca
  const agentId = ctx.actingAgentId ?? 'designer'

  const pedido = input.pedido?.trim() ?? ''
  if (!pedido) return { output: COPY_REMIX.semPedido, patch: null }

  const peca = await getPecaComVersoes(input.pecaId)
  if (!peca) return { output: CALMA_INEXISTENTE, patch: null }
  
  if (peca.operator_id !== ctx.operatorId) return { output: CALMA_INEXISTENTE, patch: null }
  if (!peca.versoes.length) return { output: COPY_REMIX.semVersao, patch: null }

  const ultimaVersao = peca.versoes[peca.versoes.length - 1]!
  const view = toCriativoView(peca, ultimaVersao)
  const nVar = view.variacoes.length
  if (!nVar) return { output: COPY_REMIX.semVariacao, patch: null }

  const escolhidaDoVeredito = view.veredito.escolhida
  const idx = (input.variacao !== undefined && input.variacao >= 0 && input.variacao < nVar)
    ? input.variacao
    : ((escolhidaDoVeredito !== undefined && escolhidaDoVeredito >= 0 && escolhidaDoVeredito < nVar)
      ? escolhidaDoVeredito
      : 0)
  const base = view.variacoes[idx]
  if (!base) return { output: COPY_REMIX.semVariacao, patch: null }

  
  
  const bytes = await baixar(base.artifactId).catch(() => null)
  if (!bytes) return { output: COPY_REMIX.semImagem, patch: null }

  
  
  const quality = base.quality

  
  
  
  
  const nomeDaMarca = await lerMarca(
    { operatorId: ctx.operatorId, brandId: peca.brand_id },
    {},
  ).then((m) => m.nome?.trim() || '').catch(() => '')

  const prompt = promptRemix({
    pedido,
    alvo: { proporcao: alvoDoAnuncio(peca.formato).proporcao },
    
    
    temSuporte: !base.documento && !!(base.headline || base.subheadline || base.cta),
    ...(nomeDaMarca ? { marca: nomeDaMarca } : {}),
  })

  let base64: string
  let usage: { inputTokens?: number; outputTokens?: number }
  try {
    
    
    
    const r = await render({ prompt, size: renderSize(peca.formato), quality, referencia: bytes })
    base64 = r.base64
    usage = r.usage
  } catch (e) {
    console.error('[design/remixarCriativo] render falhou:', e)
    const motivo = classificarFalhaDaImagem(e)
    
    
    return { output: motivo ? textoDaFalhaDaImagem(motivo, 'esse ajuste') : COPY_REMIX.naoSaiu, patch: null }
  }

  
  
  try {
    await recordCost({
      kind: 'action', model: IMAGE_MODEL,
      promptTokens: usage.inputTokens ?? 0, completionTokens: usage.outputTokens ?? 0,
      tool: 'remixarCriativo', agent: agentId,
    })
  } catch {  }

  const hash = createHash('sha256').update(base64).digest('hex').slice(0, 16)
  const ref = await upload(`criativos/${ctx.conversationId ?? 'sem-conversa'}/${hash}.png`, base64)
  const artifact = await createArtifact({
    conversation_id: ctx.conversationId ?? null, task_id: ctx.taskId ?? null, agent_id: agentId,
    kind: 'imagem', title: encurtarComSufixo(peca.titulo, SUFIXO_AJUSTE, 80), storage_ref: ref,
  })

  
  
  const nova: VariacaoCriativo = {
    conceito: base.conceito,
    promptImagem: base.promptImagem,
    artifactId: artifact.id,
    size: renderSize(peca.formato),
    quality,
    remixDe: pedido,
    ...(base.framework ? { framework: base.framework } : {}),
    ...(base.headline ? { headline: base.headline } : {}),
    ...(base.subheadline ? { subheadline: base.subheadline } : {}),
    ...(base.cta ? { cta: base.cta } : {}),
    ...(base.arquetipo ? { arquetipo: base.arquetipo } : {}),
  }

  
  
  
  const anteriores = view.variacoes.filter((_, i) => i !== idx).map((v) => ({ ...v, final: false }))
  const versaoNova = await appendVersao(peca.id, {
    variacoes: [nova, { ...base, final: false }, ...anteriores] as never,
    veredito: { escolhida: 0, porque: `Ajuste pedido: ${pedido}` } as never,
    critica: {} as never,
    origemRevisao: pedido,
  })
  await setPecaStatus(peca.id, ctx.operatorId, 'revisao')

  const criativo = toCriativoView({ ...peca, status: 'revisao' as const }, versaoNova)
  return {
    output: COPY_REMIX.ok(peca.titulo || 'o anúncio', pedido),
    patch: { op: 'upsert', entidade: 'criativo', criativo },
  }
}
