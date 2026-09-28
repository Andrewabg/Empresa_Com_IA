
import { ehRoteiro, getFormato } from '@/lib/estudio/formatos'
import type { PlanoItem, PlanoItemStatus, CampanhaStatus } from '@/lib/estudio/types'

const TERMINAIS: PlanoItemStatus[] = ['pronta', 'falhou']


export function normalizarPlanoItem(raw: {
  formato?: unknown; canal?: unknown; angulo?: unknown; justificativa?: unknown
}): PlanoItem {
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return {
    formato: s(raw.formato) || 'generico',
    canal: s(raw.canal),
    angulo: s(raw.angulo),
    justificativa: s(raw.justificativa),
    status: 'pendente',
  }
}


export function itensParaArte(plano: PlanoItem[]): number[] {
  const out: number[] = []
  plano.forEach((it, i) => {
    if (it.status !== 'pronta' || !it.peca_id) return
    if (it.arte_status === 'produzindo' || it.arte_status === 'pronta') return
    if (ehRoteiro(getFormato(it.formato))) return
    out.push(i)
  })
  return out
}


export function proximoStatusCampanha(plano: PlanoItem[]): CampanhaStatus {
  if (!plano.length) return 'planejada'
  const todosTerminais = plano.every((it) => TERMINAIS.includes(it.status))
  return todosTerminais ? 'concluida' : 'em_producao'
}


export function algumTrabalhoEmVoo(
  campanhas: { status: CampanhaStatus; plano?: PlanoItem[] }[],
): boolean {
  return campanhas.some((c) =>
    c.status === 'em_producao' ||
    (c.plano ?? []).some((it) => it.arte_status === 'produzindo'),
  )
}
