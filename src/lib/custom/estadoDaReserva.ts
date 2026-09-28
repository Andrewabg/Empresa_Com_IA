



export interface LinhaDeReserva {
  status: 'reservado' | 'enviado' | 'falhou'
  external_id: string | null
  erro: string | null
  created_at: string
}


export type EstadoDaReserva = 'entregue' | 'falhou' | 'em_andamento' | 'presa' | 'desconhecido'


export const IDADE_RESERVA_PRESA_MS = 15 * 60 * 1000


export function classificarReserva(linha: LinhaDeReserva | null, agoraMs: number): EstadoDaReserva {
  if (!linha) return 'desconhecido'
  if (linha.external_id) return 'entregue'
  if (linha.status === 'enviado') return 'entregue'
  if (linha.status === 'falhou') return 'falhou'
  const nascida = Date.parse(linha.created_at)
  
  
  if (!Number.isFinite(nascida) || !Number.isFinite(agoraMs)) return 'desconhecido'
  
  
  
  
  
  if (nascida > agoraMs) return 'desconhecido'
  return agoraMs - nascida >= IDADE_RESERVA_PRESA_MS ? 'presa' : 'em_andamento'
}
