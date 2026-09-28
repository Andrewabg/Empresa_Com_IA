
import { getBrain as getBrainDefault, NotConfiguredError, type Brain } from './runtime'
import { withCloneLock } from './cloneLock'
import { getSetting as getSettingDefault, setSetting as setSettingDefault } from '@/data/settings'
import { motivoSeguro } from '@/lib/sanitizarErro'

export const CHAVE_PEDIDO = 'brain_reindex_pedido_em'
export const CHAVE_CONCLUIDO = 'brain_reindex_concluido_em'
export const CHAVE_ERRO = 'brain_reindex_erro'

export type StatusReindex = 'ocioso' | 'pendente' | 'concluido' | 'falhou'

export interface EstadoReindex {
  status: StatusReindex
  
  quando?: string
  
  erro?: string
}


export function estadoReindex(marcas: {
  pedidoEm?: string | null
  concluidoEm?: string | null
  erro?: string | null
}): EstadoReindex {
  const { pedidoEm, concluidoEm, erro } = marcas
  if (pedidoEm && (!concluidoEm || concluidoEm < pedidoEm)) return { status: 'pendente', quando: pedidoEm }
  if (erro) return { status: 'falhou', erro }
  if (concluidoEm) return { status: 'concluido', quando: concluidoEm }
  return { status: 'ocioso' }
}

export interface ReindexDeps {
  getBrain?: () => Promise<Brain>
  getSetting?: (k: string) => Promise<string | null>
  setSetting?: (k: string, v: string) => Promise<void>
  
  syncFull?: (b: Brain) => Promise<void>
  now?: () => string
}


export async function lerEstadoReindex(deps: ReindexDeps = {}): Promise<EstadoReindex> {
  const getSetting = deps.getSetting ?? getSettingDefault
  try {
    const [pedidoEm, concluidoEm, erro] = await Promise.all([
      getSetting(CHAVE_PEDIDO), getSetting(CHAVE_CONCLUIDO), getSetting(CHAVE_ERRO),
    ])
    return estadoReindex({ pedidoEm, concluidoEm, erro })
  } catch (e) {
    console.warn('[reindex] leitura do estado fail-open:', motivoSeguro(e))
    return { status: 'ocioso' }
  }
}


export async function pedirReindex(deps: ReindexDeps = {}): Promise<EstadoReindex> {
  const setSetting = deps.setSetting ?? setSettingDefault
  const agora = (deps.now ?? (() => new Date().toISOString()))()
  await setSetting(CHAVE_PEDIDO, agora)
  await setSetting(CHAVE_ERRO, '')
  return { status: 'pendente', quando: agora }
}

export type ReindexHeartbeatResult =
  | { status: 'skipped' }              
  | { status: 'ok'; quando: string }   
  | { status: 'failed'; error: string }


export async function runReindexHeartbeat(deps: ReindexDeps = {}): Promise<ReindexHeartbeatResult> {
  const getSetting = deps.getSetting ?? getSettingDefault
  const setSetting = deps.setSetting ?? setSettingDefault
  const getBrain = deps.getBrain ?? getBrainDefault
  const syncFull = deps.syncFull ?? ((b: Brain) => b.sync.syncFull())
  const agora = deps.now ?? (() => new Date().toISOString())

  let pedidoEm: string | null = null
  try {
    pedidoEm = await getSetting(CHAVE_PEDIDO)
  } catch (e) {
    console.warn('[reindex] leitura do pedido fail-open:', motivoSeguro(e))
    return { status: 'skipped' }
  }
  if (!pedidoEm) return { status: 'skipped' }

  try {
    const b = await getBrain()
    await withCloneLock(() => syncFull(b))
    const fim = agora()
    await setSetting(CHAVE_CONCLUIDO, fim)
    await setSetting(CHAVE_PEDIDO, '')
    await setSetting(CHAVE_ERRO, '')
    return { status: 'ok', quando: fim }
  } catch (e) {
    
    
    const motivo = e instanceof NotConfiguredError
      ? 'O Cérebro ainda não está conectado ao GitHub.'
      : motivoSeguro(e)
    try {
      await setSetting(CHAVE_PEDIDO, '')
      await setSetting(CHAVE_ERRO, motivo)
    } catch (e2) {
      console.warn('[reindex] gravar a falha fail-open:', motivoSeguro(e2))
    }
    console.warn('[heartbeat] reindex do Cérebro fail-open:', motivo)
    return { status: 'failed', error: motivo }
  }
}
