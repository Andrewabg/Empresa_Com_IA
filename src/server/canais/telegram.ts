



import type { HttpDeps } from './types'
import { htmlParaPlain } from '@/lib/telegram/mdParaHtml'

export const TELEGRAM_MAX_CHARS = 4096
const API = 'https://api.telegram.org'

export type TgEvento =
  | { kind: 'texto'; updateId: number; chatId: string; texto: string }
  | { kind: 'voz'; updateId: number; chatId: string; fileId: string; mime: string }
  
  
  
  | { kind: 'foto'; updateId: number; chatId: string; fileId: string; mime?: string; caption?: string }
  | { kind: 'comando'; updateId: number; chatId: string; comando: string; args: string }
  | { kind: 'callback'; updateId: number; chatId: string; callbackId: string; data: string; messageId: number; messageText?: string }
  
  
  
  | { kind: 'nao_suportado'; updateId: number; chatId: string; caption?: string }
  | { kind: 'ignorado'; updateId: number }

export interface BotaoInline { texto: string; callbackData?: string; url?: string }
export interface SendOpts { teclado?: BotaoInline[][]; parseMode?: 'HTML' }
export type SendResultado = { ok: true; messageId: number } | { ok: false; erro: string }


export function parseUpdate(raw: unknown): TgEvento {
  const u = raw as { update_id?: number; message?: Record<string, unknown>; callback_query?: Record<string, unknown> }
  const updateId = typeof u?.update_id === 'number' ? u.update_id : -1
  const cb = u?.callback_query as { id?: string; data?: string; message?: { message_id?: number; chat?: { id?: number }; text?: string } } | undefined
  if (cb?.id && typeof cb.data === 'string' && cb.message?.chat?.id != null) {
    const messageText = typeof cb.message.text === 'string' ? cb.message.text : undefined
    return { kind: 'callback', updateId, chatId: String(cb.message.chat.id), callbackId: cb.id, data: cb.data, messageId: cb.message.message_id ?? 0, ...(messageText !== undefined ? { messageText } : {}) }
  }
  const m = u?.message as {
    chat?: { id?: number }; text?: string; caption?: string
    voice?: { file_id?: string; mime_type?: string }
    photo?: Array<{ file_id?: string }>
    document?: { file_id?: string; mime_type?: string }
    video?: unknown; sticker?: unknown; audio?: unknown
    video_note?: unknown; location?: unknown; contact?: unknown
  } | undefined
  const chatId = m?.chat?.id != null ? String(m.chat.id) : null
  if (chatId && m?.voice?.file_id) return { kind: 'voz', updateId, chatId, fileId: m.voice.file_id, mime: m.voice.mime_type ?? 'audio/ogg' }
  
  
  const fotoFileId = Array.isArray(m?.photo) && m.photo.length > 0 ? m.photo[m.photo.length - 1]?.file_id : undefined
  const docImagem = typeof m?.document?.mime_type === 'string' && m.document.mime_type.startsWith('image/') && m.document.file_id ? m.document : undefined
  if (chatId && (fotoFileId || docImagem)) {
    const caption = typeof m?.caption === 'string' ? m.caption : undefined
    return {
      kind: 'foto', updateId, chatId,
      fileId: (fotoFileId ?? docImagem!.file_id)!,
      ...(docImagem?.mime_type && !fotoFileId ? { mime: docImagem.mime_type } : {}),
      ...(caption !== undefined ? { caption } : {}),
    }
  }
  if (chatId && typeof m?.text === 'string') {
    if (m.text.startsWith('/')) {
      const [cmd, ...rest] = m.text.slice(1).split(/\s+/)
      return { kind: 'comando', updateId, chatId, comando: cmd.split('@')[0].toLowerCase(), args: rest.join(' ') }
    }
    return { kind: 'texto', updateId, chatId, texto: m.text }
  }
  
  
  if (chatId && (m?.photo || m?.document || m?.video || m?.video_note || m?.sticker || m?.audio || m?.location || m?.contact)) {
    const caption = typeof m?.caption === 'string' ? m.caption : undefined
    return { kind: 'nao_suportado', updateId, chatId, ...(caption !== undefined ? { caption } : {}) }
  }
  return { kind: 'ignorado', updateId }
}


export function splitTelegramText(texto: string): string[] {
  const t = texto.trimEnd()
  if (t.length === 0) return []
  if (t.length <= TELEGRAM_MAX_CHARS) return [t]
  const blocos: string[] = []
  let resto = t
  while (resto.length > TELEGRAM_MAX_CHARS) {
    const janela = resto.slice(0, TELEGRAM_MAX_CHARS)
    const corte = janela.lastIndexOf('\n')
    const fim = corte > 0 ? corte : TELEGRAM_MAX_CHARS
    blocos.push(resto.slice(0, fim))
    resto = resto.slice(corte > 0 ? fim + 1 : fim)
  }
  if (resto.length > 0) blocos.push(resto)
  return blocos
}

async function tgPost(token: string, method: string, body: Record<string, unknown>, deps?: HttpDeps, timeoutMs?: number): Promise<{ ok: boolean; result?: unknown; description?: string }> {
  const fetchFn = deps?.fetchFn ?? fetch
  try {
    const res = await fetchFn(`${API}/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      ...(timeoutMs !== undefined ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
    })
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; description?: string }
    if (!res.ok || !json.ok) return { ok: false, description: json.description ?? `HTTP ${res.status}` }
    return { ok: true, result: json.result }
  } catch (e) {
    return { ok: false, description: e instanceof Error ? e.message : String(e) }
  }
}

type BotaoTg = { text: string; callback_data: string } | { text: string; url: string }

function montarReplyMarkup(teclado: BotaoInline[][]): { inline_keyboard: BotaoTg[][] } {
  return {
    inline_keyboard: teclado.map((linha) => linha.map((b): BotaoTg => (b.url ? { text: b.texto, url: b.url } : { text: b.texto, callback_data: b.callbackData ?? '' }))),
  }
}



const RE_ERRO_PARSE = /can't parse|parse entities/i


export async function sendText(token: string, chatId: string, texto: string, opts?: SendOpts, deps?: HttpDeps): Promise<SendResultado> {
  const blocos = splitTelegramText(texto)
  if (blocos.length === 0) return { ok: false, erro: 'sem blocos' }
  let ultimo: { ok: boolean; result?: unknown; description?: string } = { ok: false, description: 'sem blocos' }
  for (let i = 0; i < blocos.length; i++) {
    const body: Record<string, unknown> = { chat_id: chatId, text: blocos[i] }
    if (opts?.parseMode) body.parse_mode = opts.parseMode
    if (opts?.teclado && i === blocos.length - 1) body.reply_markup = montarReplyMarkup(opts.teclado)
    ultimo = await tgPost(token, 'sendMessage', body, deps, 30_000) 
    if (!ultimo.ok && opts?.parseMode && RE_ERRO_PARSE.test(ultimo.description ?? '')) {
      const plain: Record<string, unknown> = { chat_id: chatId, text: htmlParaPlain(blocos[i]) }
      if (opts.teclado && i === blocos.length - 1) plain.reply_markup = montarReplyMarkup(opts.teclado)
      ultimo = await tgPost(token, 'sendMessage', plain, deps, 30_000)
    }
    if (!ultimo.ok) return { ok: false, erro: ultimo.description ?? 'sendMessage falhou' }
  }
  const mid = (ultimo.result as { message_id?: number })?.message_id ?? 0
  return { ok: true, messageId: mid }
}


export const TELEGRAM_CAPTION_MAX = 1024


export async function sendPhoto(token: string, chatId: string, photoUrl: string, caption?: string, deps?: HttpDeps): Promise<SendResultado> {
  let cap = caption
  let resto: string | undefined
  if (caption && caption.length > TELEGRAM_CAPTION_MAX) {
    cap = caption.slice(0, TELEGRAM_CAPTION_MAX)
    resto = caption.slice(TELEGRAM_CAPTION_MAX)
  }
  const r = await tgPost(token, 'sendPhoto', { chat_id: chatId, photo: photoUrl, ...(cap ? { caption: cap } : {}) }, deps, 30_000)
  if (!r.ok) return { ok: false, erro: r.description ?? 'sendPhoto falhou' }
  if (resto) await sendText(token, chatId, resto, undefined, deps)
  return { ok: true, messageId: (r.result as { message_id?: number })?.message_id ?? 0 }
}


export async function sendVoice(token: string, chatId: string, bytes: Uint8Array, deps?: HttpDeps): Promise<SendResultado> {
  const fetchFn = deps?.fetchFn ?? fetch
  try {
    const fd = new FormData()
    fd.append('chat_id', chatId)
    fd.append('voice', new Blob([Buffer.from(bytes)], { type: 'audio/ogg' }), 'voz.ogg')
    const res = await fetchFn(`${API}/bot${token}/sendVoice`, { method: 'POST', body: fd, signal: AbortSignal.timeout(60_000) })
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; description?: string }
    if (!res.ok || !json.ok) return { ok: false, erro: json.description ?? `HTTP ${res.status}` }
    return { ok: true, messageId: (json.result as { message_id?: number })?.message_id ?? 0 }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}


export async function sendDocument(
  token: string, chatId: string, bytes: Uint8Array, filename: string, caption?: string, deps?: HttpDeps,
): Promise<SendResultado> {
  const fetchFn = deps?.fetchFn ?? fetch
  try {
    const fd = new FormData()
    fd.append('chat_id', chatId)
    fd.append('document', new Blob([Buffer.from(bytes)]), filename)
    if (caption) fd.append('caption', caption)
    const res = await fetchFn(`${API}/bot${token}/sendDocument`, { method: 'POST', body: fd, signal: AbortSignal.timeout(60_000) })
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; description?: string }
    if (!res.ok || !json.ok) return { ok: false, erro: json.description ?? `HTTP ${res.status}` }
    return { ok: true, messageId: (json.result as { message_id?: number })?.message_id ?? 0 }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}


export async function getUpdates(
  token: string, offset: number, timeoutS: number, deps?: HttpDeps, limit = 100,
): Promise<{ updates: unknown[]; erro: string | null }> {
  const r = await tgPost(token, 'getUpdates', { offset, timeout: timeoutS, limit, allowed_updates: ['message', 'callback_query'] }, deps, (timeoutS + 15) * 1000)
  if (!r.ok) return { updates: [], erro: r.description ?? 'getUpdates falhou' }
  return { updates: Array.isArray(r.result) ? (r.result as unknown[]) : [], erro: null }
}


export async function deleteWebhook(token: string, deps?: HttpDeps): Promise<{ ok: boolean; erro: string | null }> {
  const r = await tgPost(token, 'deleteWebhook', { drop_pending_updates: false }, deps, 15_000)
  return { ok: r.ok, erro: r.ok ? null : (r.description ?? 'deleteWebhook falhou') }
}

export async function answerCallback(token: string, callbackId: string, texto?: string, deps?: HttpDeps): Promise<void> {
  const r = await tgPost(token, 'answerCallbackQuery', { callback_query_id: callbackId, ...(texto ? { text: texto } : {}) }, deps, 15_000)
  
  if (!r.ok) console.warn('[telegram] answerCallback falhou:', r.description)
}


export async function editMessageText(token: string, chatId: string, messageId: number, texto: string, opts?: { parseMode?: 'HTML' }, deps?: HttpDeps): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text: texto }
  if (opts?.parseMode) body.parse_mode = opts.parseMode
  let r = await tgPost(token, 'editMessageText', body, deps, 15_000)
  if (!r.ok && opts?.parseMode && RE_ERRO_PARSE.test(r.description ?? '')) {
    r = await tgPost(token, 'editMessageText', { chat_id: chatId, message_id: messageId, text: htmlParaPlain(texto) }, deps, 15_000)
  }
  if (!r.ok) console.warn(`[telegram] editMessageText falhou (chat=${chatId} mid=${messageId}):`, r.description)
}

export async function sendChatAction(token: string, chatId: string, deps?: HttpDeps): Promise<void> {
  await tgPost(token, 'sendChatAction', { chat_id: chatId, action: 'typing' }, deps)
}




const MIME_POR_EXT: Record<string, string> = {
  oga: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', pdf: 'application/pdf',
}


export async function getFileBytes(token: string, fileId: string, deps?: HttpDeps, mimeHint?: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const fetchFn = deps?.fetchFn ?? fetch
  const r = await tgPost(token, 'getFile', { file_id: fileId }, deps)
  const path = (r.result as { file_path?: string })?.file_path
  if (!r.ok || !path) return null
  try {
    const res = await fetchFn(`${API}/file/bot${token}/${path}`)
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    return { bytes: buf, mime: MIME_POR_EXT[ext] ?? mimeHint ?? 'application/octet-stream' }
  } catch { return null }
}


export async function setMyCommands(token: string, comandos: { command: string; description: string }[], deps?: HttpDeps): Promise<{ ok: true } | { ok: false; erro: string }> {
  const r = await tgPost(token, 'setMyCommands', { commands: comandos }, deps, 15_000)
  return r.ok ? { ok: true } : { ok: false, erro: r.description ?? 'setMyCommands falhou' }
}


export async function getMe(token: string, deps?: HttpDeps): Promise<{ ok: true; username: string } | { ok: false; detail: string }> {
  const r = await tgPost(token, 'getMe', {}, deps)
  if (!r.ok) return { ok: false, detail: r.description ?? 'getMe falhou' }
  return { ok: true, username: (r.result as { username?: string })?.username ?? '' }
}
