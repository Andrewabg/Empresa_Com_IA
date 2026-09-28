



import { getProvider as getProviderDefault } from './registry'
import { marcarLido as marcarLidoDispatch } from './dispatch'
import { aplicarStatusEntrega } from '@/lib/canais/janela'
import { deveIgnorarSandbox } from '@/lib/canais/sandbox'
import {
  getCanalByExternalId as getCanalDefault, updateConexao as updateConexaoDefault,
  updateCanalConfig as updateCanalConfigDefault, type CanalRow,
} from '@/data/canais'
import { getOrCreateContatoTolerante as getContatoDefault } from '@/data/contatos'
import {
  getOrCreateConversaAberta as getConversaDefault, touchConversaIn as touchInDefault,
  touchConversaOut as touchOutDefault, setConversaStatus as setStatusDefault,
  cancelarProximaAcao as cancelarAcaoDefault,
} from '@/data/conversasExternas'
import {
  insertMensagemExterna as insertMsgDefault, getMensagemByExternalId as getByExtDefault,
  updateMensagemStatus as updStatusDefault, descartarRascunhosPendentes as descartarRascunhosDefault,
} from '@/data/mensagensExternas'
import { agendarJobConversa as agendarDefault } from '@/data/atendimentoJobs'
import { pediuHumano } from '@/lib/canais/escalacao'
import { lerCobranca, modeloDaCobranca } from '@/lib/canais/cobrancaMeta'
import { recordEvent as recordEventDefault } from '@/data/events'
import { registroDeRecusaRateLimiter, CHAVE_RECUSA_GLOBAL } from '@/server/http/rateLimit'
import { recordCost as recordCostDefault } from '@/data/cost'
import { gravarEventoBruto as gravarEventoBrutoDefault } from '@/data/canalWebhookEvents'
import { registrarComentario as registrarComentarioDefault } from '@/data/igComentarios'
import { dispararPorComentario as dispararPorComentarioDefault } from '@/server/instagram/executar'
import { notificarCanalDesconectado } from '@/server/proativo/producers'




import type { ingerirMidia as ingerirMidiaType } from './media'
import { agenteDaConversa } from '@/lib/canais/agenteDaConversa'
import { classificarErroMeta } from '@/lib/canais/erroMeta'
import { ESPERA_MIDIA_MS } from '@/lib/canais/midiaPendente'
import type { CanalEvent, ProviderSlug, ProviderSpec, VerificacaoRequest } from './types'

export const DEBOUNCE_MS = 15_000


function legendaDeFalha(ev: Extract<CanalEvent, { kind: 'status' }>): string | undefined {
  if (!ev.erro) return undefined
  return classificarErroMeta({ codigo: ev.erro.codigo, mensagem: ev.erro.detalhe ?? ev.erro.titulo }).legenda
}


interface VerificarRequestInput { rawBody: string; headers: Record<string, string>; pathSegments: string[] }

export interface WebhookDeps {
  
  getProvider: (slug: string) => ProviderSpec | undefined
  
  verificarRequest: (spec: ProviderSpec, input: VerificarRequestInput) => Promise<VerificacaoRequest>
  getCanalByExternalId: typeof getCanalDefault
  getOrCreateContato: typeof getContatoDefault
  getOrCreateConversaAberta: typeof getConversaDefault
  insertMensagemExterna: typeof insertMsgDefault
  touchConversaIn: typeof touchInDefault
  
  cancelarProximaAcao: typeof cancelarAcaoDefault
  
  recordCost: typeof recordCostDefault
  
  gravarEventoBruto: (i: { provider: string; canalId: string | null; assinaturaOk: boolean; payload: unknown }) => void
  
  permitirRastroDeRecusa?: () => boolean
  
  registrarComentario?: typeof registrarComentarioDefault
  
  dispararPorComentario?: typeof dispararPorComentarioDefault
  agendarJobConversa: typeof agendarDefault
  fireJob: (jobId: string) => void
  getMensagemByExternalId: typeof getByExtDefault
  updateMensagemStatus: typeof updStatusDefault
  now: () => string
  ingerirMidia: typeof ingerirMidiaType
  
  marcarLido: (canal: CanalRow, externalId: string) => void
  
  assumirPeloDono: (canal: CanalRow, ev: Extract<CanalEvent, { kind: 'mensagem' }>) => Promise<void>
  
  aplicarConexao: (canalId: string, estado: 'pareado' | 'desconectado') => Promise<void>
  
  notificarDesconexao: (canal: CanalRow) => void
  
  registrarPerfilProprio: (canalId: string, nome: string) => Promise<void>
}


export const CHAVE_PERFIL_PROPRIO = 'nome_perfil'

export function lerPerfilProprio(config: Record<string, unknown> | null | undefined): string | null {
  const v = (config ?? {})[CHAVE_PERFIL_PROPRIO]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}


async function assumirPeloDonoDefault(canal: CanalRow, ev: Extract<CanalEvent, { kind: 'mensagem' }>): Promise<void> {
  
  
  const contato = await getContatoDefault({ tipo: canal.tipo, external_id: ev.contato.externalId, nome: ev.contato.nome })
  
  const conversa = await getConversaDefault(canal.id, contato.id)
  const inserted = await insertMsgDefault({
    conversa_id: conversa.id, direcao: 'out', autor: 'operador',
    texto: ev.texto, status: 'enviada', external_id: ev.externalId,
    origem_em: ev.timestamp, 
  })
  if (!inserted) return 
  await descartarRascunhosDefault(conversa.id)
  await setStatusDefault(conversa.id, 'assumida')
  
  
  await touchOutDefault(conversa.id, ev.timestamp)
  try {
    await recordEventDefault({
      id: `takeover:${conversa.id}:${ev.externalId}`, type: 'action',
      label: 'Atendimento: dono assumiu a conversa pelo WhatsApp',
      agent: agenteDaConversa(conversa.agent_id, canal.agent_id),
    })
  } catch {  }
}




export const defaultDeps: WebhookDeps = {
  getProvider: getProviderDefault,
  verificarRequest: (spec, input) => spec.verificarRequest(input),
  getCanalByExternalId: getCanalDefault,
  getOrCreateContato: getContatoDefault,
  getOrCreateConversaAberta: getConversaDefault,
  insertMensagemExterna: insertMsgDefault,
  touchConversaIn: touchInDefault,
  cancelarProximaAcao: cancelarAcaoDefault,
  recordCost: recordCostDefault,
  gravarEventoBruto: (i) => { void gravarEventoBrutoDefault(i) },
  permitirRastroDeRecusa: () => registroDeRecusaRateLimiter.permitir(CHAVE_RECUSA_GLOBAL),
  registrarComentario: registrarComentarioDefault,
  dispararPorComentario: dispararPorComentarioDefault,
  agendarJobConversa: agendarDefault,
  
  fireJob: (id) => { void import('./runtime').then((m) => m.runAtendimentoJob(id)) },
  getMensagemByExternalId: getByExtDefault,
  updateMensagemStatus: updStatusDefault,
  now: () => new Date().toISOString(),
  
  ingerirMidia: (msg) => import('./media').then((m) => m.ingerirMidia(msg)),
  marcarLido: (canal, externalId) => { void marcarLidoDispatch(canal, externalId) },
  assumirPeloDono: assumirPeloDonoDefault,
  registrarPerfilProprio: (canalId, nome) => updateCanalConfigDefault(canalId, { [CHAVE_PERFIL_PROPRIO]: nome }),
  aplicarConexao: (canalId, estado) => updateConexaoDefault(canalId, estado, estado === 'pareado' ? null : undefined),
  notificarDesconexao: (canal) => { void notificarCanalDesconectado({ rotulo: canal.rotulo, canalId: canal.id }) },
}

export interface WebhookResult { status: number; body: Record<string, unknown> }

export async function handleCanalWebhook(
  provider: ProviderSlug,
  rawBody: string,
  headers: Record<string, string>,
  pathSegments: string[],
  deps: WebhookDeps = defaultDeps,
): Promise<WebhookResult> {
  const spec = deps.getProvider(provider)
  if (!spec) return { status: 404, body: { error: 'provider desconhecido' } } 

  const v = await deps.verificarRequest(spec, { rawBody, headers, pathSegments })
  
  
  
  
  
  
  
  
  
  
  const podeGravar = v.ok || (deps.permitirRastroDeRecusa ?? (() => true))()
  if (podeGravar) {
    try {
      deps.gravarEventoBruto({
        provider, canalId: v.ok ? v.canal?.id ?? null : null, assinaturaOk: v.ok, payload: rawBody,
      })
    } catch (e) { console.warn('[canais/webhook] caixa-preta fail-open:', e) }
  }
  if (!v.ok) return { status: v.status, body: { error: v.status === 503 ? 'not_configured' : 'assinatura inválida' } }

  const eventos = spec.adapter.parseInbound(rawBody)
  let falhas = 0
  for (const ev of eventos) {
    try {
      
      const canal: CanalRow | null = v.canal ?? await deps.getCanalByExternalId(ev.canalExternalId, provider)
      if (!canal) continue 

      
      
      if (spec.verificarEvento && !(await spec.verificarEvento(ev, canal, rawBody))) continue

      
      
      if (ev.kind === 'status') {
        const msg = await deps.getMensagemByExternalId(ev.externalId)
        if (msg) {
          const novo = aplicarStatusEntrega(msg.status, ev.status)
          if (novo !== msg.status) await deps.updateMensagemStatus(msg.id, novo, legendaDeFalha(ev))
        }
        
        
        
        
        
        const cobranca = lerCobranca(ev.cobranca)
        if (cobranca?.billable) {
          try {
            await deps.recordCost({
              kind: 'plataforma', model: modeloDaCobranca(cobranca),
              promptTokens: 0, completionTokens: 0, amountUsdOverride: 0,
              agent: agenteDaConversa(null, canal.agent_id),
            })
          } catch (e) { console.warn('[canais/webhook] cobrança fail-open:', e) }
        }
        continue
      }

      if (ev.kind === 'conexao') {
        
        
        if (ev.estado === 'desconectado' && canal.conexao_estado !== 'desconectado') deps.notificarDesconexao(canal)
        await deps.aplicarConexao(canal.id, ev.estado)
        continue
      } 
      if (ev.kind === 'qr') continue 

      
      
      
      if (ev.kind === 'comentario') {
        
        if (ev.proprio) continue
        
        
        
        
        
        
        
        
        
        
        
        
        let comentarioId: string | null = null
        try {
          const gravado = await (deps.registrarComentario ?? registrarComentarioDefault)({
            canalId: canal.id,
            externalId: ev.externalId,
            midiaId: ev.midiaId,
            permalink: ev.permalink,
            parentId: ev.parentId,
            autorExternalId: ev.de.externalId,
            autorNome: ev.de.nome,
            texto: ev.texto,
            comentadoEm: ev.timestamp,
          })
          comentarioId = gravado?.id ?? null
        } catch (e) {
          console.warn('[canais/webhook] gravar comentário fail-open:', e)
        }
        
        
        
        
        
        if (!canal.enabled) continue
        try {
          await (deps.dispararPorComentario ?? dispararPorComentarioDefault)({
            canalId: canal.id,
            midiaId: ev.midiaId,
            origem: 'comentario',
            origemId: ev.externalId,
            comentarioId,
            igUserId: ev.de.externalId,
            igUsername: ev.de.nome,
            texto: ev.texto,
            agoraIso: deps.now(),
          })
        } catch (e) {
          console.warn('[canais/webhook] disparo do comentário fail-open:', e)
        }
        continue
      }

      
      
      
      
      
      
      
      
      
      
      if (provider === 'instagram') continue

      
      
      
      if (ev.origem === 'proprio') {
        
        
        
        
        if (ev.perfilProprio && ev.perfilProprio !== lerPerfilProprio(canal.config)) {
          try { await deps.registrarPerfilProprio(canal.id, ev.perfilProprio) }
          catch (e) { console.warn('[canais/webhook] perfil próprio fail-open:', e) }
        }
        await deps.assumirPeloDono(canal, ev)
        continue
      } 

      
      
      const ignorar = deveIgnorarSandbox(canal.config, ev.contato.externalId)
      const contato = await deps.getOrCreateContato({
        
        tipo: canal.tipo,
        external_id: ev.contato.externalId,
        nome: ev.contato.nome,
        nomeProprio: lerPerfilProprio(canal.config),
      })
      const conversa = await deps.getOrCreateConversaAberta(canal.id, contato.id)
      const inserted = await deps.insertMensagemExterna({
        conversa_id: conversa.id,
        direcao: 'in',
        autor: 'contato',
        texto: ev.texto,
        
        
        midia: ev.respostaA
          ? { ...(ev.midia ?? { kind: 'text' }), resposta_a: ev.respostaA }
          : ev.midia,
        external_id: ev.externalId,
        status: 'recebida',
        
        origem_em: ev.timestamp,
        sandbox_ignorada: ignorar,
      })
      if (!inserted) continue 
      if (inserted.midia?.media_id) void deps.ingerirMidia(inserted) 
      
      await deps.touchConversaIn(conversa.id, ev.timestamp)
      
      
      
      
      
      try { await deps.cancelarProximaAcao(conversa.id) } catch (e) { console.warn('[canais/webhook] cancelar follow-up fail-open:', e) }
      
      
      if (!canal.enabled) continue
      
      
      if (ignorar) continue
      
      void deps.marcarLido(canal, ev.externalId)
      if (conversa.status === 'assumida' || conversa.status === 'aguardando_humano') continue
      
      
      
      
      
      
      const urgente = pediuHumano(ev.texto || inserted.midia?.texto_estruturado || '')
      const folgaMs = urgente
        ? 0
        : inserted.midia?.media_id ? Math.max(DEBOUNCE_MS, ESPERA_MIDIA_MS) : DEBOUNCE_MS
      const naoAntes = new Date(Date.parse(deps.now()) + folgaMs).toISOString()
      const { jobId, novo } = await deps.agendarJobConversa(conversa.id, naoAntes)
      
      
      
      if (novo) deps.fireJob(jobId)
    } catch (err) {
      
      
      falhas++
      console.warn('[canais/webhook] evento falhou:', err)
    }
  }
  if (falhas > 0) return { status: 500, body: { error: 'eventos falharam', falhas } }
  return { status: 200, body: { ok: true, eventos: eventos.length } }
}


export async function handleWhatsappWebhook(
  rawBody: string,
  headers: Record<string, string>,
  deps: WebhookDeps = defaultDeps,
): Promise<WebhookResult> {
  return handleCanalWebhook('whatsapp_cloud', rawBody, headers, [], deps)
}
