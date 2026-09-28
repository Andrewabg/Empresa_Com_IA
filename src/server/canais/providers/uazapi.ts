



import { mdParaWhatsapp } from '@/lib/whatsapp/mdParaWhatsapp'
import { splitMensagem } from '@/lib/canais/splitMensagem'
import { normalizarTelefone } from '@/lib/canais/telefone'
import { classificarErroMeta, classificarFalhaDeTransporte } from '@/lib/canais/erroMeta'
import type { CanalAdapter, CanalEvent, EnvioResultado, EnvioFalha, HttpDeps, CanalCreds, MidiaSaida } from '../types'
import { prazoDoEnvio, TIMEOUT_ENVIO_ARQUIVO_MS } from '@/lib/canais/prazoDeEnvio'



export const UAZAPI_MAX_CHARS = 4000


interface UazapiMediaContent { URL?: string; mimetype?: string; caption?: string }
interface UazapiMessage {
  messageid?: string
  fromMe?: boolean
  messageType?: string
  mediaType?: string
  text?: string
  content?: string | UazapiMediaContent
  chatid?: string
  sender_pn?: string
  senderName?: string
  messageTimestamp?: number
}
interface UazapiUpdateEvent { MessageIDs?: string[]; Type?: string }
interface UazapiInstance { name?: string; status?: string }
interface UazapiEnvelope {
  EventType?: string
  instanceName?: string
  message?: UazapiMessage
  event?: UazapiUpdateEvent
  instance?: UazapiInstance
}


function mapKind(mediaType: string | undefined): string {
  switch (mediaType) {
    case 'ptt':
    case 'audio': return 'audio'
    case 'image': return 'image'
    case 'video': return 'video'
    case 'document': return 'document'
    default: return mediaType ?? 'document'
  }
}


function mapAck(type: string | undefined): 'sent' | 'delivered' | 'read' | 'failed' | null {
  switch (type) {
    case 'Delivered': return 'delivered'
    case 'Read': return 'read'
    case 'Sent': return 'sent'
    case 'Failed': return 'failed'
    default: return null
  }
}


function isoTimestamp(ms: number | undefined): string {
  if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString()
  return new Date().toISOString()
}


async function uazapiFalha(res: Response): Promise<EnvioFalha> {
  let mensagem = `HTTP ${res.status}`
  try {
    const j = (await res.json()) as { error?: string; message?: string }
    mensagem = j?.error ?? j?.message ?? mensagem
  } catch {  }
  const c = classificarErroMeta({
    httpStatus: res.status,
    retryAfterHeader: res.headers?.get?.('retry-after') ?? null,
    mensagem,
  })
  return { ok: false, erro: c.legenda, codigo: null, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
}

function parseMensagem(env: UazapiEnvelope, canalExternalId: string): CanalEvent | null {
  const m = env.message
  if (!m || !m.messageid) return null
  const fromMe = m.fromMe === true
  
  
  
  const contatoRaw = fromMe ? m.chatid : (m.sender_pn ?? m.chatid)
  const externalIdContato = normalizarTelefone(contatoRaw)
  
  if (!externalIdContato) return null

  const content = typeof m.content === 'object' && m.content !== null ? m.content : undefined
  const midia = m.mediaType
    ? { kind: mapKind(m.mediaType), media_id: m.messageid, mime: content?.mimetype }
    : null

  
  
  
  
  
  
  const senderName = m.senderName ?? ''

  return {
    kind: 'mensagem',
    canalExternalId,
    origem: fromMe ? 'proprio' : 'contato',
    contato: { externalId: externalIdContato, nome: fromMe ? '' : senderName },
    ...(fromMe && senderName ? { perfilProprio: senderName } : {}),
    externalId: m.messageid,
    timestamp: isoTimestamp(m.messageTimestamp),
    texto: m.text ?? '',
    midia,
  }
}

export const uazapiAdapter = {
  
  
  
  
  
  
  
  
  capabilities: { janela24h: false, markRead: true, conexaoPareada: true, typing: false, enviaMidia: true, enviaInterativo: false },
  prepararTexto(texto: string): string[] {
    return splitMensagem(mdParaWhatsapp(texto), UAZAPI_MAX_CHARS)
  },

  parseInbound(rawBody: string): CanalEvent[] {
    let env: UazapiEnvelope
    try { env = JSON.parse(rawBody) as UazapiEnvelope } catch { return [] }
    
    const canalExternalId = env.instanceName ?? ''

    if (env.EventType === 'messages') {
      const ev = parseMensagem(env, canalExternalId)
      return ev ? [ev] : []
    }
    if (env.EventType === 'messages_update') {
      const status = mapAck(env.event?.Type)
      const ids = env.event?.MessageIDs
      if (!status || !Array.isArray(ids)) return []
      
      
      return ids
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .map((id) => ({ kind: 'status', canalExternalId, externalId: id, status }))
    }
    if (env.EventType === 'connection') {
      const estado = env.instance?.status === 'connected' ? 'pareado' : 'desconectado'
      return [{ kind: 'conexao', canalExternalId, estado }]
    }
    return []
  },

  async sendText(_canalExternalId: string, paraExternalId: string, texto: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<EnvioResultado | EnvioFalha> {
    const fetchFn = deps.fetchFn ?? fetch
    
    
    const pedacos = splitMensagem(mdParaWhatsapp(texto), UAZAPI_MAX_CHARS)
    if (pedacos.length === 0) return { ok: false, erro: 'texto vazio' }
    
    
    let ultimoId = ''
    
    
    const signal = deps.signal ?? prazoDoEnvio()
    for (const pedaco of pedacos) {
      try {
        const res = await fetchFn(`${creds.serverUrl}/send/text`, {
          method: 'POST',
          headers: { token: creds.instanceToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: paraExternalId, text: pedaco }),
          signal,
        })
        if (!res.ok) return await uazapiFalha(res)
        const j = (await res.json()) as { messageid?: string }
        
        if (!j?.messageid) return { ok: false, erro: 'O servidor UAZAPI respondeu sem o id da mensagem.', codigo: null, retryable: false, acao: 'dead' }
        ultimoId = j.messageid
      } catch (err) {
        const c = classificarFalhaDeTransporte(err)
        return { ok: false, erro: c.legenda, codigo: null, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
      }
    }
    return { ok: true, externalId: ultimoId }
  },

  
  async sendMedia(_canalExternalId: string, paraExternalId: string, m: MidiaSaida, creds: CanalCreds, deps: HttpDeps = {}): Promise<EnvioResultado | EnvioFalha> {
    const fetchFn = deps.fetchFn ?? fetch
    const tipo = m.tipo === 'imagem' ? 'image'
      : m.tipo === 'audio' ? (m.voz ? 'ptt' : 'audio')
      : m.tipo === 'video' ? 'video'
      : 'document'
    try {
      const res = await fetchFn(`${creds.serverUrl}/send/media`, {
        method: 'POST',
        headers: { token: creds.instanceToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: paraExternalId,
          type: tipo,
          file: Buffer.from(m.bytes).toString('base64'),
          ...(m.tipo !== 'audio' && m.legenda ? { text: m.legenda } : {}),
          ...(m.tipo === 'documento' ? { docName: m.nome } : {}),
        }),
        signal: deps.signal ?? prazoDoEnvio(TIMEOUT_ENVIO_ARQUIVO_MS),
      })
      if (!res.ok) return await uazapiFalha(res)
      const j = (await res.json()) as { messageid?: string }
      if (!j?.messageid) return { ok: false, erro: 'O servidor UAZAPI respondeu sem o id da mensagem.', codigo: null, retryable: false, acao: 'dead' }
      return { ok: true, externalId: j.messageid }
    } catch (err) {
      const c = classificarFalhaDeTransporte(err)
      return { ok: false, erro: c.legenda, codigo: null, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
    }
  },

  
  async markRead(_canalExternalId: string, externalId: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<void> {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      await fetchFn(`${creds.serverUrl}/message/markread`, {
        method: 'POST',
        headers: { token: creds.instanceToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: [externalId] }),
        signal: prazoDoEnvio(),
      })
    } catch {  }
  },

  
  async downloadMedia(ref: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<{ bytes: Uint8Array; mime: string } | null> {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      const res = await fetchFn(`${creds.serverUrl}/message/download`, {
        method: 'POST',
        headers: { token: creds.instanceToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ref, return_base64: true, return_link: true, generate_mp3: false }),
      })
      if (!res.ok) return null
      const j = (await res.json()) as { base64Data?: string; fileURL?: string; mimetype?: string }
      const mime = j.mimetype ?? 'application/octet-stream'
      if (j.base64Data) return { bytes: new Uint8Array(Buffer.from(j.base64Data, 'base64')), mime }
      if (j.fileURL) {
        const bin = await fetchFn(j.fileURL) 
        if (!bin.ok) return null
        return { bytes: new Uint8Array(await bin.arrayBuffer()), mime }
      }
      return null
    } catch { return null }
  },
} satisfies CanalAdapter 




export const uazapiLifecycle = {
  async criarInstancia(
    creds: { serverUrl: string; adminToken: string },
    nome: string,
    deps: HttpDeps = {},
  ): Promise<{ instanceId: string; instanceToken: string; instanceName: string }> {
    const fetchFn = deps.fetchFn ?? fetch
    const res = await fetchFn(`${creds.serverUrl}/instance/create`, {
      method: 'POST',
      headers: { admintoken: creds.adminToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome }),
    })
    
    
    
    if (!res.ok) throw new Error(`instance/create respondeu HTTP ${res.status}`)
    const j = (await res.json()) as { token?: string; name?: string; instance?: { id?: string; name?: string } }
    const instanceName = j.name ?? j.instance?.name ?? ''
    if (!instanceName) throw new Error('instance/create voltou sem nome de instância')
    return {
      instanceId: j.instance?.id ?? j.instance?.name ?? '',
      instanceToken: j.token ?? '',
      
      instanceName,
    }
  },

  async conectar(
    creds: { serverUrl: string; instanceToken: string },
    deps: HttpDeps = {},
  ): Promise<{ qrcode: string; status: string }> {
    const fetchFn = deps.fetchFn ?? fetch
    const res = await fetchFn(`${creds.serverUrl}/instance/connect`, {
      method: 'POST',
      headers: { token: creds.instanceToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    
    
    if (!res.ok) throw new Error(`instance/connect respondeu HTTP ${res.status}`)
    const j = (await res.json()) as { instance?: { qrcode?: string; status?: string } }
    const qrcode = j.instance?.qrcode ?? ''
    if (!qrcode) throw new Error('instance/connect respondeu sem o QR')
    return { qrcode, status: j.instance?.status ?? '' }
  },

  async statusConexao(
    creds: { serverUrl: string; instanceToken: string },
    deps: HttpDeps = {},
  ): Promise<{ status: string; connected: boolean; qrcode: string }> {
    const fetchFn = deps.fetchFn ?? fetch
    const res = await fetchFn(`${creds.serverUrl}/instance/status`, {
      method: 'GET',
      headers: { token: creds.instanceToken },
    })
    const j = (await res.json()) as { instance?: { status?: string; qrcode?: string }; status?: { connected?: boolean } }
    
    
    return {
      status: j.instance?.status ?? '',
      connected: (j.status?.connected ?? false) || j.instance?.status === 'connected',
      qrcode: j.instance?.qrcode ?? '',
    }
  },

  
  async desconectar(
    creds: { serverUrl: string; instanceToken: string },
    deps: HttpDeps = {},
  ): Promise<void> {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      await fetchFn(`${creds.serverUrl}/instance/disconnect`, {
        method: 'POST',
        headers: { token: creds.instanceToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch {  }
  },

  async configurarWebhook(
    creds: { serverUrl: string; instanceToken: string },
    url: string,
    deps: HttpDeps = {},
  ): Promise<void> {
    const fetchFn = deps.fetchFn ?? fetch
    const res = await fetchFn(`${creds.serverUrl}/webhook`, {
      method: 'POST',
      headers: { token: creds.instanceToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        events: ['messages', 'messages_update', 'connection'],
        
        excludeMessages: ['wasSentByApi', 'isGroupYes'],
        enabled: true, 
      }),
    })
    
    
    
    if (!res.ok) throw new Error(`configurar webhook respondeu HTTP ${res.status}`)
  },
}
