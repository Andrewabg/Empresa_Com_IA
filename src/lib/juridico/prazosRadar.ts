
import type { PrazoView } from '@/lib/juridico/prazosTipos'
export type Urgencia = 'vencido' | 'critico' | 'atencao' | 'ok'


export function diasRestantes(dataAlvoISO: string, hojeISO: string): number {
  const d = Date.parse(`${dataAlvoISO}T12:00:00Z`)
  const h = Date.parse(`${hojeISO}T12:00:00Z`)
  return Math.round((d - h) / 86_400_000)
}

export function classificarPrazo(prazo: PrazoView, hojeISO: string): { diasRestantes: number; urgencia: Urgencia } {
  const dias = diasRestantes(prazo.dataAlvo, hojeISO)
  const urgencia: Urgencia = dias < 0 ? 'vencido' : dias <= 3 ? 'critico' : dias <= prazo.janelaDias ? 'atencao' : 'ok'
  return { diasRestantes: dias, urgencia }
}


export function alertavel(prazo: PrazoView, hojeISO: string): boolean {
  return prazo.status === 'ativo' && diasRestantes(prazo.dataAlvo, hojeISO) <= prazo.janelaDias
}


export function ordenarRadar(prazos: PrazoView[], hojeISO: string): PrazoView[] {
  return [...prazos].sort((a, b) => {
    const da = diasRestantes(a.dataAlvo, hojeISO), db = diasRestantes(b.dataAlvo, hojeISO)
    if (da !== db) return da - db
    if (a.dataAlvo !== b.dataAlvo) return a.dataAlvo < b.dataAlvo ? -1 : 1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}
