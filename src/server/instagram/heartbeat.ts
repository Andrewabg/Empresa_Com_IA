


import {
  listClaimableIgJobs, listColdIgJobs, requeueJobIg, agendarJobIgSeAusente, finishJobIg,
} from '@/data/igJobs'
import {
  listAutomacoesVencidas, marcarExpirada as marcarExpiradaDefault,
  reclamarRunsOrfaos as reclamarOrfaosDefault, marcarDesfechoDoRun as marcarDesfechoDefault,
  devolverRetomadaDoRun as devolverRetomadaDefault, TETO_RETOMADAS_DO_RUN,
} from '@/data/igAutomacoes'
import { recordEvent as recordEventDefault } from '@/data/events'
import { TEXTOS_GATILHO_IG } from '@/lib/instagram/copyGatilho'
import { listCanais as listCanaisDefault, updateCanalConfig as updateCanalConfigDefault, type CanalRow } from '@/data/canais'
import { instagramSpec } from '@/server/canais/registry'
import { consultarInscricaoInstagram } from './conexao'
import {
  avaliarConexao, estadoMedidoAnterior, pioraNaBorda, TTL_CONEXAO_MS,
} from '@/lib/instagram/saudeDoToken'
import { notificarConexaoInstagram } from '@/server/proativo/producers'
import { runIgJob } from './runtime'


export const FRIO_MS = 5 * 60_000


export const TETO_FILA_POR_TIQUE = 30
export const TETO_FRIOS_POR_TIQUE = 10
export const TETO_ORFAOS_POR_TIQUE = 10


export const RUN_ORFAO_MS = 30 * 60_000


export const TETO_ESFRIAMENTOS = 5


export const RUN_ABANDONO_MS = 6 * 60 * 60_000

export interface InstagramHeartbeatDeps {
  listClaimable?: typeof listClaimableIgJobs
  listCold?: typeof listColdIgJobs
  requeue?: typeof requeueJobIg
  listVencidas?: typeof listAutomacoesVencidas
  marcarExpirada?: typeof marcarExpiradaDefault
  reclamarOrfaos?: typeof reclamarOrfaosDefault
  agendarJob?: typeof agendarJobIgSeAusente
  marcarDesfecho?: typeof marcarDesfechoDefault
  devolverRetomada?: typeof devolverRetomadaDefault
  
  finish?: typeof finishJobIg
  
  registrarEvento?: typeof recordEventDefault
  fire?: (jobId: string) => void
  now?: () => string
  
  listCanais?: typeof listCanaisDefault
  resolverCredsIg?: (canal: CanalRow) => Promise<{ accessToken: string; igUserId: string }>
  consultarInscricao?: typeof consultarInscricaoInstagram
  salvarConfig?: typeof updateCanalConfigDefault
  notificarConexao?: (i: { rotulo: string; canalId: string; estado: 'caiu' | 'credencial' }) => void
}

export interface InstagramHeartbeatResult {
  disparados: number
  revividos: number
  
  retomados: number
  
  desistidos: number
  
  aposentados: number
  
  expiradas: number
  
  conexao: number
}

export async function runInstagramHeartbeat(
  deps: InstagramHeartbeatDeps = {},
): Promise<InstagramHeartbeatResult> {
  const listClaimable = deps.listClaimable ?? listClaimableIgJobs
  const listCold = deps.listCold ?? listColdIgJobs
  const requeue = deps.requeue ?? requeueJobIg
  const listVencidas = deps.listVencidas ?? listAutomacoesVencidas
  const marcarExpirada = deps.marcarExpirada ?? marcarExpiradaDefault
  const reclamarOrfaos = deps.reclamarOrfaos ?? reclamarOrfaosDefault
  const agendarJob = deps.agendarJob ?? agendarJobIgSeAusente
  const marcarDesfecho = deps.marcarDesfecho ?? marcarDesfechoDefault
  const devolverRetomada = deps.devolverRetomada ?? devolverRetomadaDefault
  const finish = deps.finish ?? finishJobIg
  const registrarEvento = deps.registrarEvento ?? recordEventDefault
  const fire = deps.fire ?? ((id: string) => { void runIgJob(id) })
  const now = deps.now ?? (() => new Date().toISOString())

  let disparados = 0
  let revividos = 0
  let retomados = 0
  let desistidos = 0
  let aposentados = 0
  let expiradas = 0

  
  
  
  
  
  
  
  
  let daFila: Awaited<ReturnType<typeof listClaimable>> = []
  try { daFila = await listClaimable(now(), TETO_FILA_POR_TIQUE) }
  catch (e) { console.warn('[instagram/heartbeat] foto da fila fail-open:', e) }

  
  try {
    const corte = new Date(Date.parse(now()) - FRIO_MS).toISOString()
    for (const j of await listCold(corte, TETO_FRIOS_POR_TIQUE)) {
      if (revividos + aposentados >= TETO_FRIOS_POR_TIQUE) break
      try {
        
        
        
        
        
        
        
        
        
        const esfriou = (j.esfriamentos ?? 0) + 1
        if (esfriou > TETO_ESFRIAMENTOS) {
          await finish(j.id, 'dead', 'ficou frio mais vezes do que o permitido')
          await marcarDesfecho(j.run_id, {
            status: 'falhou', erro_mensagem: TEXTOS_GATILHO_IG.desistiu, concluido_em: now(),
          })
          await rastro(j.run_id, TEXTOS_GATILHO_IG.desistiu)
          aposentados++
          continue
        }
        
        
        await requeue(j.id, j.attempts, 'recuperado pelo heartbeat', now(), undefined, esfriou)
        fire(j.id); revividos++
      } catch (e) { console.warn('[instagram/heartbeat] job frio fail-open:', j.id, e) }
    }
  } catch (e) { console.warn('[instagram/heartbeat] frios fail-open:', e) }

  
  
  
  
  
  
  
  try {
    const corte = new Date(Date.parse(now()) - RUN_ORFAO_MS).toISOString()
    const corteAbandono = Date.parse(now()) - RUN_ABANDONO_MS
    for (const run of await reclamarOrfaos(corte, TETO_ORFAOS_POR_TIQUE)) {
      if (retomados + desistidos >= TETO_ORFAOS_POR_TIQUE) break
      try {
        const velhoDemais = Date.parse(run.created_at) < corteAbandono
        
        
        
        
        if (run.recuperacoes > TETO_RETOMADAS_DO_RUN && velhoDemais) {
          
          
          
          
          
          await marcarDesfecho(run.id, {
            status: 'falhou', erro_mensagem: TEXTOS_GATILHO_IG.naoRetomou, concluido_em: now(),
          })
          await rastro(run.id, TEXTOS_GATILHO_IG.naoRetomou)
          desistidos++
          continue
        }
        
        
        
        
        const jobId = await agendarJob(run.id, run.ultimo_passo_entregue ?? 0, now())
        
        
        
        
        
        if (!jobId) { await devolver(run.id); continue }
        fire(jobId); retomados++
      } catch (e) {
        console.warn('[instagram/heartbeat] retomada fail-open:', run.id, e)
      }
    }
  } catch (e) { console.warn('[instagram/heartbeat] disparos sem fila fail-open:', e) }

  
  for (const j of daFila) {
    if (disparados >= TETO_FILA_POR_TIQUE) break
    fire(j.id); disparados++
  }

  try {
    for (const a of await listVencidas(now())) {
      try { await marcarExpirada(a.id); expiradas++ }
      catch (e) { console.warn('[instagram/heartbeat] expirar fail-open:', a.id, e) }
    }
  } catch (e) { console.warn('[instagram/heartbeat] vencidas fail-open:', e) }

  const conexao = await braçoConexao(deps, now)

  return { disparados, revividos, retomados, desistidos, aposentados, expiradas, conexao }

  
  async function devolver(runId: string): Promise<void> {
    try { await devolverRetomada(runId) }
    catch (e) { console.warn('[instagram/heartbeat] devolver a retomada falhou (fail-open):', runId, e) }
  }

  
  async function rastro(runId: string, motivo: string): Promise<void> {
    try {
      await registrarEvento({
        id: `ig_run_morto:run:${runId}`,
        type: 'action',
        label: `${TEXTOS_GATILHO_IG.eventoRunMorto} ${motivo}`,
      })
    } catch (e) { console.warn('[instagram/heartbeat] rastro do desfecho falhou (fail-open):', runId, e) }
  }
}


function lerLidaEm(config: unknown): string | null {
  const v = (config as { ig_conexao_lida_em?: unknown } | null)?.ig_conexao_lida_em
  return typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null
}


function precisaConsultarConexao(lidaEm: string | null, agoraIso: string, ttlMs = TTL_CONEXAO_MS): boolean {
  if (!lidaEm) return true
  const agora = Date.parse(agoraIso)
  const em = Date.parse(lidaEm)
  if (!Number.isFinite(agora) || !Number.isFinite(em)) return true
  
  
  return agora - em >= ttlMs || em > agora
}


async function braçoConexao(deps: InstagramHeartbeatDeps, now: () => string): Promise<number> {
  const listar = deps.listCanais ?? listCanaisDefault
  const resolverCreds = deps.resolverCredsIg ?? ((canal: CanalRow) => instagramSpec.resolverCreds(canal))
  const consultarInscricao = deps.consultarInscricao ?? consultarInscricaoInstagram
  const salvar = deps.salvarConfig ?? updateCanalConfigDefault
  const avisar = deps.notificarConexao ?? ((i: { rotulo: string; canalId: string; estado: 'caiu' | 'credencial' }) => { void notificarConexaoInstagram(i) })

  let lidos = 0
  try {
    const agora = now()
    for (const canal of await listar()) {
      try {
        if (canal.provider !== 'instagram' || !canal.enabled) continue
        const lidaEm = lerLidaEm(canal.config)
        if (!precisaConsultarConexao(lidaEm, agora)) continue
        const anterior = estadoMedidoAnterior(canal.config)
        const creds = await resolverCreds(canal)
        const leitura = await consultarInscricao({ igUserId: creds.igUserId, token: creds.accessToken })
        
        
        
        
        
        
        const novo = leitura === 'nao_sei' ? anterior : avaliarConexao({ leitura })
        await salvar(canal.id, {
          ig_conexao_lida_em: agora,
          ...(novo === null ? {} : { ig_conexao_estado: novo }),
        })
        lidos++
        if (novo !== null && pioraNaBorda(anterior, novo)) {
          avisar({ rotulo: canal.rotulo, canalId: canal.id, estado: novo })
        }
      } catch (e) { console.warn('[instagram/heartbeat] conexão do canal fail-open:', canal.id, e) }
    }
  } catch (e) { console.warn('[instagram/heartbeat] conexão fail-open:', e) }
  return lidos
}
