import { recordCost } from '@/data/cost'
import { EXTRACTION_MAX_OUTPUT, EXTRACTION_MAX_OUTPUT_RETRY } from '@/lib/llm-tuning'
import { generateBackgroundVision, type BgTextResult } from '@/server/cost/backgroundLLM'

export interface ImageAdapterDeps {
  gen?: (args: { prompt: string; image: Uint8Array; mediaType: string; maxOutputTokens?: number }) => Promise<BgTextResult>
  record?: typeof recordCost
}


async function registrarCustoVisao(record: typeof recordCost, r: BgTextResult): Promise<void> {
  await record({
    kind: 'curator',
    model: r.model,
    promptTokens: r.usage.inputTokens ?? 0,
    completionTokens: r.usage.outputTokens ?? 0,
    cachedTokens: r.usage.cachedInputTokens ?? 0,
    agent: 'curador',
    tool: 'ocrImagem',
  })
}


export const PROMPT_IMAGEM_TABELA = `Você recebe UMA imagem (foto, print ou digitalização de um documento da empresa). Transcreva e organize TODO o conhecimento textual útil que estiver visível: textos, títulos, números, dados de identidade/oferta/processos/pessoas/tom. Se a imagem for TABELA, planilha ou print de dados, transcreva CÉLULA A CÉLULA preservando TODOS os números e rótulos (não resuma, não arredonde). Se for foto, diagrama ou logo, descreva o que se vê. NÃO invente nada que não esteja na imagem. Se não houver texto/conhecimento útil (ex.: foto puramente decorativa), responda com uma única linha em branco.`


export interface ImageAdapterOpts {
  
  prompt?: string
}


export async function extractImageText(bytes: Uint8Array, mime: string, deps?: ImageAdapterDeps, opts?: ImageAdapterOpts): Promise<string> {
  const gen = deps?.gen ?? generateBackgroundVision
  const record = deps?.record ?? recordCost
  const prompt = opts?.prompt ?? PROMPT_IMAGEM_TABELA
  const mediaType = mime || 'image/png'
  const r1 = await gen({ prompt, image: bytes, mediaType, maxOutputTokens: EXTRACTION_MAX_OUTPUT })
  await registrarCustoVisao(record, r1)

  if (r1.finishReason !== 'length') return (r1.text ?? '').trim()

  
  console.warn(`[ocrImagem] transcrição truncada (finishReason=length) — re-transcrevendo com cap maior (${EXTRACTION_MAX_OUTPUT_RETRY}).`)
  const r2 = await gen({ prompt, image: bytes, mediaType, maxOutputTokens: EXTRACTION_MAX_OUTPUT_RETRY })
  await registrarCustoVisao(record, r2)
  if (r2.finishReason === 'length') {
    console.warn(`[ocrImagem] transcrição AINDA truncada após retry — usando o que veio (cap ${EXTRACTION_MAX_OUTPUT_RETRY}).`)
  }
  return (r2.text ?? '').trim()
}
