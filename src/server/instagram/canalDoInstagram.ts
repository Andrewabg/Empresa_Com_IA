



import { randomUUID } from 'node:crypto'
import {
  listCanais, createCanal, updateCanal, deleteCanal, updateCanalConfig, type CanalRow,
} from '@/data/canais'
import { listAgentsSummary } from '@/data/agents'
import { contarAutomacoesDoCanal, reatribuirAutomacoesDoCanal } from '@/data/igAutomacoes'
import { recordEvent } from '@/data/events'
import { agenteDonoDaFlag } from '@/lib/cockpit'
import { TEXTOS_CONEXAO_IG } from '@/lib/instagram/copyConexao'
import {
  avaliarConexao, estadoMedidoAnterior, pioraNaBorda, TTL_CONEXAO_MS,
  type LeituraDaInscricao,
} from '@/lib/instagram/saudeDoToken'
import { notificarConexaoInstagram } from '@/server/proativo/producers'


const ASSISTENTE_DE_FABRICA = 'jarvis'

export async function getCanalDoInstagram(): Promise<CanalRow | null> {
  return (await listarCanaisDoInstagram())[0] ?? null
}


async function listarCanaisDoInstagram(): Promise<CanalRow[]> {
  return (await listCanais()).filter((c) => c.provider === 'instagram')
}


export async function agenteDoInstagram(canal: CanalRow | null): Promise<string> {
  const gravado = canal?.agent_id || ASSISTENTE_DE_FABRICA
  let dono: string
  try {
    dono = agenteDonoDaFlag(await listAgentsSummary(), ['painelInstagram'], gravado)
  } catch (e) {
    console.warn('[instagram] não deu para resolver o agente do canal (fail-open):', e)
    return gravado
  }
  if (canal && canal.agent_id !== dono) {
    
    
    
    
    
    let automacoesEmDia = true
    await reatribuirAutomacoesDoCanal(canal.id, dono).catch((e: unknown) => {
      automacoesEmDia = false
      console.warn('[instagram] não deu para acertar o agente das automações (fail-open):', e)
    })
    if (automacoesEmDia) {
      await updateCanal(canal.id, { agent_id: dono }).catch((e: unknown) => {
        console.warn('[instagram] não deu para acertar o agente do canal (fail-open):', e)
      })
    }
  }
  return dono
}


async function temTrabalhoDentro(canalId: string): Promise<boolean> {
  try {
    return (await contarAutomacoesDoCanal(canalId)) > 0
  } catch (e) {
    console.warn('[instagram] não deu para contar as automações do canal (falha FECHADA):', e)
    return true
  }
}


export async function idOcupadoPorOutroCanal(igUserId: string): Promise<boolean> {
  const todos = await listCanais()
  const igs = todos.filter((c) => c.provider === 'instagram')
  const canonica = igs[0]
  
  if (!canonica || canonica.external_id === igUserId) return false
  const dono = todos.find((c) => c.external_id === igUserId && c.id !== canonica.id)
  if (!dono) return false
  if (dono.provider !== 'instagram') return true
  return temTrabalhoDentro(dono.id)
}

export interface CanalGarantido {
  canal: CanalRow
  
  trocouDeConta: boolean
}


export async function garantirCanalDoInstagram(igUserId: string): Promise<CanalGarantido> {
  const canais = await listarCanaisDoInstagram()
  const canal = canais[0] ?? null
  const agentId = await agenteDoInstagram(canal)

  if (!canal) {
    const novo = await createCanal({
      tipo: 'instagram',
      external_id: igUserId,
      rotulo: 'Instagram',
      agent_id: agentId,
      provider: 'instagram',
      config: {},
    })
    return { canal: novo, trocouDeConta: false }
  }

  if (canal.external_id === igUserId) {
    return { canal: { ...canal, agent_id: agentId }, trocouDeConta: false }
  }

  
  
  
  
  for (const extra of canais.slice(1)) {
    if (await temTrabalhoDentro(extra.id)) continue
    await deleteCanal(extra.id)
  }

  
  
  
  
  
  
  await updateCanalConfig(canal.id, { ig_conexao_estado: null, ig_conexao_lida_em: null })
  await updateCanal(canal.id, { external_id: igUserId })

  
  await recordEvent({
    id: randomUUID(),
    type: 'action',
    label: TEXTOS_CONEXAO_IG.eventoTrocaDeConta,
    agent: agentId,
  }).catch((e: unknown) => {
    console.warn('[instagram] não deu para registrar a troca de conta (fail-open):', e)
  })

  
  
  
  
  return { canal: { ...canal, external_id: igUserId, agent_id: agentId, config: {} }, trocouDeConta: true }
}


export async function registrarLeituraDaConexao(
  canal: CanalRow | null,
  leitura: LeituraDaInscricao,
  agoraIso: string,
  deps: { salvar?: typeof updateCanalConfig; avisar?: typeof notificarConexaoInstagram } = {},
): Promise<void> {
  if (!canal || leitura === 'nao_sei') return
  try {
    const anterior = estadoMedidoAnterior(canal.config)
    const novo = avaliarConexao({ leitura })
    if (anterior === novo && !carimboVencido(canal.config, agoraIso)) return
    await (deps.salvar ?? updateCanalConfig)(canal.id, {
      ig_conexao_estado: novo, ig_conexao_lida_em: agoraIso,
    })
    if (!pioraNaBorda(anterior, novo)) return
    await (deps.avisar ?? notificarConexaoInstagram)({
      rotulo: canal.rotulo, canalId: canal.id, estado: novo,
    })
  } catch (e) {
    console.warn('[instagram] nao deu para guardar a leitura da conexao (fail-open):', e)
  }
}


function carimboVencido(config: unknown, agoraIso: string): boolean {
  const v = (config as { ig_conexao_lida_em?: unknown } | null)?.ig_conexao_lida_em
  if (typeof v !== 'string') return true
  const em = Date.parse(v)
  const agora = Date.parse(agoraIso)
  if (!Number.isFinite(em) || !Number.isFinite(agora)) return true
  return agora - em >= TTL_CONEXAO_MS || em > agora
}

