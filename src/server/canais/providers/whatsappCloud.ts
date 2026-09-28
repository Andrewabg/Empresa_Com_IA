

import { mdParaWhatsapp } from '@/lib/whatsapp/mdParaWhatsapp'
import { splitMensagem } from '@/lib/canais/splitMensagem'
import { parseInboundWhatsapp } from '../parse'
import { classificarFalhaDeTransporte } from '@/lib/canais/erroMeta'
import { falhaDaResposta } from './graphHttp'
import { prazoDoEnvio, TIMEOUT_ENVIO_ARQUIVO_MS } from '@/lib/canais/prazoDeEnvio'
import type { CanalAdapter, CanalEvent, EnvioResultado, EnvioFalha, HttpDeps, CanalCreds, MidiaSaida, Interativo } from '../types'



export const GRAPH_BASE = 'https://graph.facebook.com/v26.0'



export const WHATSAPP_CLOUD_MAX_CHARS = 4000


function nomeDaMidia(m: MidiaSaida): string {
  switch (m.tipo) {
    case 'documento': return m.nome
    case 'video': return m.nome
    case 'imagem': return m.nome ?? (m.mime.includes('png') ? 'imagem.png' : 'imagem.jpg')
    case 'audio': return 'audio.ogg'
  }
}


function corpoDaMidia(m: MidiaSaida, ref: string): Record<string, unknown> {
  switch (m.tipo) {
    case 'imagem':
      return { type: 'image', image: { id: ref, ...(m.legenda ? { caption: m.legenda } : {}) } }
    case 'documento':
      return { type: 'document', document: { id: ref, filename: m.nome, ...(m.legenda ? { caption: m.legenda } : {}) } }
    case 'video':
      return { type: 'video', video: { id: ref, ...(m.legenda ? { caption: m.legenda } : {}) } }
    case 'audio':
      return { type: 'audio', audio: { id: ref, ...(m.voz ? { voice: true } : {}) } }
  }
}


function corpoInterativo(i: Interativo): Record<string, unknown> {
  const rodape = i.rodape ? { footer: { text: i.rodape } } : {}
  if (i.tipo === 'botoes') {
    return {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: i.corpo },
        ...rodape,
        action: { buttons: i.botoes.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.titulo } })) },
      },
    }
  }
  return {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: i.corpo },
      ...rodape,
      action: {
        button: i.botao,
        sections: i.secoes.map((s) => ({
          title: s.titulo,
          rows: s.linhas.map((l) => ({ id: l.id, title: l.titulo, ...(l.descricao ? { description: l.descricao } : {}) })),
        })),
      },
    },
  }
}

export const whatsappCloudAdapter = {
  capabilities: { janela24h: true, markRead: true, conexaoPareada: false, typing: true, enviaMidia: true, enviaInterativo: true },
  
  prepararTexto(texto: string): string[] {
    return splitMensagem(mdParaWhatsapp(texto), WHATSAPP_CLOUD_MAX_CHARS)
  },
  parseInbound(rawBody: string): CanalEvent[] {
    return parseInboundWhatsapp(rawBody)
  },
  async sendText(canalExternalId: string, paraExternalId: string, texto: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<EnvioResultado | EnvioFalha> {
    const fetchFn = deps.fetchFn ?? fetch
    
    
    
    const pedacos = splitMensagem(mdParaWhatsapp(texto), WHATSAPP_CLOUD_MAX_CHARS)
    if (pedacos.length === 0) return { ok: false, erro: 'texto vazio' }
    
    
    let ultimoId = ''
    
    
    const signal = deps.signal ?? prazoDoEnvio()
    for (const pedaco of pedacos) {
      try {
        const res = await fetchFn(`${GRAPH_BASE}/${canalExternalId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: paraExternalId, type: 'text', text: { body: pedaco } }),
          signal,
        })
        if (!res.ok) return await falhaDaResposta(res)
        const j = (await res.json()) as { messages?: Array<{ id?: string }> }
        const id = j?.messages?.[0]?.id
        
        if (!id) return { ok: false, erro: 'A Meta respondeu sem o id da mensagem.', codigo: null, retryable: false, acao: 'dead' }
        ultimoId = id
      } catch (err) {
        
        const c = classificarFalhaDeTransporte(err)
        return { ok: false, erro: c.legenda, codigo: null, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
      }
    }
    return { ok: true, externalId: ultimoId }
  },
  
  async markRead(canalExternalId: string, externalId: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<void> {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      await fetchFn(`${GRAPH_BASE}/${canalExternalId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: externalId }),
        signal: prazoDoEnvio(),
      })
    } catch {  }
  },
  
  async consultarSaude(canalExternalId, creds, deps = {}) {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      const campos = 'quality_rating,messaging_limit_tier,name_status,display_phone_number'
      const res = await fetchFn(`${GRAPH_BASE}/${canalExternalId}?fields=${campos}`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      })
      if (!res.ok) return null
      const j = (await res.json()) as {
        quality_rating?: unknown; messaging_limit_tier?: unknown; name_status?: unknown
      }
      const q = typeof j.quality_rating === 'string' ? j.quality_rating.toUpperCase() : ''
      
      
      
      
      const recebe = creds.wabaId
        ? await consultarInscricaoWaba({ wabaId: creds.wabaId, token: creds.accessToken }, deps)
        : null
      return {
        qualidade: q === 'GREEN' || q === 'YELLOW' || q === 'RED' ? q : 'UNKNOWN',
        limite: typeof j.messaging_limit_tier === 'string' ? j.messaging_limit_tier : null,
        nome: typeof j.name_status === 'string' ? j.name_status : null,
        recebe,
        em: new Date().toISOString(),
      }
    } catch { return null } 
  },
  
  async sinalizarDigitando(canalExternalId: string, refExternalId: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<void> {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      await fetchFn(`${GRAPH_BASE}/${canalExternalId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', status: 'read', message_id: refExternalId,
          typing_indicator: { type: 'text' },
        }),
        signal: prazoDoEnvio(),
      })
    } catch {  }
  },
  
  async uploadMedia(canalExternalId: string, m: MidiaSaida, creds: CanalCreds, deps: HttpDeps = {}, signal: AbortSignal = deps.signal ?? prazoDoEnvio(TIMEOUT_ENVIO_ARQUIVO_MS)): Promise<{ ref: string } | EnvioFalha> {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      const mimeBase = m.mime.split(';')[0].trim()
      const fd = new FormData()
      fd.append('messaging_product', 'whatsapp')
      fd.append('type', mimeBase)
      fd.append('file', new Blob([Buffer.from(m.bytes)], { type: mimeBase }), nomeDaMidia(m))
      const res = await fetchFn(`${GRAPH_BASE}/${canalExternalId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.accessToken}` }, 
        body: fd,
        signal,
      })
      if (!res.ok) return await falhaDaResposta(res)
      const j = (await res.json()) as { id?: string }
      if (!j?.id) return { ok: false, erro: 'A Meta respondeu sem o id do arquivo.', codigo: null, retryable: false, acao: 'dead' }
      return { ref: j.id }
    } catch (err) {
      const c = classificarFalhaDeTransporte(err)
      return { ok: false, erro: c.legenda, codigo: null, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
    }
  },
  
  async sendMedia(canalExternalId: string, paraExternalId: string, m: MidiaSaida, creds: CanalCreds, deps: HttpDeps = {}): Promise<EnvioResultado | EnvioFalha> {
    const fetchFn = deps.fetchFn ?? fetch
    
    const signal = deps.signal ?? prazoDoEnvio(TIMEOUT_ENVIO_ARQUIVO_MS)
    const up = await whatsappCloudAdapter.uploadMedia(canalExternalId, m, creds, deps, signal)
    if ('ok' in up && up.ok === false) return up
    const ref = (up as { ref: string }).ref
    try {
      const res = await fetchFn(`${GRAPH_BASE}/${canalExternalId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp', to: paraExternalId,
          ...corpoDaMidia(m, ref),
        }),
        signal,
      })
      if (!res.ok) return await falhaDaResposta(res)
      const j = (await res.json()) as { messages?: Array<{ id?: string }> }
      const id = j?.messages?.[0]?.id
      if (!id) return { ok: false, erro: 'A Meta respondeu sem o id da mensagem.', codigo: null, retryable: false, acao: 'dead' }
      return { ok: true, externalId: id }
    } catch (err) {
      const c = classificarFalhaDeTransporte(err)
      return { ok: false, erro: c.legenda, codigo: null, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
    }
  },
  
  async sendInteractive(canalExternalId: string, paraExternalId: string, i: Interativo, creds: CanalCreds, deps: HttpDeps = {}): Promise<EnvioResultado | EnvioFalha> {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      const res = await fetchFn(`${GRAPH_BASE}/${canalExternalId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: paraExternalId, ...corpoInterativo(i) }),
        signal: deps.signal ?? prazoDoEnvio(),
      })
      if (!res.ok) return await falhaDaResposta(res)
      const j = (await res.json()) as { messages?: Array<{ id?: string }> }
      const id = j?.messages?.[0]?.id
      if (!id) return { ok: false, erro: 'A Meta respondeu sem o id da mensagem.', codigo: null, retryable: false, acao: 'dead' }
      return { ok: true, externalId: id }
    } catch (err) {
      const c = classificarFalhaDeTransporte(err)
      return { ok: false, erro: c.legenda, codigo: null, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
    }
  },
  
  async downloadMedia(ref: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<{ bytes: Uint8Array; mime: string } | null> {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      const meta = await fetchFn(`${GRAPH_BASE}/${ref}`, { headers: { Authorization: `Bearer ${creds.accessToken}` } })
      if (!meta.ok) return null
      const j = (await meta.json()) as { url?: string; mime_type?: string }
      if (!j.url) return null
      const bin = await fetchFn(j.url, { headers: { Authorization: `Bearer ${creds.accessToken}` } })
      if (!bin.ok) return null
      return { bytes: new Uint8Array(await bin.arrayBuffer()), mime: j.mime_type ?? 'application/octet-stream' }
    } catch { return null }
  },
} satisfies CanalAdapter 









export interface ResultadoInscricao {
  ok: boolean
  
  detalhe: string
}


export async function inscreverAppNoWaba(
  input: { wabaId: string; token: string; callbackUrl?: string | null; verifyToken?: string | null },
  deps: HttpDeps = {},
): Promise<ResultadoInscricao> {
  const fetchFn = deps.fetchFn ?? fetch
  const chamar = async (corpo: Record<string, string> | null): Promise<{ ok: boolean; detalhe: string }> => {
    const url = new URL(`${GRAPH_BASE}/${input.wabaId}/subscribed_apps`)
    for (const [k, v] of Object.entries(corpo ?? {})) url.searchParams.set(k, v)
    const res = await fetchFn(url.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.token}` },
    })
    if (res.ok) {
      const j = (await res.json().catch(() => null)) as { success?: unknown } | null
      
      if (j && j.success === false) return { ok: false, detalhe: 'a Meta recusou a inscrição' }
      return { ok: true, detalhe: '' }
    }
    const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    return { ok: false, detalhe: j?.error?.message ?? `HTTP ${res.status}` }
  }
  try {
    if (input.callbackUrl && input.verifyToken) {
      const comUrl = await chamar({ override_callback_uri: input.callbackUrl, verify_token: input.verifyToken })
      if (comUrl.ok) return comUrl
      const simples = await chamar(null)
      return simples.ok ? simples : comUrl 
    }
    return await chamar(null)
  } catch (err) {
    return { ok: false, detalhe: err instanceof Error ? err.message : String(err) }
  }
}


export async function consultarInscricaoWaba(
  input: { wabaId: string; token: string },
  deps: HttpDeps = {},
): Promise<boolean | null> {
  const fetchFn = deps.fetchFn ?? fetch
  try {
    const res = await fetchFn(`${GRAPH_BASE}/${input.wabaId}/subscribed_apps`, {
      headers: { Authorization: `Bearer ${input.token}` },
    })
    if (!res.ok) return null
    const j = (await res.json()) as { data?: unknown }
    return Array.isArray(j.data) ? j.data.length > 0 : null
  } catch { return null }
}
