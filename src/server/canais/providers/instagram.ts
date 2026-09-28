




import { splitMensagem } from '@/lib/canais/splitMensagem'
import { mdParaWhatsapp } from '@/lib/whatsapp/mdParaWhatsapp'
import { classificarFalhaDeTransporte } from '@/lib/canais/erroMeta'
import { parseInboundInstagram } from '../parseInstagram'
import { GRAPH_BASE } from './whatsappCloud'
import { falhaDaResposta } from './graphHttp'
import { consultarInscricaoInstagram, recebeDaLeitura } from '@/server/instagram/conexao'
import type { CanalAdapter, CanalEvent, EnvioResultado, EnvioFalha, HttpDeps, CanalCreds } from '../types'
import type { SaudeNumero } from '../types'





import { INSTAGRAM_MAX_CHARS, INSTAGRAM_MAX_CHARS_BOTAO, type BotaoIg } from '@/lib/instagram/limitesDaMeta'


import { TEXTOS_GATILHO_IG } from '@/lib/instagram/copyGatilho'


export const TIMEOUT_ENVIO_IG_MS = 120_000


export type DestinoIg =
  | { tipo: 'usuario'; id: string }
  | { tipo: 'comentario'; comentarioId: string }

export interface ConteudoIg {
  texto?: string
  
  imagemUrl?: string
  botoes?: BotaoIg[]
}


type CorpoDaMensagem = { message: Record<string, unknown> } | { recusa: string }

function corpoDaMensagem(c: ConteudoIg): CorpoDaMensagem {
  const t = (c.texto ?? '').trim()
  if (c.botoes && c.botoes.length > 0) {
    
    
    
    
    if (!t) return { recusa: TEXTOS_GATILHO_IG.botaoSemTexto }
    return {
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: t,
            buttons: c.botoes.map((b) => ({ type: 'web_url', url: b.url, title: b.rotulo })),
          },
        },
      },
    }
  }
  if (c.imagemUrl) {
    return { message: { attachment: { type: 'image', payload: { url: c.imagemUrl, is_reusable: false } } } }
  }
  return t ? { message: { text: t } } : { recusa: 'Não havia conteúdo para enviar.' }
}

function destinoNoCorpo(d: DestinoIg): Record<string, string> {
  return d.tipo === 'usuario' ? { id: d.id } : { comment_id: d.comentarioId }
}


const ID_GRAPH_ACEITO = /^[A-Za-z0-9_]{1,64}$/


export async function enviarDmIg(
  destino: DestinoIg,
  conteudo: ConteudoIg,
  creds: CanalCreds,
  deps: HttpDeps = {},
): Promise<EnvioResultado | EnvioFalha> {
  if (destino.tipo === 'comentario' && !ID_GRAPH_ACEITO.test(destino.comentarioId)) {
    return { ok: false, erro: TEXTOS_GATILHO_IG.origemForaDoFormato, codigo: null, retryable: false, acao: 'dead' }
  }
  const corpo = corpoDaMensagem(conteudo)
  
  if ('recusa' in corpo) return { ok: false, erro: corpo.recusa, codigo: null, retryable: false, acao: 'dead' }
  const message = corpo.message
  const fetchFn = deps.fetchFn ?? fetch
  try {
    const res = await fetchFn(`${GRAPH_BASE}/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: destinoNoCorpo(destino), message }),
      signal: AbortSignal.timeout(TIMEOUT_ENVIO_IG_MS),
    })
    if (!res.ok) return await falhaDaResposta(res)
    const j = (await res.json()) as { message_id?: string }
    
    if (!j?.message_id) return { ok: false, erro: 'A Meta respondeu sem o id da mensagem.', codigo: null, retryable: false, acao: 'dead' }
    return { ok: true, externalId: j.message_id }
  } catch (err) {
    const c = classificarFalhaDeTransporte(err)
    return { ok: false, erro: c.legenda, codigo: null, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
  }
}


export async function responderComentario(
  comentarioId: string,
  texto: string,
  creds: CanalCreds,
  deps: HttpDeps = {},
): Promise<EnvioResultado | EnvioFalha> {
  if (!ID_GRAPH_ACEITO.test(comentarioId)) {
    return { ok: false, erro: TEXTOS_GATILHO_IG.origemForaDoFormato, codigo: null, retryable: false, acao: 'dead' }
  }
  const t = texto.trim()
  if (!t) return { ok: false, erro: 'Não havia texto para responder.', codigo: null, retryable: false, acao: 'dead' }
  const fetchFn = deps.fetchFn ?? fetch
  try {
    const res = await fetchFn(`${GRAPH_BASE}/${comentarioId}/replies`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: t }),
      signal: AbortSignal.timeout(TIMEOUT_ENVIO_IG_MS),
    })
    if (!res.ok) return await falhaDaResposta(res)
    const j = (await res.json()) as { id?: string }
    if (!j?.id) return { ok: false, erro: 'A Meta respondeu sem o id da resposta.', codigo: null, retryable: false, acao: 'dead' }
    return { ok: true, externalId: j.id }
  } catch (err) {
    const c = classificarFalhaDeTransporte(err)
    return { ok: false, erro: c.legenda, codigo: null, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
  }
}

export const instagramAdapter = {
  capabilities: {
    janela24h: true, markRead: false, conexaoPareada: false,
    typing: false, enviaMidia: true,
    
    
    
    
    
    
    enviaInterativo: false,
  },
  
  prepararTexto(texto: string, limite: number = INSTAGRAM_MAX_CHARS): string[] {
    return splitMensagem(mdParaWhatsapp(texto), limite)
  },
  parseInbound(rawBody: string): CanalEvent[] {
    return parseInboundInstagram(rawBody)
  },
  
  async sendText(canalExternalId: string, paraExternalId: string, texto: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<EnvioResultado | EnvioFalha> {
    const pedacos = splitMensagem(mdParaWhatsapp(texto), INSTAGRAM_MAX_CHARS)
    if (pedacos.length === 0) return { ok: false, erro: 'texto vazio' }
    let ultimoId = ''
    for (const pedaco of pedacos) {
      const r = await enviarDmIg({ tipo: 'usuario', id: paraExternalId }, { texto: pedaco }, creds, deps)
      if (!r.ok) return r
      ultimoId = r.externalId
    }
    return { ok: true, externalId: ultimoId }
  },
  
  async markRead(): Promise<void> {  },
  async downloadMedia(ref: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<{ bytes: Uint8Array; mime: string } | null> {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      
      
      const bin = await fetchFn(ref, { headers: { Authorization: `Bearer ${creds.accessToken}` } })
      if (!bin.ok) return null
      return {
        bytes: new Uint8Array(await bin.arrayBuffer()),
        mime: bin.headers?.get?.('content-type') ?? 'application/octet-stream',
      }
    } catch { return null }
  },
  
  async consultarSaude(canalExternalId: string, creds: CanalCreds, deps: HttpDeps = {}): Promise<SaudeNumero | null> {
    const fetchFn = deps.fetchFn ?? fetch
    const em = new Date().toISOString()
    const recebe = recebeDaLeitura(await consultarInscricaoInstagram(
      { igUserId: canalExternalId, token: creds.accessToken }, { fetchFn },
    ))
    let nome: string | null = null
    try {
      const res = await fetchFn(`${GRAPH_BASE}/${canalExternalId}?fields=username`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      })
      if (res.ok) {
        const j = (await res.json()) as { username?: string }
        nome = j?.username ?? null
      }
    } catch {  }
    
    
    
    if (recebe === null && nome === null) return null
    return { qualidade: 'UNKNOWN', limite: null, nome, recebe, em }
  },
} satisfies CanalAdapter 
