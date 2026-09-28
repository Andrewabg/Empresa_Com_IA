

import {
  listClaimableAtendimentoJobs, listColdAtendimentoJobs, requeueAtendimentoJob,
  agendarJobConversa, finishAtendimentoJob, SEM_MARCA,
} from '@/data/atendimentoJobs'
import {
  listConversasComAcaoVencida, listConversasCandidatasFollowup,
  agendarProximaAcao, cancelarProximaAcao, type ConversaExternaRow,
} from '@/data/conversasExternas'
import { getCanal, listCanais, updateCanalConfig, type CanalRow } from '@/data/canais'
import { getConversa } from '@/data/conversasExternas'
import { decidirFollowup, configFollowup, ACAO_FOLLOWUP, type EstadoFollowup } from '@/lib/canais/followup'
import { lerSaudeConfig, precisaLerSaude, caiuParaVermelho, conselhoQualidade } from '@/lib/canais/saudeNumero'
import { consultarSaude as consultarSaudeDispatch } from './dispatch'
import { notificarQualidadeRuim } from '@/server/proativo/producers'
import { podarEventosBrutos, RETENCAO_BRUTO_MS } from '@/data/canalWebhookEvents'
import { getProvider } from './registry'
import { runAtendimentoJob, anunciarConversaSemResposta } from './runtime'
import type { SaudeNumero } from './types'


export const COLD_MS = 5 * 60_000

const CANDIDATAS_MS = 48 * 60 * 60 * 1000


export const TETO_FILA_POR_TIQUE = 30
export const TETO_FRIOS_POR_TIQUE = 10


export const TETO_TOQUES_POR_TIQUE = 10


export const TETO_ESFRIAMENTOS = 5


const MOTIVO_ESFRIOU_DEMAIS = 'ficou frio mais vezes do que o permitido'

export interface AtendimentoHeartbeatDeps {
  listClaimable?: typeof listClaimableAtendimentoJobs
  listCold?: typeof listColdAtendimentoJobs
  requeue?: typeof requeueAtendimentoJob
  
  finish?: typeof finishAtendimentoJob
  
  getConversa?: typeof getConversa
  
  anunciarSemResposta?: typeof anunciarConversaSemResposta
  fire?: (id: string) => void
  now?: () => string
  
  listAcaoVencida?: typeof listConversasComAcaoVencida
  
  listCandidatas?: typeof listConversasCandidatasFollowup
  getCanal?: typeof getCanal
  agendarAcao?: typeof agendarProximaAcao
  cancelarAcao?: typeof cancelarProximaAcao
  
  agendarJob?: typeof agendarJobConversa
  
  listCanais?: typeof listCanais
  consultarSaude?: (canal: CanalRow) => Promise<SaudeNumero | null>
  salvarConfig?: typeof updateCanalConfig
  notificarQualidade?: (i: { rotulo: string; canalId: string; conselho: string }) => void
  
  podarBrutos?: typeof podarEventosBrutos
}

export interface AtendimentoHeartbeatResult {
  fired: number
  revived: number
  
  aposentados: number
  
  agendados: number
  
  tocados: number
  
  saude: number
  
  podados: number
}


function estadoFollowup(c: ConversaExternaRow, canal: CanalRow | null, ligado: boolean): EstadoFollowup {
  return {
    status: c.status,
    ultimaMsgInAt: c.ultima_msg_in_at,
    ultimaMsgAt: c.ultima_msg_at,
    proximaAcao: c.proxima_acao,
    proximaAcaoEm: c.proxima_acao_em,
    toques: c.toques ?? 0,
    ligado,
    janela24h: canal ? (getProvider(canal.provider)?.adapter.capabilities.janela24h ?? true) : true,
  }
}

export async function runAtendimentoHeartbeat(deps: AtendimentoHeartbeatDeps = {}): Promise<AtendimentoHeartbeatResult> {
  const listClaimable = deps.listClaimable ?? listClaimableAtendimentoJobs
  const listCold = deps.listCold ?? listColdAtendimentoJobs
  const requeue = deps.requeue ?? requeueAtendimentoJob
  const finish = deps.finish ?? finishAtendimentoJob
  const buscarConversa = deps.getConversa ?? getConversa
  const anunciar = deps.anunciarSemResposta ?? anunciarConversaSemResposta
  const fire = deps.fire ?? ((id: string) => { void runAtendimentoJob(id) })
  const now = deps.now ?? (() => new Date().toISOString())

  let fired = 0
  let revived = 0
  let aposentados = 0

  
  
  
  
  
  
  
  let daFila: Awaited<ReturnType<typeof listClaimable>> = []
  try { daFila = await listClaimable(now(), TETO_FILA_POR_TIQUE) }
  catch (e) { console.warn('[canais/heartbeat] claimable fail-open:', e) }

  
  
  try {
    const cutoff = new Date(Date.parse(now()) - COLD_MS).toISOString() 
    for (const j of await listCold(cutoff, TETO_FRIOS_POR_TIQUE)) {
      if (revived + aposentados >= TETO_FRIOS_POR_TIQUE) break
      try {
        
        
        
        
        
        
        const esfriou = (j.esfriamentos ?? 0) + 1
        if (esfriou > TETO_ESFRIAMENTOS) {
          if (await finish(j.id, 'dead', SEM_MARCA, MOTIVO_ESFRIOU_DEMAIS)) {
            const conversa = await buscarConversa(j.conversa_id)
            if (conversa) await anunciar(conversa, j.id)
          }
          aposentados++
          continue
        }
        
        
        
        await requeue(j.id, j.attempts, 'cold-requeue (heartbeat)', SEM_MARCA, now(), esfriou)
        fire(j.id); revived++
      } catch (e) { console.warn('[canais/heartbeat] trabalho frio fail-open:', j.id, e) }
    }
  } catch (e) { console.warn('[canais/heartbeat] cold fail-open:', e) }

  
  
  
  
  try {
    for (const j of daFila) {
      if (fired >= TETO_FILA_POR_TIQUE) break
      fire(j.id); fired++
    }
  } catch (e) { console.warn('[canais/heartbeat] fila fail-open:', e) }

  const { agendados, tocados } = await braçoFollowup(deps, fire, now)
  const saude = await braçoSaude(deps, now)
  
  
  let podados = 0
  try {
    const corte = new Date(Date.parse(now()) - RETENCAO_BRUTO_MS).toISOString()
    podados = await (deps.podarBrutos ?? podarEventosBrutos)(corte)
  } catch (e) { console.warn('[canais/heartbeat] poda da caixa-preta fail-open:', e) }
  return { fired, revived, aposentados, agendados, tocados, saude, podados }
}


async function braçoSaude(deps: AtendimentoHeartbeatDeps, now: () => string): Promise<number> {
  const listar = deps.listCanais ?? listCanais
  const consultar = deps.consultarSaude ?? consultarSaudeDispatch
  const salvar = deps.salvarConfig ?? updateCanalConfig
  const avisar = deps.notificarQualidade ?? ((i: { rotulo: string; canalId: string; conselho: string }) => { void notificarQualidadeRuim(i) })

  let lidos = 0
  try {
    const agora = now()
    for (const canal of await listar()) {
      try {
        if (!canal.enabled) continue
        const atual = lerSaudeConfig(canal.config)
        if (!precisaLerSaude(atual, agora)) continue
        const nova = await consultar(canal)
        if (!nova) continue 
        await salvar(canal.id, { saude: nova as unknown as Record<string, unknown> })
        lidos++
        if (caiuParaVermelho(atual, nova)) {
          avisar({ rotulo: canal.rotulo, canalId: canal.id, conselho: conselhoQualidade('RED') })
        }
      } catch (e) { console.warn('[canais/heartbeat] saúde do canal fail-open:', e) }
    }
  } catch (e) { console.warn('[canais/heartbeat] saúde fail-open:', e) }
  return lidos
}


async function braçoFollowup(
  deps: AtendimentoHeartbeatDeps,
  fire: (id: string) => void,
  now: () => string,
): Promise<{ agendados: number; tocados: number }> {
  const listAcaoVencida = deps.listAcaoVencida ?? listConversasComAcaoVencida
  const listCandidatas = deps.listCandidatas ?? listConversasCandidatasFollowup
  const buscarCanal = deps.getCanal ?? getCanal
  const agendarAcao = deps.agendarAcao ?? agendarProximaAcao
  const cancelarAcao = deps.cancelarAcao ?? cancelarProximaAcao
  const agendarJob = deps.agendarJob ?? agendarJobConversa

  let agendados = 0
  let tocados = 0
  try {
    const agora = now()
    
    
    const cache = new Map<string, CanalRow | null>()
    const canalDe = async (id: string): Promise<CanalRow | null> => {
      if (!cache.has(id)) cache.set(id, await buscarCanal(id))
      return cache.get(id) ?? null
    }
    const decidir = async (c: ConversaExternaRow) => {
      const canal = await canalDe(c.canal_id)
      const cfg = configFollowup(canal?.config)
      
      const ligado = cfg.ligado && !!canal?.enabled
      return { d: decidirFollowup(estadoFollowup(c, canal, ligado), agora, { esperaMs: cfg.esperaMs }), agora }
    }

    for (const c of await listAcaoVencida(agora, TETO_TOQUES_POR_TIQUE)) {
      if (tocados >= TETO_TOQUES_POR_TIQUE) break
      try {
        const { d } = await decidir(c)
        if (d.acao === 'tocar') {
          const { jobId, novo } = await agendarJob(c.id, agora)
          if (novo) fire(jobId)
          tocados++
        } else if (d.acao === 'cancelar') {
          await cancelarAcao(c.id)
        }
      } catch (e) { console.warn('[canais/heartbeat] follow-up vencido fail-open:', e) }
    }

    const desde = new Date(Date.parse(agora) - CANDIDATAS_MS).toISOString()
    for (const c of await listCandidatas(desde)) {
      try {
        const { d } = await decidir(c)
        if (d.acao === 'agendar') {
          await agendarAcao(c.id, ACAO_FOLLOWUP, d.em)
          agendados++
        }
      } catch (e) { console.warn('[canais/heartbeat] follow-up candidata fail-open:', e) }
    }
  } catch (e) { console.warn('[canais/heartbeat] follow-up fail-open:', e) }
  return { agendados, tocados }
}
