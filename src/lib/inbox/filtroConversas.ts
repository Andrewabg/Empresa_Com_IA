








import type { ConversaStatus } from '@/data/conversasExternas'


export const PAGINA_INBOX = 50

export type FiltroStatus = 'todas' | 'aguardando' | 'assumidas' | 'fechadas'

export const FILTROS_STATUS: ReadonlyArray<{ id: FiltroStatus; rotulo: string }> = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'aguardando', rotulo: 'Aguardando humano' },
  { id: 'assumidas', rotulo: 'Assumidas' },
  { id: 'fechadas', rotulo: 'Fechadas' },
]


export function statusDoFiltro(filtro: FiltroStatus): ConversaStatus[] | null {
  if (filtro === 'aguardando') return ['aguardando_humano']
  if (filtro === 'assumidas') return ['assumida']
  if (filtro === 'fechadas') return ['fechada']
  return null
}


export function passaFiltroStatus(status: ConversaStatus, filtro: FiltroStatus): boolean {
  const alvos = statusDoFiltro(filtro)
  return alvos === null || alvos.includes(status)
}


export function lerFiltroStatus(raw: unknown): FiltroStatus {
  return FILTROS_STATUS.some((f) => f.id === raw) ? (raw as FiltroStatus) : 'todas'
}


export const LIMITE_MAX_INBOX = 500


export function limiteAceito(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN
  if (!Number.isFinite(n) || n <= 0) return PAGINA_INBOX
  return Math.min(Math.floor(n), LIMITE_MAX_INBOX)
}








export const BUSCA_MAX = 60

export interface TermoDeBusca {
  
  texto: string
  
  digitos: string
}


export function termoDeBusca(cru: unknown): TermoDeBusca | null {
  if (typeof cru !== 'string') return null
  const bruto = cru.trim().slice(0, BUSCA_MAX)
  if (!bruto) return null
  
  
  
  const texto = bruto.replace(/[,()."*\\%]/g, ' ').replace(/\s+/g, ' ').trim()
  const digitos = bruto.replace(/\D/g, '')
  if (!texto && !digitos) return null
  return { texto, digitos }
}
