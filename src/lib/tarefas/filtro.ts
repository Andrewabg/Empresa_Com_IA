
import type { StatusTarefa } from './linhaDoTempo'
import { terminouSemResposta } from './desfecho'

export type FiltroDaLista = 'tudo' | 'falhas' | 'esperando'


export interface SinalDoObjetivo {
  falhou: boolean
  esperando: boolean
  
  semResposta: boolean
}


export function sinalDoObjetivo(
  raiz: StatusTarefa,
  descendentes: StatusTarefa[],
  resultadoDaRaiz?: string | null,
): SinalDoObjetivo {
  const todos = [raiz, ...descendentes]
  return {
    falhou: todos.includes('failed'),
    esperando: todos.includes('needs_approval'),
    semResposta: terminouSemResposta(raiz, resultadoDaRaiz ?? undefined),
  }
}


export function sinaisPorObjetivo(
  objetivos: Array<{ id: string; status: StatusTarefa; result?: string | null }>,
  filhos: Array<{ parent_task_id: string; status: StatusTarefa }>,
): Record<string, SinalDoObjetivo> {
  const porPai = new Map<string, StatusTarefa[]>()
  for (const f of filhos) {
    const atual = porPai.get(f.parent_task_id)
    if (atual) atual.push(f.status)
    else porPai.set(f.parent_task_id, [f.status])
  }
  const out: Record<string, SinalDoObjetivo> = {}
  for (const o of objetivos) out[o.id] = sinalDoObjetivo(o.status, porPai.get(o.id) ?? [], o.result)
  return out
}


export function passaNoFiltro(sinal: SinalDoObjetivo, filtro: FiltroDaLista): boolean {
  
  
  if (filtro === 'falhas') return sinal.falhou || sinal.semResposta
  if (filtro === 'esperando') return sinal.esperando
  return true
}
