
import { z } from 'zod'
import { chunkSmart } from '@/lib/imports/chunkSmart'
import { generateBackgroundObject, type BgUsage } from '@/server/cost/backgroundLLM'
import { recordCost } from '@/data/cost'
import { EXTRACTION_MAX_OUTPUT, EXTRACTION_MAX_OUTPUT_RETRY } from '@/lib/llm-tuning'
import { dedupFatos, contentHashDeTexto, type FatoBruto } from '@/lib/imports/dedup'
import { CHUNK_MAX_CHARS } from '@/lib/imports/chunking'





export interface FatoDestilado {
  titulo: string
  corpo: string
  tipo: string
  tags: string[]
  
  sourceHash?: string
}

export interface DistillDeps {
  gen?: (args: { schema: unknown; prompt: string; maxOutputTokens?: number; reasoningEffort?: string }) => Promise<{ object: unknown; usage: BgUsage; model: string; finishReason?: string }>
  record?: typeof recordCost
}














const ChunkSchema = z.object({
  titulo: z.string(),
  corpo: z.string(),
  tags: z.array(z.string()),
  
  temFatoProprio: z.boolean(),
})






export interface ChunkContext {
  
  docSummary?: string
  
  prevContext?: string
}


export function buildPrompt(
  chunk: string,
  filename: string,
  context?: string,
  cc?: ChunkContext,
): string {
  
  
  const docBloco = cc?.docSummary?.trim()
    ? `\nSOBRE O DOCUMENTO (contexto): ${cc.docSummary.trim()} Use para resolver referências e situar o trecho — mas a NOTA sai SOMENTE do trecho abaixo, nunca deste resumo.\n`
    : ''
  
  
  const lente = context?.trim()
    ? `\nO dono destacou: "${context.trim()}". Use como PRIORIDADE (não como filtro): garanta a captura do que se relaciona a isso, mas continue extraindo TAMBÉM todo o resto de conhecimento empresarial do trecho.\n`
    : ''
  
  
  const janela = cc?.prevContext?.trim()
    ? `\nCONTEXTO ANTERIOR (só para resolver referências — NÃO extraia fatos daqui): ${cc.prevContext.trim()}\n`
    : ''
  return `Você é um extrator de conhecimento empresarial de ALTA FIDELIDADE. Analise o trecho abaixo (do arquivo "${filename}"). Sua meta é PRESERVAR toda informação verificável do trecho — não resumir a ponto de perder dado. Preserve LITERALMENTE cada número, valor, preço, data, prazo, percentual, nome próprio, cargo, condição e EXCEÇÃO presente no trecho NA NOTA (não arredonde, não parafraseie o valor).

FIDELIDADE (anti-alucinação): NUNCA infira, estime, complete ou invente. Tudo na nota deve estar sustentado LITERALMENTE pelo trecho. Se algo está ambíguo ou incompleto, registre a parte que dá para sustentar ou OMITA — nunca fabrique. Proibido placeholder/"a definir"/"completar depois". Conteúdo inventado é PIOR que conteúdo faltante.

GUARDAR: identidade/oferta/processos/políticas/pessoas/tom/decisões/números estruturais.
DESCARTAR: boilerplate, rodapé, conteúdo transitório, repetição. (Não use "genérico" como desculpa para perder um número, valor ou condição — na dúvida, guarde.)

AUTO-CONTIDO — a nota deve ser compreensível sozinha. Resolva as referências: "a empresa" → o nome real; "ele/ela" → a pessoa; "esse plano" → o plano nomeado. Se o referente NÃO está no trecho, OMITA a informação em vez de adivinhar quem é.
  RUIM: "O valor dele é R$1.200." (referente perdido)
  BOM: "O plano Pro custa R$1.200/mês." (e se o nome do plano não aparece no trecho, não afirme sobre ele)

Sintetize ESTE trecho (uma seção do documento) em UMA nota ÚNICA, coesa e auto-contida. NÃO atomize em vários fatos; NÃO invente. \`titulo\` = o nome/tema da seção; \`corpo\` = a síntese fiel (preserve todos os números e condições).

Inclua de 1 a 3 tags curtas em minúsculas (ex.: "oferta", "processo", "tom-de-voz"). Sem tags relevantes, use array vazio.

JULGAMENTO (temFatoProprio): avalie pelo CORPO da seção (não pelo título nem pelo breadcrumb). TRUE exige um dado CONCRETO E VERIFICÁVEL no corpo: um número, valor, preço, data, prazo, nome próprio, política, condição, decisão ou passo específico. Marque FALSE quando o corpo NÃO traz nenhum desses e apenas ANUNCIA, INTRODUZ ou descreve o OBJETIVO ou o ROTEIRO do que vem em OUTRAS seções, ou diz que os detalhes ou passos estão adiante, ainda que a frase soe descritiva. Exemplos de FALSE: título "Checklist de Implementação de 30 Dias" com corpo "Roteiro para tirar o projeto do papel; os detalhes de cada etapa estão nas seções seguintes"; ou "Este capítulo cobre o processo de onboarding". Exemplos de TRUE, fato concreto mesmo curto: um CNPJ da empresa, um preço como R$ 1.200, um prazo de 7 dias. Rodapé, aviso legal, copyright e boilerplate são FALSE mesmo que contenham um número, endereço ou CNPJ, pois não são fato próprio do negócio. Na dúvida entre um fato curto e uma frase genérica ou introdutória, marque TRUE apenas se houver um dado concreto no corpo; caso contrário FALSE.
${docBloco}${lente}${janela}
Trecho:
---
${chunk}
---

Responda com a NOTA (titulo, corpo, tags, temFatoProprio) no formato solicitado.`
}






export interface DistillContextOpts {
  docSummary?: string
  
  prevTails?: string[]
}


type FatosDoChunk = Array<{ titulo: string; corpo: string; tags: string[] }>


type GenFn = typeof generateBackgroundObject | NonNullable<DistillDeps['gen']>
type RecordFn = typeof recordCost


async function registrarCusto(
  record: RecordFn,
  r: { model: string; usage: BgUsage },
): Promise<void> {
  await record({
    kind: 'curator',
    model: r.model,
    promptTokens: r.usage.inputTokens ?? 0,
    completionTokens: r.usage.outputTokens ?? 0,
    cachedTokens: r.usage.cachedInputTokens ?? 0,
    agent: 'curador',
    tool: 'destilarDocumento',
  })
}



async function chamarGen(
  gen: GenFn,
  record: RecordFn,
  prompt: string,
  cap: number,
): Promise<{ fatos: FatosDoChunk | null; truncou: boolean; erro?: string }> {
  try {
    const r = await gen({ schema: ChunkSchema, prompt, maxOutputTokens: cap, reasoningEffort: 'low' })
    await registrarCusto(record, r)
    const parsed = ChunkSchema.safeParse(r.object)
    
    
    if (parsed.success) {
      
      
      
      if (!parsed.data.temFatoProprio) return { fatos: [], truncou: false }
      
      
      const { titulo, corpo, tags } = parsed.data
      return { fatos: [{ titulo, corpo, tags }], truncou: r.finishReason === 'length' }
    }
    return { fatos: null, truncou: r.finishReason === 'length', erro: `parse: ${parsed.error.message.slice(0, 80)}` }
  } catch (e) {
    const usage = (e as { usage?: BgUsage } | undefined)?.usage
    if (usage) await registrarCusto(record, { model: 'gpt-5-mini', usage }).catch(() => {})
    return { fatos: null, truncou: true, erro: `throw: ${String((e as Error)?.message ?? e).slice(0, 80)}` }
  }
}

async function extrairFatosDoChunk(args: {
  gen: GenFn
  record: RecordFn
  prompt: string
  filename: string
  chunk: string
}): Promise<FatosDoChunk> {
  const { gen, record, prompt, filename, chunk } = args
  const prefixo = chunk.slice(0, 80).replace(/\s+/g, ' ')

  
  const a = await chamarGen(gen, record, prompt, EXTRACTION_MAX_OUTPUT)
  
  if (a.fatos && !a.truncou) return a.fatos

  
  console.warn(`[destilador] 1ª extração não-limpa em "${filename}" (${a.erro ?? 'finishReason=length'}) — re-extraindo com cap ${EXTRACTION_MAX_OUTPUT_RETRY}. Trecho: "${prefixo}…"`)

  
  const b = await chamarGen(gen, record, prompt, EXTRACTION_MAX_OUTPUT_RETRY)
  if (b.fatos) {
    if (b.truncou) {
      console.warn(`[destilador] chunk AINDA truncado após retry em "${filename}" — usando o que veio (cap ${EXTRACTION_MAX_OUTPUT_RETRY}). Trecho: "${prefixo}…"`)
    }
    return b.fatos
  }

  
  
  console.warn(`[destilador] extração falhou após retry em "${filename}" (${b.erro ?? '?'}) — ${a.fatos ? 'usando a 1ª (truncada)' : 'descartando o chunk'}. Trecho: "${prefixo}…"`)
  return a.fatos ?? []
}


export async function destilarChunks(
  chunks: string[],
  ctx: { filename: string; context?: string },
  deps?: DistillDeps,
  opts?: DistillContextOpts,
): Promise<FatoDestilado[]> {
  const gen = deps?.gen ?? generateBackgroundObject
  const record = deps?.record ?? recordCost

  
  const allFatos: FatoBruto[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    if (!chunk.trim()) continue

    
    const cc: ChunkContext | undefined = (opts?.docSummary || opts?.prevTails)
      ? { docSummary: opts?.docSummary, prevContext: opts?.prevTails?.[i] }
      : undefined
    const prompt = buildPrompt(chunk, ctx.filename, ctx.context, cc)

    
    
    const fatos = await extrairFatosDoChunk({ gen, record, prompt, filename: ctx.filename, chunk })
    
    
    const sourceHash = contentHashDeTexto(chunk)
    for (const f of fatos) allFatos.push({ ...f, sourceHash })
  }

  
  const deduped = dedupFatos(allFatos)

  
  return deduped.map((f) => ({
    titulo: f.titulo,
    corpo: f.corpo,
    tipo: f.tipo ?? 'semantic',
    tags: f.tags ?? [],
    sourceHash: f.sourceHash,
  }))
}


export async function destilarDocumento(
  text: string,
  ctx: { filename: string; context?: string },
  deps?: DistillDeps,
): Promise<FatoDestilado[]> {
  return destilarChunks(chunkSmart(text, { maxChars: CHUNK_MAX_CHARS }), ctx, deps)
}
