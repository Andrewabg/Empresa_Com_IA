
import type { FerramentaStatus } from '@/lib/hiring/brief'

export const STATUS_LABEL: Record<FerramentaStatus, string> = {
  sugerido: 'sugerida pelo RH',
  aguardando_conexao: 'aguardando conexão',
  conectada: 'conectada',
  pendente: 'fica pra depois',
  indisponivel: 'sem integração pronta',
  dispensado: 'dispensada',
}


export function getStatusLabel(status: string): string {
  const label = (STATUS_LABEL as Record<string, string>)[status]
  if (label === undefined) {
    console.warn('[statusLabels] status inesperado:', status)
    return '—'
  }
  return label
}
