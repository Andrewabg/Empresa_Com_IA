


import {
  listLatestSnapshots as listLatestDefault, listDailySnapshots as listDailyDefault,
  listOperadoresComTrafego as listOpsDefault,
} from '@/data/trafego'
import { notificar as notificarDefault } from './notificar'
import { computarBaseline, type DiaSerie } from '@/lib/trafego/baseline'
import { lerPersonalidade } from '@/lib/trafego/leituraConta'
import { detectarAlertas, precisaSync, alertasSaude, alertasEntrega, alertasOrcamento, type OrcamentoCampanha } from '@/lib/trafego/vigilancia'
import { avaliarSaudeConta } from '@/lib/trafego/saudeConta'
import { avaliarEntrega } from '@/lib/trafego/entregaParada'
import {
  lerSaudeConta as lerSaudeContaDefault,
  lerAdsReprovados as lerAdsReprovadosDefault,
  lerHoras as lerHorasDefault,
  lerCampaignsEntity as lerCampaignsEntityDefault,
} from '@/server/tools/trafego/buscarMetricas'
import { runAction as runActionDefault } from '@/server/actions/actions'
import { sincronizarHistorico as sincronizarHistoricoDefault } from '@/server/tools/trafego/sincronizarHistorico'
import { getSetting as getSettingDefault, setSetting as setSettingDefault } from '@/data/settings'
import { getAccountMemory as getAccountMemoryDefault } from '@/data/accountMemory'
import { frameDeArquetipo } from '@/lib/trafego/perfilConta'
import { createLimiter, type Limiter } from '@/lib/concurrency'
import { throttleAtivo, THROTTLE_SETTING_KEY } from '@/lib/trafego/graph/throttle'
import type { MetricShape } from '@/lib/trafego/types'

const JANELA_DIAS = 30

const JANELA_OPERADORES_DIAS = 30

const SYNC_INTERVALO_HORAS = Number(process.env.TRAFEGO_SYNC_INTERVALO_HORAS) || 6

const AGENT_TRAFEGO = 'gestor-trafego'

function shiftISO(iso: string, delta: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}
function dowDe(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCDay()
}

export interface VigilanciaDeps {
  listOperadores?: (desdeISO: string) => Promise<string[]>
  listLatest?: typeof listLatestDefault
  listDaily?: typeof listDailyDefault
  notificar?: typeof notificarDefault
  now?: () => string
  sincronizarHistorico?: typeof sincronizarHistoricoDefault
  getSetting?: typeof getSettingDefault
  setSetting?: typeof setSettingDefault
  getAccountMemory?: typeof getAccountMemoryDefault
  criarLimiter?: (n: number) => Limiter
  lerSaudeConta?: typeof lerSaudeContaDefault
  lerAdsReprovados?: typeof lerAdsReprovadosDefault
  lerHoras?: typeof lerHorasDefault
  lerCampaignsEntity?: typeof lerCampaignsEntityDefault
  runAction?: typeof runActionDefault
}
export interface VigilanciaResult { operadores: number; alertados: number; sincronizados: number }

export async function runVigilanciaTrafego(deps: VigilanciaDeps = {}): Promise<VigilanciaResult> {
  const listOperadores = deps.listOperadores ?? listOpsDefault
  const listLatest = deps.listLatest ?? listLatestDefault
  const listDaily = deps.listDaily ?? listDailyDefault
  const notificar = deps.notificar ?? notificarDefault
  const now = deps.now ?? (() => new Date().toISOString())
  const sincronizarHistorico = deps.sincronizarHistorico ?? sincronizarHistoricoDefault
  const getSetting = deps.getSetting ?? getSettingDefault
  const setSetting = deps.setSetting ?? setSettingDefault
  const getAccountMemory = deps.getAccountMemory ?? getAccountMemoryDefault
  const criarLimiter = deps.criarLimiter ?? createLimiter
  const lerSaudeConta = deps.lerSaudeConta ?? lerSaudeContaDefault
  const lerAdsReprovados = deps.lerAdsReprovados ?? lerAdsReprovadosDefault
  const lerHoras = deps.lerHoras ?? lerHorasDefault
  const lerCampaignsEntity = deps.lerCampaignsEntity ?? lerCampaignsEntityDefault
  const runAction = deps.runAction ?? runActionDefault
  const hoje = now().slice(0, 10)

  let ops: string[] = []
  try {
    
    
    ops = await listOperadores(shiftISO(hoje, -JANELA_OPERADORES_DIAS))
  } catch (e) {
    console.warn('[vigilancia] listOperadores fail-open:', e)
    return { operadores: 0, alertados: 0, sincronizados: 0 }
  }

  
  const limiter = criarLimiter(8)

  let alertados = 0
  let sincronizados = 0
  for (const op of ops) {
    try {
      const latest = await listLatest(op, 'account', 1)
      const primeiro = latest[0]
      if (!primeiro) continue
      const accountId = primeiro.entity_id
      const contaNome = primeiro.entity_name ?? accountId

      
      
      const marcador = await getSetting('trafego_sync_at:' + op).catch(() => null)
      
      
      
      
      
      const deveSincronizar = precisaSync(marcador, now(), SYNC_INTERVALO_HORAS)
        && !throttleAtivo(await getSetting(THROTTLE_SETTING_KEY).catch(() => null), now()).ativo
      if (deveSincronizar) {
        const mem = await getAccountMemory(op, accountId).catch(() => null)
        const arq = mem?.perfil?.perfilConta?.arquetipo
        const conversaoTypes = arq ? frameDeArquetipo(arq).conversaoTypes : undefined
        await sincronizarHistorico(
          'account', null,
          { operatorId: op, actingAgentId: AGENT_TRAFEGO, hojeISO: hoje, objectId: accountId, conversaoTypes },
          { limiter },
        )
        
        
        await setSetting('trafego_sync_at:' + op, now())
        sincronizados++
      }

      
      const rows = await listDaily(op, 'account', shiftISO(hoje, -JANELA_DIAS), hoje, accountId)
      const serie: DiaSerie[] = rows.map((s) => ({ date: s.period_start, m: s.metrics as MetricShape }))
      if (serie.length < 2) continue
      const ultimo = serie[serie.length - 1]
      const atual = ultimo.m
      const ontem = serie[serie.length - 2]?.m
      const dowHoje = dowDe(ultimo.date)
      const baseline = computarBaseline(serie.slice(0, -1))
      const leitura = lerPersonalidade(baseline)
      const alertas = detectarAlertas({ contaNome, atual, baseline, ontem, leitura, dowHoje })
      for (const a of alertas) {
        const r = await notificar({
          tipo: 'anomalia_trafego', urgencia: 'imediata',
          titulo: `Alerta de tráfego (${contaNome})`, corpo: a.texto,
          payload: { account_id: accountId, alerta: a.tipo, dano_evitado: a.danoEvitado ?? null },
          dedupKey: `trafego:${op}:${accountId}:${a.tipo}:${hoje}`,
        })
        if (r.created) alertados++
      }

      
      
      
      
      const contaHealth = await lerSaudeConta(accountId).catch(() => ({}))
      const ads = await lerAdsReprovados(accountId).catch(() => [])
      const saude = avaliarSaudeConta({ contaHealth, ads })
      const alertasS = alertasSaude(saude, contaNome)
      for (const a of alertasS) {
        const r = await notificar({
          tipo: 'anomalia_trafego', urgencia: 'imediata',
          titulo: `Alerta de tráfego (${contaNome})`, corpo: a.texto,
          payload: { account_id: accountId, alerta: a.tipo, dano_evitado: a.danoEvitado ?? null },
          dedupKey: `trafego:${op}:${accountId}:${a.tipo}:${hoje}`,
        })
        if (r.created) alertados++
      }

      
      
      
      
      
      const horas = await lerHoras(accountId, runAction, AGENT_TRAFEGO).catch(() => [])
      
      
      const agoraBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      const veredito = avaliarEntrega({ horas, horaAtual: agoraBRT.getHours(), minutoAtual: agoraBRT.getMinutes() })
      const alertasEnt = alertasEntrega(veredito, contaNome)
      for (const a of alertasEnt) {
        const r = await notificar({
          tipo: 'anomalia_trafego', urgencia: 'imediata',
          titulo: `Alerta de tráfego (${contaNome})`, corpo: a.texto,
          payload: { account_id: accountId, alerta: a.tipo, dano_evitado: a.danoEvitado ?? null },
          dedupKey: `trafego:${op}:${accountId}:${a.tipo}:${hoje}`,
        })
        if (r.created) alertados++
      }

      
      
      
      
      
      
      const campanhas = await lerCampaignsEntity(accountId).catch(() => ({}))
      const orcamentos: OrcamentoCampanha[] = Object.entries(campanhas).map(([id, c]) => ({
        nome: c.nome ?? id,
        ...(c.budgetRemaining !== undefined ? { restante: c.budgetRemaining } : {}),
        ...(c.dailyBudget !== undefined ? { diario: c.dailyBudget } : {}),
      }))
      for (const a of alertasOrcamento(orcamentos, contaNome, agoraBRT.getHours())) {
        const r = await notificar({
          tipo: 'anomalia_trafego', urgencia: 'imediata',
          titulo: `Alerta de tráfego (${contaNome})`, corpo: a.texto,
          payload: { account_id: accountId, alerta: a.tipo, dano_evitado: a.danoEvitado ?? null },
          dedupKey: `trafego:${op}:${accountId}:${a.tipo}:${hoje}`,
        })
        if (r.created) alertados++
      }

    } catch (e) {
      console.warn(`[vigilancia] operador ${op} fail-open:`, e)
    }
  }
  return { operadores: ops.length, alertados, sincronizados }
}
