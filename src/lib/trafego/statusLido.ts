
























import type { TipoAcaoMeta } from '@/lib/trafego/guardrails'

export type StatusDaEntidade = 'ACTIVE' | 'PAUSED'


const EXIGEM_STATUS: ReadonlySet<TipoAcaoMeta> = new Set(['pausar', 'reativar'])

export interface LeituraDeStatus {
  
  status?: StatusDaEntidade
  
  falta: boolean
}

export function statusLido(
  tipo: TipoAcaoMeta,
  statusAtual: StatusDaEntidade | undefined,
  podeLerStatus: boolean,
): LeituraDeStatus {
  if (!podeLerStatus) return { falta: false }
  if (statusAtual) return { status: statusAtual, falta: false }
  return { falta: EXIGEM_STATUS.has(tipo) }
}
