

import { serverDb } from '@/server/supabase'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { baixarMidia } from './dispatch'
import type { MensagemExternaRow } from '@/data/mensagensExternas'
import { recordCost as recordCostImpl, type RecordCostInput } from '@/data/cost'
import { getConversa } from '@/data/conversasExternas'
import { getCanal, type CanalRow } from '@/data/canais'
import { agenteDaConversa } from '@/lib/canais/agenteDaConversa'
import { avaliarMidiaInbound } from '@/lib/canais/midiaCaps'
import { TIMEOUT_ENVIO_ARQUIVO_MS } from '@/lib/canais/prazoDeEnvio'

export const BUCKET_MIDIA = 'atendimento-midia'


const MODELO_VISAO = 'gpt-5.1'

const CAP_TEXTO_DOC = 6000

function extDoMime(mime: string): string {
  const m: Record<string, string> = {
    'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'video/mp4': 'mp4', 'application/pdf': 'pdf',
  }
  
  const base = mime.split(';')[0].trim()
  return m[base] ?? 'bin'
}


export function extensaoDeAudio(mime: string): string {
  const base = mime.split(';')[0].trim().toLowerCase()
  const m: Record<string, string> = {
    'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3',
    'audio/mp4': 'mp4', 'audio/m4a': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
  }
  return m[base] ?? 'webm'
}

export interface IngerirMidiaDeps {
  
  download: (canal: CanalRow, ref: string) => Promise<{ bytes: Uint8Array; mime: string } | null>
  upload: (path: string, bytes: Uint8Array, mime: string) => Promise<{ path: string } | null>
  setMidia: (msgId: string, midia: MensagemExternaRow['midia']) => Promise<void>
  
  resolveCanal?: (conversaId: string) => Promise<CanalRow | null>
  
  resolveConversaAgente?: (conversaId: string) => Promise<string | null>
  descreverImagem?: typeof descreverImagem
  extrairDocumento?: typeof extrairDocumento
}


function textoDaDescricao(d: DescricaoImagem): string {
  const base = `[imagem recebida] ${d.descricao}`
  if (!d.campos_ilegiveis.length) return base
  return `${base}\n[não deu pra ler com certeza: ${d.campos_ilegiveis.join(', ')} — confirme com o cliente antes de usar]`
}

async function defaultResolveConversaAgente(conversaId: string): Promise<string | null> {
  try {
    return (await getConversa(conversaId))?.agent_id ?? null
  } catch {
    return null
  }
}

async function defaultResolveCanal(conversaId: string): Promise<CanalRow | null> {
  try {
    const conversa = await getConversa(conversaId)
    if (!conversa) return null
    return (await getCanal(conversa.canal_id)) ?? null
  } catch {
    return null
  }
}


export async function comTeto<T>(promessa: PromiseLike<T>, ms: number): Promise<T | { data: null; error: { message: string } }> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promessa,
      new Promise<{ data: null; error: { message: string } }>((r) => {
        timer = setTimeout(() => r({ data: null, error: { message: 'leitura do arquivo demorou demais' } }), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}


export async function baixarDoBucket(bucket: string, path: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const { data, error } = await comTeto(
      serverDb().storage.from(bucket || BUCKET_MIDIA).download(path),
      TIMEOUT_ENVIO_ARQUIVO_MS,
    )
    if (error || !data) {
      console.warn('[canais/media] download do bucket falhou:', error?.message ?? 'vazio')
      return null
    }
    return { bytes: new Uint8Array(await data.arrayBuffer()), mime: data.type || 'application/octet-stream' }
  } catch (err) {
    console.warn('[canais/media] download do bucket lançou:', err)
    return null
  }
}

const defaults = (): IngerirMidiaDeps => ({
  download: (canal, ref) => baixarMidia(canal, ref),
  upload: async (path, bytes, mime) => {
    const { error } = await serverDb().storage.from(BUCKET_MIDIA).upload(path, Buffer.from(bytes), { contentType: mime, upsert: true })
    if (error) { console.warn('[canais/media] upload falhou:', error.message); return null }
    return { path }
  },
  setMidia: async (msgId, midia) => {
    
    const { error } = await serverDb().from('mensagens_externas').update({ midia }).eq('id', msgId)
    if (error) throw new Error(`setMidia: ${error.message}`)
  },
  resolveCanal: defaultResolveCanal,
})

export async function ingerirMidia(
  msg: Pick<MensagemExternaRow, 'id' | 'conversa_id' | 'midia'>,
  deps: IngerirMidiaDeps = defaults(),
): Promise<void> {
  const midia = msg.midia
  if (!midia?.media_id) return
  
  
  let gravada: NonNullable<MensagemExternaRow['midia']> = midia
  
  
  
  const desistir = async () => {
    try {
      await deps.setMidia(msg.id, { ...gravada, ingestao: 'falhou' })
    } catch (err) {
      console.warn('[canais/media] não consegui marcar a mídia como não lida:', err)
    }
  }
  try {
    
    const canal = await (deps.resolveCanal ?? defaultResolveCanal)(msg.conversa_id)
    if (!canal) return await desistir()
    const bin = await deps.download(canal, midia.media_id)
    if (!bin) return await desistir()
    const path = `${msg.conversa_id}/${msg.id}.${extDoMime(bin.mime)}`
    const up = await deps.upload(path, bin.bytes, bin.mime)
    if (!up) return await desistir()
    const comArquivo = { ...midia, mime: bin.mime, storage_path: up.path }
    await deps.setMidia(msg.id, comArquivo)
    gravada = comArquivo

    
    const veredicto = avaliarMidiaInbound({ mime: bin.mime, bytes: bin.bytes.length, kind: midia.kind })
    if (!veredicto.ok) {
      
      
      await deps.setMidia(msg.id, { ...midia, mime: bin.mime, storage_path: up.path, ingestao: 'falhou', descricao: veredicto.legenda })
      return
    }

    
    const daConversa = await (deps.resolveConversaAgente ?? defaultResolveConversaAgente)(msg.conversa_id)
    const agentId = agenteDaConversa(daConversa, canal.agent_id) || undefined

    if (veredicto.modo === 'transcricao') {
      
      const texto = await transcreverAudio(msg, bin.bytes, agentId)
      if (!texto) await desistir()
      return
    }
    if (veredicto.modo === 'visao') {
      
      
      const d = await (deps.descreverImagem ?? descreverImagem)(bin.bytes, bin.mime, { detalhe: veredicto.detalhe, agentId })
      await deps.setMidia(msg.id, {
        ...midia, mime: bin.mime, storage_path: up.path,
        ...(d ? { descricao: textoDaDescricao(d), ingestao: 'ok' as const } : { ingestao: 'falhou' as const }),
      })
      return
    }
    if (veredicto.modo === 'documento') {
      const texto = await (deps.extrairDocumento ?? extrairDocumento)(bin.bytes, bin.mime)
      await deps.setMidia(msg.id, {
        ...midia, mime: bin.mime, storage_path: up.path,
        ...(texto ? { descricao: `[documento recebido] ${texto}`, ingestao: 'ok' as const } : { ingestao: 'falhou' as const }),
      })
    }
  } catch (err) {
    console.warn('[canais/media] ingestão falhou (placeholder fica):', err)
    await desistir()
  }
}




export function estimarTokensAudio(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0
  return Math.ceil(bytes / 200)
}

export type TranscribeResult = { text: string; usage?: Record<string, number> | null }

export interface TranscreverAudioDeps {
  transcribe?: (params: { bytes: Uint8Array; mime: string }) => Promise<TranscribeResult>
  setMidia?: (msgId: string, midia: NonNullable<MensagemExternaRow['midia']>) => Promise<void>
  recordCost?: (input: RecordCostInput) => Promise<void>
}

export async function transcribeBytes({ bytes, mime }: { bytes: Uint8Array; mime: string }): Promise<TranscribeResult> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new Error('transcreverAudio: openai_api_key não configurada')
  const fd = new FormData()
  
  const ext = extensaoDeAudio(mime)
  fd.append('file', new Blob([Buffer.from(bytes)], { type: mime.split(';')[0].trim() }), `audio.${ext}`)
  fd.append('model', 'gpt-4o-transcribe')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`transcreverAudio: HTTP ${res.status} ${txt}`)
  }
  return res.json() as Promise<TranscribeResult>
}




const VOZES_TTS = new Set(['alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'fable', 'marin', 'nova', 'onyx', 'sage', 'shimmer', 'verse'])


const VOZ_TTS_PADRAO = 'cedar'


const INSTRUCAO_DE_FALA =
  'Fale em português do Brasil, sempre, do início ao fim. ' +
  'Tom de conversa natural e direta, ritmo normal, sem entonação de locutor. ' +
  'Pronuncie números, siglas e valores em português.'


export function vozTtsSuportada(voz?: string | null): boolean {
  return !!voz && VOZES_TTS.has(voz)
}


export function vozTts(vozRealtime?: string | null): string {
  return vozTtsSuportada(vozRealtime) ? (vozRealtime as string) : VOZ_TTS_PADRAO
}


export function estimarTokensTexto(texto: string): number {
  if (!texto) return 0
  return Math.ceil(texto.length / 4)
}


export async function sintetizarVoz(texto: string, voz?: string | null): Promise<{ bytes: Uint8Array; mime: string }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new Error('sintetizarVoz: openai_api_key não configurada')
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      
      
      voice: vozTts(voz ?? process.env.OPENAI_REALTIME_VOICE),
      input: texto,
      
      
      
      instructions: INSTRUCAO_DE_FALA,
      response_format: 'opus',
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`sintetizarVoz: HTTP ${res.status} ${txt}`)
  }
  return { bytes: new Uint8Array(await res.arrayBuffer()), mime: 'audio/ogg' }
}



export interface DescricaoImagem {
  descricao: string
  
  campos_ilegiveis: string[]
}


const PROMPT_VISAO = `Descreva objetivamente esta imagem para um atendente de WhatsApp que NÃO pode vê-la.

Regras:
- Diga o que a imagem É (print de erro, foto de produto, comprovante, documento, etiqueta, print de conversa) e o que ela mostra.
- Transcreva TEXTO visível que importe para o atendimento.
- NÚMEROS (valor, código, CPF, pedido, rastreio, data): só transcreva se estiver NÍTIDO. Se houver qualquer dúvida sobre um dígito, NÃO adivinhe: deixe o campo fora da descrição e liste-o em campos_ilegiveis.
- Não interprete intenção nem invente contexto que não está na imagem.
- Português do Brasil, no máximo 120 palavras.`

export interface DescreverImagemDeps {
  gerar?: (input: { bytes: Uint8Array; mime: string; detalhe: 'low' | 'high' }) => Promise<{
    objeto: DescricaoImagem; model: string; inputTokens: number; outputTokens: number
  }>
  recordCost?: (input: RecordCostInput) => Promise<void>
}


async function gerarVisaoOpenAI(input: { bytes: Uint8Array; mime: string; detalhe: 'low' | 'high' }) {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new Error('descreverImagem: openai_api_key não configurada')
  const b64 = Buffer.from(input.bytes).toString('base64')
  const mimeBase = input.mime.split(';')[0].trim()
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELO_VISAO,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: PROMPT_VISAO },
          { type: 'input_image', image_url: `data:${mimeBase};base64,${b64}`, detail: input.detalhe },
        ],
      }],
      text: {
        format: {
          type: 'json_schema', name: 'descricao_imagem', strict: true,
          schema: {
            type: 'object', additionalProperties: false,
            required: ['descricao', 'campos_ilegiveis'],
            properties: {
              descricao: { type: 'string' },
              campos_ilegiveis: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`descreverImagem: HTTP ${res.status} ${txt}`)
  }
  const j = (await res.json()) as {
    output_text?: string
    output?: Array<{ content?: Array<{ text?: string }> }>
    usage?: { input_tokens?: number; output_tokens?: number }
    model?: string
  }
  const bruto = j.output_text ?? j.output?.[0]?.content?.[0]?.text ?? ''
  const objeto = JSON.parse(bruto) as DescricaoImagem
  return {
    objeto,
    model: j.model ?? MODELO_VISAO,
    inputTokens: j.usage?.input_tokens ?? 0,
    outputTokens: j.usage?.output_tokens ?? 0,
  }
}

export async function descreverImagem(
  bytes: Uint8Array,
  mime: string,
  opts: { detalhe?: 'low' | 'high'; agentId?: string } = {},
  deps: DescreverImagemDeps = {},
): Promise<DescricaoImagem | null> {
  const gerar = deps.gerar ?? gerarVisaoOpenAI
  const recordCostFn = deps.recordCost ?? recordCostImpl
  try {
    const r = await gerar({ bytes, mime, detalhe: opts.detalhe ?? 'high' })
    try {
      await recordCostFn({
        kind: 'chat', model: r.model,
        promptTokens: r.inputTokens, completionTokens: r.outputTokens,
        tool: 'descreverImagem', agent: opts.agentId,
      })
    } catch {  }
    const descricao = (r.objeto?.descricao ?? '').trim()
    if (!descricao) return null
    return { descricao, campos_ilegiveis: r.objeto?.campos_ilegiveis ?? [] }
  } catch (err) {
    console.warn('[canais/media] visão falhou:', err)
    return null
  }
}



export interface ExtrairDocumentoDeps {
  extrair?: (bytes: Uint8Array, mime: string) => Promise<string>
}


async function extrairPadrao(bytes: Uint8Array, mime: string): Promise<string> {
  if (mime.split(';')[0].trim() === 'application/pdf') {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const doc = await getDocumentProxy(new Uint8Array(bytes))
    const { text } = await extractText(doc, { mergePages: true })
    return Array.isArray(text) ? text.join('\n') : String(text ?? '')
  }
  
  return ''
}


export async function extrairDocumento(
  bytes: Uint8Array,
  mime: string,
  opts: { maxChars?: number } = {},
  deps: ExtrairDocumentoDeps = {},
): Promise<string | null> {
  const maxChars = opts.maxChars ?? CAP_TEXTO_DOC
  try {
    const bruto = await (deps.extrair ?? extrairPadrao)(bytes, mime)
    const limpo = (bruto ?? '').replace(/\s+\n/g, '\n').trim()
    if (!limpo) return null
    return limpo.length > maxChars ? `${limpo.slice(0, maxChars)}\n[…documento truncado]` : limpo
  } catch (err) {
    console.warn('[canais/media] extração de documento falhou:', err)
    return null
  }
}


async function defaultSetMidiaTranscricao(
  msgId: string,
  midia: NonNullable<MensagemExternaRow['midia']>,
): Promise<void> {
  const { data } = await serverDb()
    .from('mensagens_externas')
    .select('midia')
    .eq('id', msgId)
    .maybeSingle()
  const atual = (data as { midia: MensagemExternaRow['midia'] } | null)?.midia ?? {}
  const merged = { ...atual, transcricao: midia.transcricao }
  const { error } = await serverDb()
    .from('mensagens_externas')
    .update({ midia: merged })
    .eq('id', msgId)
  if (error) throw new Error(`setMidiaTranscricao: ${error.message}`)
}


export async function transcreverAudio(
  msg: Pick<MensagemExternaRow, 'id' | 'conversa_id' | 'midia'>,
  bytes: Uint8Array,
  agentId?: string,
  deps: TranscreverAudioDeps = {},
): Promise<string | null> {
  const mime = msg.midia?.mime ?? 'audio/ogg'
  const transcribeFn = deps.transcribe ?? transcribeBytes
  const setMidiaFn = deps.setMidia ?? defaultSetMidiaTranscricao
  const recordCostFn = deps.recordCost ?? recordCostImpl
  try {
    const result = await transcribeFn({ bytes, mime })
    const transcricao = result.text
    const u = result.usage ?? {}
    
    
    const promptTokens = u['input_tokens'] ?? u['prompt_tokens'] ?? estimarTokensAudio(bytes.length)
    const completionTokens = u['output_tokens'] ?? 0
    
    const midiaAtualizada = { ...(msg.midia ?? { kind: 'audio' }), transcricao } as NonNullable<MensagemExternaRow['midia']>
    await setMidiaFn(msg.id, midiaAtualizada)
    
    
    
    try {
      await recordCostFn({
        kind: 'chat',
        model: 'gpt-4o-transcribe',
        promptTokens,
        completionTokens,
        tool: 'transcreverAudio',
        agent: agentId,
      })
    } catch (err) {
      console.warn('[canais/media] custo da transcrição não registrado:', err)
    }
    return transcricao
  } catch (err) {
    console.warn('[canais/media] transcrição falhou:', err)
    return null
  }
}
