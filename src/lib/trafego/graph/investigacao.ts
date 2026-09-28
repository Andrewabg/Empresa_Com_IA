
import type { FrameConta } from '@/lib/trafego/perfilConta'
import type { Ledger } from './ledger'
export interface ContextoCarregado { texto: string; frame: FrameConta }
export interface Investigacao {
  chamadasHttp: number
  
  calculos?: number
  
  ledger: Ledger
  avisouChamadas: boolean
  contextoEntregue: boolean
  
  contextoDegradadoEntregue?: boolean
  
  contaId?: Promise<string | null>
  connectedAccountId?: Promise<string | null>
  contexto?: Promise<ContextoCarregado>
  
  throttleAte?: string
}
